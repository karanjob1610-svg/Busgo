import React from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { fetchBookingDetail } from "../services/api";

export default function BookingConfirmation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [booking, setBooking] = useState(location.state?.booking || null);
  const [loading, setLoading] = useState(!booking);

  useEffect(() => {
    if (!booking) {
      fetchBookingDetail(id)
        .then(setBooking)
        .catch(() => navigate("/my-bookings"))
        .finally(() => setLoading(false));
    }
  }, [id]);

  if (loading) return <div className="loading-page"><div className="spinner" /><p>Loading confirmation...</p></div>;
  if (!booking) return null;

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const seatNumberFor = (passenger, index) =>
    booking.passengers?.[index]?.seat_number || passenger.seat_number || "-";

  return (
    <div className="confirmation-page">
      <div className="confirmation-card">
        {/* Success Header */}
        <div className="confirmation-header">
          <div className="success-icon">✅</div>
          <h2>Booking Confirmed!</h2>
          <p className="booking-ref">Booking Reference: <strong>{booking.booking_reference}</strong></p>
        </div>

        {/* Journey Details */}
        <div className="ticket-body">
          <div className="ticket-route">
            <div className="ticket-city">
              <span className="ticket-time">{formatTime(booking.schedule_detail?.departure_time)}</span>
              <span className="ticket-city-name">{booking.schedule_detail?.source}</span>
              <span className="ticket-date">{formatDate(booking.schedule_detail?.departure_time)}</span>
            </div>
            <div className="ticket-mid">
              <span className="ticket-duration">{booking.schedule_detail?.duration}</span>
              <div className="ticket-line" />
            </div>
            <div className="ticket-city ticket-city-right">
              <span className="ticket-time">{formatTime(booking.schedule_detail?.arrival_time)}</span>
              <span className="ticket-city-name">{booking.schedule_detail?.destination}</span>
              <span className="ticket-date">{formatDate(booking.schedule_detail?.arrival_time)}</span>
            </div>
          </div>

          <div className="ticket-divider">
            <div className="ticket-notch left" />
            <div className="ticket-dots" />
            <div className="ticket-notch right" />
          </div>

          {/* Passenger Details */}
          <div className="ticket-passengers">
            <h4>Passengers</h4>
            <table className="passengers-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Seat</th>
                </tr>
              </thead>
              <tbody>
                {(booking.passenger_details || []).map((p, i) => (
                  <tr key={i}>
                    <td>{p.name}</td>
                    <td>{p.age}</td>
                    <td>{p.gender === "M" ? "Male" : p.gender === "F" ? "Female" : "Other"}</td>
                    <td><span className="seat-badge">{seatNumberFor(p, i)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="ticket-divider">
            <div className="ticket-notch left" />
            <div className="ticket-dots" />
            <div className="ticket-notch right" />
          </div>

          {/* Payment Info */}
          <div className="ticket-payment">
            <div className="payment-row">
              <span>Payment Status</span>
              <span className={`status-badge ${booking.payment_status === "PAID" ? "badge-success" : "badge-warning"}`}>
                {booking.payment_status}
              </span>
            </div>
            <div className="payment-row">
              <span>Amount Paid</span>
              <span className="amount-paid">₹{booking.total_fare}</span>
            </div>
            <div className="payment-row">
              <span>Transaction ID</span>
              <span className="txn-id">{booking.payment?.transaction_id || "—"}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="confirmation-actions">
          <button className="btn btn-outline" onClick={() => window.print()}>
            🖨 Print Ticket
          </button>
          <button className="btn btn-primary" onClick={() => navigate("/my-bookings")}>
            My Bookings →
          </button>
        </div>

        <p className="ticket-note">
          📧 A copy of this ticket has been sent to your registered email.
          Please carry a valid ID proof during travel.
        </p>
      </div>
    </div>
  );
}

