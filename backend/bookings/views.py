from rest_framework import generics, status, viewsets, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.db.models import Q
from django.utils import timezone

from .models import City, Bus, Route, Schedule, Seat, Booking, Passenger, Payment
from .serializers import (
    UserSerializer, CitySerializer, BusSerializer, RouteSerializer,
    ScheduleSerializer, ScheduleListSerializer, SeatSerializer,
    BookingSerializer, CreateBookingSerializer, PaymentSerializer
)


# ─────────────── Auth Views ───────────────

class RegisterView(generics.CreateAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': serializer.data,
            'access': str(refresh.access_token),
            'refresh': str(refresh),
        }, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        user = authenticate(username=username, password=password)
        if user:
            refresh = RefreshToken.for_user(user)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                }
            })
        return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


# ─────────────── City Views ───────────────

class CityListView(generics.ListAPIView):
    queryset = City.objects.all()
    serializer_class = CitySerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get('q')
        if q:
            qs = qs.filter(Q(name__icontains=q) | Q(code__icontains=q))
        return qs


# ─────────────── Schedule / Search Views ───────────────

class ScheduleSearchView(generics.ListAPIView):
    """
    GET /api/schedules/search/?from=<city_id>&to=<city_id>&date=<YYYY-MM-DD>&seats=<int>
    """
    serializer_class = ScheduleListSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        params = self.request.query_params
        from_id = params.get('from')
        to_id = params.get('to')
        date_str = params.get('date')
        min_seats = int(params.get('seats', 1))

        qs = Schedule.objects.filter(status='ACTIVE', available_seats__gte=min_seats)

        if from_id:
            qs = qs.filter(route__source_id=from_id)
        if to_id:
            qs = qs.filter(route__destination_id=to_id)
        if date_str:
            try:
                from datetime import datetime
                date = datetime.strptime(date_str, '%Y-%m-%d').date()
                print("Selected Date:", date)
                qs = qs.filter(departure_time__date=date)
                print("Schedules Found:", qs.count())
            except ValueError:
                pass

        bus_type = params.get('bus_type')
        if bus_type:
            qs = qs.filter(bus__bus_type=bus_type)

        max_fare = params.get('max_fare')
        if max_fare:
            qs = qs.filter(fare__lte=max_fare)

        sort_by = params.get('sort', 'departure_time')
        if sort_by in ['departure_time', 'fare', 'available_seats']:
            qs = qs.order_by(sort_by)

        return qs.select_related('bus', 'route__source', 'route__destination')


class ScheduleDetailView(generics.RetrieveAPIView):
    queryset = Schedule.objects.all()
    serializer_class = ScheduleSerializer
    permission_classes = [permissions.AllowAny]


class SeatLayoutView(generics.ListAPIView):
    """Returns seat layout for a specific schedule."""
    serializer_class = SeatSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        schedule_id = self.kwargs['schedule_id']
        return Seat.objects.filter(schedule_id=schedule_id).order_by('seat_number')


# ─────────────── Booking Views ───────────────

class BookingCreateView(generics.CreateAPIView):
    serializer_class = CreateBookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        booking = serializer.save()
        return Response(
            BookingSerializer(booking).data,
            status=status.HTTP_201_CREATED
        )


class UserBookingsView(generics.ListAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(
            user=self.request.user
        ).select_related('schedule__bus', 'schedule__route__source', 'schedule__route__destination')


class BookingDetailView(generics.RetrieveAPIView):
    serializer_class = BookingSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Booking.objects.filter(user=self.request.user)


class CancelBookingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            booking = Booking.objects.get(pk=pk, user=request.user)
        except Booking.DoesNotExist:
            return Response({'error': 'Booking not found'}, status=404)

        if booking.booking_status == 'CANCELLED':
            return Response({'error': 'Already cancelled'}, status=400)

        departure = booking.schedule.departure_time
        now = timezone.now()
        hours_left = (departure - now).total_seconds() / 3600

        if hours_left < 4:
            return Response(
                {'error': 'Cannot cancel less than 4 hours before departure'},
                status=400
            )

        # Release seats
       
        for passenger in booking.passengers.all():
            passenger.seat.is_booked = False
            passenger.seat.save()

        booking.schedule.available_seats += booking.passengers.count()
        booking.schedule.save()

        booking.booking_status = 'CANCELLED'
        if booking.payment_status == 'PAID':
            booking.payment_status = 'REFUNDED'
        booking.save()

        return Response({'message': 'Booking cancelled successfully', 'refund': 'Initiated'})
