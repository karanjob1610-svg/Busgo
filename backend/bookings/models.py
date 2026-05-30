from django.db import models
from django.contrib.auth.models import User


class City(models.Model):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    state = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.code})"

    class Meta:
        verbose_name_plural = "Cities"
        ordering = ['name']


class Bus(models.Model):
    BUS_TYPES = [
        ('SLEEPER', 'Sleeper'),
        ('SEATER', 'Seater'),
        ('AC_SLEEPER', 'AC Sleeper'),
        ('AC_SEATER', 'AC Seater'),
        ('VOLVO', 'Volvo'),
    ]
    bus_number = models.CharField(max_length=20, unique=True)
    bus_name = models.CharField(max_length=100)
    bus_type = models.CharField(max_length=20, choices=BUS_TYPES)
    total_seats = models.IntegerField(default=40)
    amenities = models.JSONField(default=list)  # e.g. ["WiFi","AC","USB Charging"]
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.bus_name} ({self.bus_number})"


class Route(models.Model):
    source = models.ForeignKey(City, on_delete=models.CASCADE, related_name='departures')
    destination = models.ForeignKey(City, on_delete=models.CASCADE, related_name='arrivals')
    distance_km = models.FloatField()
    duration_hours = models.FloatField()
    base_fare = models.DecimalField(max_digits=8, decimal_places=2)

    def __str__(self):
        return f"{self.source.name} → {self.destination.name}"

    class Meta:
        unique_together = ('source', 'destination')


class Schedule(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]
    bus = models.ForeignKey(Bus, on_delete=models.CASCADE, related_name='schedules')
    route = models.ForeignKey(Route, on_delete=models.CASCADE, related_name='schedules')
    departure_time = models.DateTimeField()
    arrival_time = models.DateTimeField()
    fare = models.DecimalField(max_digits=8, decimal_places=2)
    available_seats = models.IntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')

    def __str__(self):
        return f"{self.route} on {self.departure_time.strftime('%Y-%m-%d %H:%M')}"

    class Meta:
        ordering = ['departure_time']


class Seat(models.Model):
    SEAT_TYPES = [
        ('WINDOW', 'Window'),
        ('AISLE', 'Aisle'),
        ('MIDDLE', 'Middle'),
        ('LOWER', 'Lower Berth'),
        ('UPPER', 'Upper Berth'),
    ]
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='seats')
    seat_number = models.CharField(max_length=10)
    seat_type = models.CharField(max_length=10, choices=SEAT_TYPES)
    is_booked = models.BooleanField(default=False)
    extra_charge = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    def __str__(self):
        return f"Seat {self.seat_number} - {self.schedule}"

    class Meta:
        unique_together = ('schedule', 'seat_number')


class Booking(models.Model):
    BOOKING_STATUS = [
        ('CONFIRMED', 'Confirmed'),
        ('PENDING', 'Pending'),
        ('CANCELLED', 'Cancelled'),
    ]
    PAYMENT_STATUS = [
        ('PAID', 'Paid'),
        ('UNPAID', 'Unpaid'),
        ('REFUNDED', 'Refunded'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='bookings')
    schedule = models.ForeignKey(Schedule, on_delete=models.CASCADE, related_name='bookings')
    booking_reference = models.CharField(max_length=20, unique=True)
    booked_at = models.DateTimeField(auto_now_add=True)
    total_fare = models.DecimalField(max_digits=10, decimal_places=2)
    booking_status = models.CharField(max_length=20, choices=BOOKING_STATUS, default='CONFIRMED')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS, default='PAID')
    passenger_details = models.JSONField(default=list)
    # e.g. [{"name": "John", "age": 30, "gender": "M", "seat": "1A"}]

    def __str__(self):
        return f"Booking #{self.booking_reference} by {self.user.username}"

    class Meta:
        ordering = ['-booked_at']


class Passenger(models.Model):
    GENDER_CHOICES = [('M', 'Male'), ('F', 'Female'), ('O', 'Other')]

    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='passengers')
    name = models.CharField(max_length=100)
    age = models.IntegerField()
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    seat = models.ForeignKey(Seat, on_delete=models.CASCADE)
    id_type = models.CharField(max_length=20, default='AADHAAR')  # AADHAAR, PAN, PASSPORT etc.
    id_number = models.CharField(max_length=30, blank=True)

    def __str__(self):
        return f"{self.name} ({self.booking.booking_reference})"


class Payment(models.Model):
    PAYMENT_METHODS = [
        ('CARD', 'Credit/Debit Card'),
        ('UPI', 'UPI'),
        ('NETBANKING', 'Net Banking'),
        ('WALLET', 'Wallet'),
        ('CASH', 'Cash'),
    ]
    booking = models.OneToOneField(Booking, on_delete=models.CASCADE, related_name='payment')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=20, choices=PAYMENT_METHODS)
    transaction_id = models.CharField(max_length=100, unique=True)
    paid_at = models.DateTimeField(auto_now_add=True)
    is_successful = models.BooleanField(default=True)

    def __str__(self):
        return f"Payment ₹{self.amount} for {self.booking.booking_reference}"
