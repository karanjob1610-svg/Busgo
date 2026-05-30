from django.contrib import admin
from .models import City, Bus, Route, Schedule, Seat, Booking, Passenger, Payment


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'state']
    search_fields = ['name', 'code']


@admin.register(Bus)
class BusAdmin(admin.ModelAdmin):
    list_display = ['bus_name', 'bus_number', 'bus_type', 'total_seats', 'is_active']
    list_filter = ['bus_type', 'is_active']


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ['source', 'destination', 'distance_km', 'duration_hours', 'base_fare']


@admin.register(Schedule)
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ['route', 'bus', 'departure_time', 'arrival_time', 'fare', 'available_seats', 'status']
    list_filter = ['status', 'departure_time']
    search_fields = ['bus__bus_name', 'route__source__name', 'route__destination__name']


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ['schedule', 'seat_number', 'seat_type', 'is_booked', 'extra_charge']
    list_filter = ['is_booked', 'seat_type']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_reference', 'user', 'schedule', 'total_fare', 'booking_status', 'payment_status', 'booked_at']
    list_filter = ['booking_status', 'payment_status']
    search_fields = ['booking_reference', 'user__username']
    readonly_fields = ['booking_reference', 'booked_at']


@admin.register(Passenger)
class PassengerAdmin(admin.ModelAdmin):
    list_display = ['name', 'age', 'gender', 'booking', 'seat']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['booking', 'amount', 'method', 'transaction_id', 'paid_at', 'is_successful']
    list_filter = ['method', 'is_successful']
    readonly_fields = ['paid_at']