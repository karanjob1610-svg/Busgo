import React from "react";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchScheduleDetail, fetchSeatLayout } from "../services/api";
import { useAuth } from "../context/AuthContext";

export default function SeatSelection() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [schedule, setSchedule] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeats, setSelectedSeats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchScheduleDetail(id), fetchSeatLayout(id)])
      .then(([sched, seatData]) => {
        setSchedule(sched);
        setSeats(seatData.results || seatData);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const toggleSeat = (seat) => {
    if (seat.is_booked) return;
    setSelectedSeats((prev) =>
      prev.find((s) => s.id === seat.id)
        ? prev.filter((s) => s.id !== seat.id)
        : prev.length < 6
        ? [...prev, seat]
        : prev
    );
  };

  const totalFare = selectedSeats.reduce(
    (sum, s) => sum + parseFloat(schedule?.fare || 0) + parseFloat(s.extra_charge || 0),
    0
  );

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  // Group seats into rows of 4 (A B | C D)
  const rows = {};
  seats.forEach((seat) => {
    const row = seat.seat_number.replace(/[A-D]/g, "");
    if (!rows[row]) rows[row] = {};
    const col = seat.seat_number.replace(/\d/g, "");
    rows[row][col] = seat;
  });

  if (loading) return <div className="loading-page"><div className="spinner" /><p>Loading seat layout...</p></div>;
  if (error) return <div className="error-page"><p>⚠ {error}</p><button onClick={() => navigate(-1)} className="btn btn-primary">Go Back</button></div>;
  if (!schedule) return null;

  return (
    <div className="seat-page">
      {/* Schedule Info */}
      <div className="seat-schedule-info">
        <div className="schedule-route">
          <span className="city-big">{schedule.route_detail?.source_detail?.name}</span>
          <div className="route-mid">
            <span className="dep-time">{formatTime(schedule.departure_time)}</span>
            <div className="route-line-sm" />
            <span className="dep-time">{formatTime(schedule.arrival_time)}</span>
          </div>
          <span className="city-big">{schedule.route_detail?.destination_detail?.name}</span>
        </div>
        <div className="schedule-meta">
          <span className="meta-chip">🚌 {schedule.bus_detail?.bus_name}</span>
          <span className="meta-chip">🏷 {schedule.bus_detail?.bus_type}</span>
          <span className="meta-chip">💺 {schedule.available_seats} seats left</span>
        </div>
      </div>

      <div className="seat-layout-wrapper">
        {/* Bus Diagram */}
        <div className="bus-diagram-panel">
          <h3 className="panel-title">Select Your Seats</h3>

          <div className="seat-legend">
            <span className="legend-item"><span className="seat-dot available" /> Available</span>
            <span className="legend-item"><span className="seat-dot booked" /> Booked</span>
            <span className="legend-item"><span className="seat-dot selected" /> Selected</span>
            <span className="legend-item"><span className="seat-dot window" /> Window (+₹30)</span>
          </div>

          <div className="bus-body">
            <div className="bus-front">
              <span>🚪 Driver</span>
            </div>

            <div className="seat-grid">
              {/* Column headers */}
              <div className="col-header-row">
                <span>A</span><span>B</span><span className="aisle-gap" /><span>C</span><span>D</span>
              </div>

              {Object.keys(rows)
                .sort((a, b) => Number(a) - Number(b))
                .map((row) => (
                  <div key={row} className="seat-row">
                    {["A", "B"].map((col) => {
                      const seat = rows[row][col];
                      if (!seat) return <div key={col} className="seat-placeholder" />;
                      const isSelected = selectedSeats.find((s) => s.id === seat.id);
                      return (
                        <button
                          key={col}
                          className={`seat-btn ${seat.is_booked ? "booked" : ""} ${isSelected ? "selected" : ""} ${seat.seat_type === "WINDOW" ? "window-seat" : ""}`}
                          onClick={() => toggleSeat(seat)}
                          disabled={seat.is_booked}
                          title={`${seat.seat_number} — ${seat.seat_type}${seat.extra_charge > 0 ? ` (+₹${seat.extra_charge})` : ""}`}
                        >
                          {seat.seat_number}
                        </button>
                      );
                    })}
                    <div className="aisle-gap" />
                    {["C", "D"].map((col) => {
                      const seat = rows[row][col];
                      if (!seat) return <div key={col} className="seat-placeholder" />;
                      const isSelected = selectedSeats.find((s) => s.id === seat.id);
                      return (
                        <button
                          key={col}
                          className={`seat-btn ${seat.is_booked ? "booked" : ""} ${isSelected ? "selected" : ""} ${seat.seat_type === "WINDOW" ? "window-seat" : ""}`}
                          onClick={() => toggleSeat(seat)}
                          disabled={seat.is_booked}
                          title={`${seat.seat_number} — ${seat.seat_type}${seat.extra_charge > 0 ? ` (+₹${seat.extra_charge})` : ""}`}
                        >
                          {seat.seat_number}
                        </button>
                      );
                    })}
                    <span className="row-number">{row}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Booking Summary */}
        <div className="booking-summary-panel">
          <h3 className="panel-title">Booking Summary</h3>

          {selectedSeats.length === 0 ? (
            <p className="no-seats-msg">No seats selected yet.<br />Click on an available seat.</p>
          ) : (
            <>
              <div className="selected-seats-list">
                {selectedSeats.map((s) => (
                  <div key={s.id} className="selected-seat-row">
                    <span>Seat {s.seat_number} ({s.seat_type})</span>
                    <span>₹{parseFloat(schedule.fare) + parseFloat(s.extra_charge)}</span>
                    <button className="remove-seat" onClick={() => toggleSeat(s)}>✕</button>
                  </div>
                ))}
              </div>

              <div className="fare-breakdown">
                <div className="fare-row">
                  <span>Base Fare × {selectedSeats.length}</span>
                  <span>₹{parseFloat(schedule.fare) * selectedSeats.length}</span>
                </div>
                <div className="fare-row">
                  <span>Seat Charges</span>
                  <span>₹{selectedSeats.reduce((s, seat) => s + parseFloat(seat.extra_charge), 0)}</span>
                </div>
                <div className="fare-row fare-total">
                  <span>Total</span>
                  <span>₹{totalFare}</span>
                </div>
              </div>

              <button
                className="btn btn-primary btn-block"
                onClick={() => {
                  if (!user) { navigate("/login"); return; }
                  navigate("/passenger-details", {
                    state: { schedule, selectedSeats, totalFare },
                  });
                }}
              >
                Continue to Passenger Details →
              </button>
            </>
          )}

          <div className="amenities-list">
            <h4>Amenities</h4>
            {(schedule.bus_detail?.amenities || []).map((a, i) => (
              <span key={i} className="amenity-tag">{a}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}