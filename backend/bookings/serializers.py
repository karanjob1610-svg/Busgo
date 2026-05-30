from rest_framework import serializers
from django.contrib.auth.models import User
from django.db import transaction
from .models import City, Bus, Route, Schedule, Seat, Booking, Passenger, Payment
import uuid


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'password']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class CitySerializer(serializers.ModelSerializer):
    class Meta:
        model = City
        fields = '__all__'


class BusSerializer(serializers.ModelSerializer):
    bus_type_display = serializers.CharField(source='get_bus_type_display', read_only=True)

    class Meta:
        model = Bus
        fields = '__all__'


class RouteSerializer(serializers.ModelSerializer):
    source_detail = CitySerializer(source='source', read_only=True)
    destination_detail = CitySerializer(source='destination', read_only=True)

    class Meta:
        model = Route
        fields = '__all__'


class SeatSerializer(serializers.ModelSerializer):
    seat_type_display = serializers.CharField(source='get_seat_type_display', read_only=True)

    class Meta:
        model = Seat
        fields = '__all__'


class ScheduleSerializer(serializers.ModelSerializer):
    bus_detail = BusSerializer(source='bus', read_only=True)
    route_detail = RouteSerializer(source='route', read_only=True)
    seats = SeatSerializer(many=True, read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = '__all__'

    def get_duration(self, obj):
        delta = obj.arrival_time - obj.departure_time
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        return f"{hours}h {minutes}m"


class ScheduleListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing schedules (no nested seats)."""
    bus_name = serializers.CharField(source='bus.bus_name', read_only=True)
    bus_type = serializers.CharField(source='bus.bus_type', read_only=True)
    bus_type_display = serializers.CharField(source='bus.get_bus_type_display', read_only=True)
    bus_number = serializers.CharField(source='bus.bus_number', read_only=True)
    source = serializers.CharField(source='route.source.name', read_only=True)
    destination = serializers.CharField(source='route.destination.name', read_only=True)
    distance_km = serializers.FloatField(source='route.distance_km', read_only=True)
    duration = serializers.SerializerMethodField()

    class Meta:
        model = Schedule
        fields = [
            'id', 'bus_name', 'bus_type', 'bus_number',
            'bus_type_display',
            'source', 'destination', 'distance_km', 'duration',
            'departure_time', 'arrival_time', 'fare', 'available_seats', 'status',
        ]

    def get_duration(self, obj):
        delta = obj.arrival_time - obj.departure_time
        hours = delta.seconds // 3600
        minutes = (delta.seconds % 3600) // 60
        return f"{hours}h {minutes}m"


class PassengerSerializer(serializers.ModelSerializer):
    seat_number = serializers.CharField(
        source='seat.seat_number',
        read_only=True
    )

    class Meta:
        model = Passenger
        fields = ['name', 'age', 'gender', 'seat', 'seat_number', 'id_type', 'id_number']


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['booking']


class BookingSerializer(serializers.ModelSerializer):
    passengers = PassengerSerializer(many=True, read_only=True)
    payment = PaymentSerializer(read_only=True)
    schedule_detail = ScheduleListSerializer(source='schedule', read_only=True)
    passenger_details = serializers.SerializerMethodField()

    class Meta:
        model = Booking
        fields = '__all__'
        read_only_fields = ['user', 'booking_reference', 'booked_at']

    def get_passenger_details(self, obj):
        details = []
        seat_ids = [
            passenger.get('seat')
            for passenger in obj.passenger_details
            if isinstance(passenger, dict) and passenger.get('seat')
        ]
        seats = Seat.objects.in_bulk(seat_ids)

        for passenger in obj.passenger_details:
            if not isinstance(passenger, dict):
                details.append(passenger)
                continue
            passenger_detail = passenger.copy()
            seat = seats.get(passenger_detail.get('seat'))
            if seat:
                passenger_detail['seat_number'] = seat.seat_number
            details.append(passenger_detail)
        return details


class CreateBookingSerializer(serializers.Serializer):
    """Serializer for creating a booking with passengers and payment."""
    schedule_id = serializers.IntegerField()
    seat_ids = serializers.ListField(child=serializers.IntegerField(), min_length=1)
    passengers = serializers.ListField(child=serializers.DictField(), min_length=1)
    payment_method = serializers.ChoiceField(choices=['CARD', 'UPI', 'NETBANKING', 'WALLET', 'CASH'])

    def validate(self, data):
        if len(data['seat_ids']) != len(data['passengers']):
            raise serializers.ValidationError("Number of seats must match number of passengers.")
        try:
            schedule = Schedule.objects.get(id=data['schedule_id'], status='ACTIVE')
        except Schedule.DoesNotExist:
            raise serializers.ValidationError("Schedule not found or not active.")
        if schedule.available_seats < len(data['seat_ids']):
            raise serializers.ValidationError("Not enough available seats.")
        data['schedule'] = schedule
        return data

    def create(self, validated_data):
        from django.contrib.auth import get_user_model
        schedule = validated_data['schedule']
        seat_ids = validated_data['seat_ids']
        passengers_data = validated_data['passengers']
        user = self.context['request'].user

        seats_by_id = Seat.objects.filter(
            id__in=seat_ids,
            schedule=schedule,
            is_booked=False,
        ).in_bulk()
        if len(seats_by_id) != len(seat_ids):
            raise serializers.ValidationError("Some seats are already booked or invalid.")
        seats = [seats_by_id[seat_id] for seat_id in seat_ids]

        total_fare = sum(
            schedule.fare + seat.extra_charge for seat in seats
        )

        with transaction.atomic():
            ref = f"BT{uuid.uuid4().hex[:10].upper()}"
            booking = Booking.objects.create(
                user=user,
                schedule=schedule,
                booking_reference=ref,
                total_fare=total_fare,
                passenger_details=passengers_data,
                booking_status='CONFIRMED',
                payment_status='PAID',
            )

            for seat, passenger_data in zip(seats, passengers_data):
                passenger_data = passenger_data.copy()
                passenger_data.pop('seat', None)
                seat.is_booked = True
                seat.save()
                Passenger.objects.create(
                    booking=booking,
                    seat=seat,
                    **passenger_data
                )

            schedule.available_seats -= len(seat_ids)
            schedule.save()

            Payment.objects.create(
                booking=booking,
                amount=total_fare,
                method=validated_data['payment_method'],
                transaction_id=f"TXN{uuid.uuid4().hex[:16].upper()}",
            )

        return booking
