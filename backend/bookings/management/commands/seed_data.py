from datetime import timedelta
import itertools

from django.core.management.base import BaseCommand
from django.utils import timezone

from bookings.models import Bus, City, Route, Schedule, Seat


class Command(BaseCommand):
    help = 'Seed the database with sample data for development'

    def handle(self, *args, **kwargs):
        self.stdout.write('Seeding cities...')
        cities_data = [
            ('Mumbai', 'MUM', 'Maharashtra'),
            ('Pune', 'PNE', 'Maharashtra'),
            ('Chennai', 'CHN', 'Tamil Nadu'),
            ('Bengaluru', 'BLR', 'Karnataka'),
            ('Hyderabad', 'HYD', 'Telangana'),
            ('Delhi', 'DEL', 'Delhi'),
            ('Ahmedabad', 'AMD', 'Gujarat'),
            ('Kolkata', 'KOL', 'West Bengal'),
            ('Coimbatore', 'CBE', 'Tamil Nadu'),
            ('Madurai', 'MDU', 'Tamil Nadu'),
        ]
        cities = {}
        for name, code, state in cities_data:
            city, _ = City.objects.get_or_create(
                code=code,
                defaults={'name': name, 'state': state},
            )
            cities[code] = city

        self.stdout.write('Seeding buses...')
        buses_data = [
            ('TN01AB1234', 'Tamil Nadu Express', 'AC_SLEEPER', 40, ['AC', 'WiFi', 'Charging Port', 'Blanket']),
            ('KA02CD5678', 'Karnataka Travels', 'VOLVO', 45, ['AC', 'WiFi', 'Entertainment']),
            ('MH03EF9012', 'Maharashtra Roadways', 'SEATER', 50, ['Fan', 'Water Bottle']),
            ('AP04GH3456', 'Andhra Deluxe', 'AC_SEATER', 40, ['AC', 'Charging Port']),
            ('DL05IJ7890', 'Delhi Express', 'SLEEPER', 36, ['Fan', 'Blanket', 'Pillow']),
        ]
        buses = []
        for number, name, bus_type, seats, amenities in buses_data:
            bus, _ = Bus.objects.get_or_create(
                bus_number=number,
                defaults={
                    'bus_name': name,
                    'bus_type': bus_type,
                    'total_seats': seats,
                    'amenities': amenities,
                },
            )
            buses.append(bus)

        self.stdout.write('Seeding routes...')
        route_overrides = {
            ('CHN', 'BLR'): (340, 6.5, 550),
            ('BLR', 'CHN'): (340, 6.5, 550),
            ('CHN', 'HYD'): (625, 10.0, 750),
            ('HYD', 'CHN'): (625, 10.0, 750),
            ('BLR', 'HYD'): (570, 9.5, 700),
            ('HYD', 'BLR'): (570, 9.5, 700),
            ('MUM', 'PNE'): (150, 3.0, 300),
            ('PNE', 'MUM'): (150, 3.0, 300),
            ('MUM', 'AMD'): (530, 8.0, 650),
            ('AMD', 'MUM'): (530, 8.0, 650),
            ('CHN', 'CBE'): (490, 7.5, 500),
            ('CBE', 'CHN'): (490, 7.5, 500),
            ('CHN', 'MDU'): (460, 7.0, 480),
            ('MDU', 'CHN'): (460, 7.0, 480),
        }
        city_codes = list(cities.keys())
        routes_data = []
        for source_index, source_code in enumerate(city_codes):
            for destination_index, destination_code in enumerate(city_codes):
                if source_code == destination_code:
                    continue
                route_key = (source_code, destination_code)
                if route_key in route_overrides:
                    distance, duration, fare = route_overrides[route_key]
                else:
                    distance = 180 + abs(source_index - destination_index) * 115
                    duration = round(max(3, distance / 70), 1)
                    fare = round(max(250, distance * 1.25), -1)
                routes_data.append((source_code, destination_code, distance, duration, fare))
        routes = []
        for source_code, destination_code, distance, duration, fare in routes_data:
            if source_code in cities and destination_code in cities:
                route, _ = Route.objects.get_or_create(
                    source=cities[source_code],
                    destination=cities[destination_code],
                    defaults={
                        'distance_km': distance,
                        'duration_hours': duration,
                        'base_fare': fare,
                    },
                )
                routes.append((route, fare))

        self.stdout.write('Seeding schedules and seats...')
        base_date = timezone.now().replace(
            hour=0,
            minute=0,
            second=0,
            microsecond=0,
        ) + timedelta(days=1)
        schedule_times = [(6, 0), (9, 30), (14, 0), (18, 30), (22, 0), (23, 30)]

        for (route, fare), bus in itertools.product(routes, buses[:2]):
            for day in range(30):
                current_date = base_date + timedelta(days=day)
                for hour, minute in schedule_times[:2]:
                    departure = current_date + timedelta(hours=hour, minutes=minute)
                    arrival = departure + timedelta(hours=route.duration_hours)

                    schedule, created = Schedule.objects.get_or_create(
                        bus=bus,
                        route=route,
                        departure_time=departure,
                        defaults={
                            'arrival_time': arrival,
                            'fare': fare,
                            'available_seats': bus.total_seats,
                        },
                    )
                    if created:
                        self.ensure_seats(schedule, bus.total_seats)

        self.stdout.write(self.style.SUCCESS('Database seeded successfully!'))
        self.stdout.write(f'  Cities: {City.objects.count()}')
        self.stdout.write(f'  Buses: {Bus.objects.count()}')
        self.stdout.write(f'  Routes: {Route.objects.count()}')
        self.stdout.write(f'  Schedules: {Schedule.objects.count()}')
        self.stdout.write(f'  Seats: {Seat.objects.count()}')

    def ensure_seats(self, schedule, total_seats):
        existing_seat_numbers = set(
            Seat.objects.filter(schedule=schedule).values_list('seat_number', flat=True)
        )
        seats = []
        for i in range(1, total_seats + 1):
            row = (i - 1) // 4 + 1
            col = ['A', 'B', 'C', 'D'][(i - 1) % 4]
            seat_number = f'{row}{col}'
            if seat_number in existing_seat_numbers:
                continue
            seat_type = 'WINDOW' if col in ['A', 'D'] else 'AISLE'
            extra_charge = 30 if seat_type == 'WINDOW' else 0
            seats.append(
                Seat(
                    schedule=schedule,
                    seat_number=seat_number,
                    seat_type=seat_type,
                    extra_charge=extra_charge,
                )
            )
        if seats:
            Seat.objects.bulk_create(seats, ignore_conflicts=True)
