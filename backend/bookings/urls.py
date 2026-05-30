from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # Auth
    path('auth/register/', views.RegisterView.as_view(), name='register'),
    path('auth/login/', views.LoginView.as_view(), name='login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Cities
    path('cities/', views.CityListView.as_view(), name='cities'),

    # Schedules / Search
    path('schedules/search/', views.ScheduleSearchView.as_view(), name='schedule-search'),
    path('schedules/<int:pk>/', views.ScheduleDetailView.as_view(), name='schedule-detail'),
    path('schedules/<int:schedule_id>/seats/', views.SeatLayoutView.as_view(), name='seat-layout'),

    # Bookings
    path('bookings/', views.BookingCreateView.as_view(), name='booking-create'),
    path('bookings/my/', views.UserBookingsView.as_view(), name='my-bookings'),
    path('bookings/<int:pk>/', views.BookingDetailView.as_view(), name='booking-detail'),
    path('bookings/<int:pk>/cancel/', views.CancelBookingView.as_view(), name='cancel-booking'),
]