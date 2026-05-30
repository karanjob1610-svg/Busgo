import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMyBookings, cancelBooking } from "../services/api";

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancellingId, setCancellingId] = useState(null);
  const [tab, setTab] = useState("upcoming"); // upcoming | past | cancelled
  const navigate = useNavigate();

  useEffect(() => {
    fetchMyBookings()
      .then((data) => setBookings(data.results || data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (bookingId) => {
  if (!window.confirm("Are you sure you want to cancel this booking?")) return;

  setCancellingId(bookingId);

  try {
    const response = await cancelBooking(bookingId);

    alert(response.message || "Booking cancelled successfully");

    setBookings((prev) =>
      prev.map((b) =>
        b.id === bookingId
          ? {
              ...b,
              booking_status: "CANCELLED",
              payment_status: "REFUNDED",
            }
          : b
      )
    );
  } catch (e) {
    alert("Cancellation failed: " + e.message);
  } finally {
    setCancellingId(null);
  }
};

  const now = new Date();

  const filtered = bookings.filter((b) => {
    const dep = new Date(b.schedule_detail?.departure_time);
    if (tab === "upcoming") return b.booking_status === "CONFIRMED" && dep > now;
    if (tab === "past") return b.booking_status === "CONFIRMED" && dep <= now;
    if (tab === "cancelled") return b.booking_status === "CANCELLED";
    return true;
  });

  const formatDate = (iso) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="my-bookings-page">
      <div className="page-header">
        <h1>My Bookings</h1>
      </div>

      {/* Tabs */}
      <div className="bookings-tabs">
        {["upcoming", "past", "cancelled"].map((t) => (
          <button
            key={t}
            className={`tab-btn ${tab === t ? "active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {" "}
            ({bookings.filter((b) => {
              const dep = new Date(b.schedule_detail?.departure_time);
              if (t === "upcoming") return b.booking_status === "CONFIRMED" && dep > now;
              if (t === "past") return b.booking_status === "CONFIRMED" && dep <= now;
              return b.booking_status === "CANCELLED";
            }).length})
          </button>
        ))}
      </div>

      {loading && <div className="loading-state"><div className="spinner" /><p>Loading bookings...</p></div>}
      {!loading && error && <div className="error-state"><p>⚠ {error}</p></div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">🎟️</div>
          <h3>No {tab} bookings</h3>
          {tab === "upcoming" && (
            <button className="btn btn-primary" onClick={() => navigate("/")}>Book a Bus</button>
          )}
        </div>
      )}

      <div className="bookings-list">
        {filtered.map((b) => (
          <div key={b.id} className={`booking-card ${b.booking_status === "CANCELLED" ? "cancelled-booking" : ""}`}>
            <div className="booking-card-header">
              <div className="booking-ref-info">
                <span className="booking-ref">#{b.booking_reference}</span>
                <span className={`status-badge ${b.booking_status === "CONFIRMED" ? "badge-success" : b.booking_status === "CANCELLED" ? "badge-danger" : "badge-warning"}`}>
                  {b.booking_status}
                </span>
              </div>
              <span className="booking-date">Booked on {formatDate(b.booked_at)}</span>
            </div>

            <div className="booking-route">
              <div className="bk-city">
                <span className="bk-time">{formatTime(b.schedule_detail?.departure_time)}</span>
                <span className="bk-city-name">{b.schedule_detail?.source}</span>
                <span className="bk-date">{formatDate(b.schedule_detail?.departure_time)}</span>
              </div>
              <div className="bk-mid">
                <span className="bk-duration">{b.schedule_detail?.duration}</span>
                <div className="bk-line" />
              </div>
              <div className="bk-city bk-city-right">
                <span className="bk-time">{formatTime(b.schedule_detail?.arrival_time)}</span>
                <span className="bk-city-name">{b.schedule_detail?.destination}</span>
                <span className="bk-date">{formatDate(b.schedule_detail?.arrival_time)}</span>
              </div>
            </div>

            <div className="booking-card-footer">
              <div className="booking-meta">
                <span>👥 {b.passenger_details?.length || 0} passenger(s)</span>
                <span>💺 {b.schedule_detail?.bus_name}</span>
                <span className="booking-fare">₹{b.total_fare}</span>
              </div>
              <div className="booking-actions">
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => navigate(`/booking-confirmation/${b.id}`)}
                >
                  View Ticket
                </button>
                {b.booking_status === "CONFIRMED" && new Date(b.schedule_detail?.departure_time) > now && (
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleCancel(b.id)}
                    disabled={cancellingId === b.id}
                  >
                    {cancellingId === b.id ? "Cancelling..." : "Cancel"}
                  </button>
                )}
                {b.booking_status === "CANCELLED" && (
                  <span className="refund-label">💰 Refund: {b.payment_status}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}