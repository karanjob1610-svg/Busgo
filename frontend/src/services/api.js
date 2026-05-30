const BASE_URL = import.meta.env.VITE_API_URL ||'http://127.0.0.1:8000/api';

const getHeaders = () => {
  const token = localStorage.getItem('access_token');

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const handleResponse = async (res) => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error('BACKEND ERROR:', data);

    throw new Error(
      data.detail ||
      data.error ||
      JSON.stringify(data) ||
      'Request failed'
    );
  }

  return data;
};

// ─── Auth ─────────────────────────────────────────────────────

export const login = (username, password) =>
  fetch(`${BASE_URL}/auth/login/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ username, password }),
  }).then(handleResponse);

export const register = (data) =>
  fetch(`${BASE_URL}/auth/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  }).then(handleResponse);

export const refreshToken = (refresh) =>
  fetch(`${BASE_URL}/auth/token/refresh/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh }),
  }).then(handleResponse);

// ─── Cities ──────────────────────────────────────────────────

export const fetchCities = (q = '') =>
  fetch(
    `${BASE_URL}/cities/${q ? `?q=${q}` : ''}`,
    {
      headers: getHeaders(),
    }
  ).then(handleResponse);

// ─── Schedules ───────────────────────────────────────────────

export const searchBuses = ({
  from,
  to,
  date,
  seats = 1,
  bus_type,
  max_fare,
  sort,
}) => {
  const params = new URLSearchParams({
    from,
    to,
    date,
    seats,
  });

  if (bus_type) params.set('bus_type', bus_type);
  if (max_fare) params.set('max_fare', max_fare);
  if (sort) params.set('sort', sort);

  return fetch(
    `${BASE_URL}/schedules/search/?${params}`,
    {
      headers: getHeaders(),
    }
  ).then(handleResponse);
};

export const fetchScheduleDetail = (id) =>
  fetch(`${BASE_URL}/schedules/${id}/`, {
    headers: getHeaders(),
  }).then(handleResponse);

export const fetchSeatLayout = (scheduleId) =>
  fetch(`${BASE_URL}/schedules/${scheduleId}/seats/`, {
    headers: getHeaders(),
  }).then(handleResponse);

// ─── Bookings ────────────────────────────────────────────────

export const createBooking = (data) =>
  fetch(`${BASE_URL}/bookings/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  }).then(handleResponse);

export const fetchMyBookings = () =>
  fetch(`${BASE_URL}/bookings/my/`, {
    headers: getHeaders(),
  }).then(handleResponse);

export const fetchBookingDetail = (id) =>
  fetch(`${BASE_URL}/bookings/${id}/`, {
    headers: getHeaders(),
  }).then(handleResponse);

export const cancelBooking = (id) =>
  fetch(`${BASE_URL}/bookings/${id}/cancel/`, {
    method: 'POST',
    headers: getHeaders(),
  }).then(handleResponse);