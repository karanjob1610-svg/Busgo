import React from "react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createBooking } from "../services/api";

const PAYMENT_METHODS = [
  { value: "UPI", label: "💸 UPI", desc: "Google Pay, PhonePe, Paytm" },
  { value: "CARD", label: "💳 Card", desc: "Credit / Debit card" },
  { value: "NETBANKING", label: "🏦 Net Banking", desc: "All major banks" },
  { value: "WALLET", label: "👛 Wallet", desc: "Paytm, Amazon Pay" },
];

export default function PassengerDetails() {
  const location = useLocation();
  const navigate = useNavigate();
  const { schedule, selectedSeats, totalFare } = location.state || {};

  const [passengers, setPassengers] = useState(
    selectedSeats?.map(() => ({ name: "", age: "", gender: "M", id_type: "AADHAAR", id_number: "" })) || []
  );
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentDetails, setPaymentDetails] = useState({
    upiId: "",
    cardNumber: "",
    cardName: "",
    cardExpiry: "",
    cardCvv: "",
    bankName: "",
    walletMobile: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!schedule || !selectedSeats) {
    navigate("/");
    return null;
  }

  const updatePassenger = (idx, field, value) => {
    setPassengers((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  };

  const updatePaymentDetail = (field, value) => {
    setPaymentDetails((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      if (!p.name.trim()) return `Passenger ${i + 1}: Name is required`;
      if (!p.age || p.age < 1 || p.age > 120) return `Passenger ${i + 1}: Valid age required`;
    }

    if (paymentMethod === "UPI" && !/^[\w.-]+@[\w.-]+$/.test(paymentDetails.upiId.trim())) {
      return "Enter a valid UPI ID.";
    }
    if (paymentMethod === "CARD") {
      const cardNumber = paymentDetails.cardNumber.replace(/\s/g, "");
      if (!/^\d{12,19}$/.test(cardNumber)) return "Enter a valid card number.";
      if (!paymentDetails.cardName.trim()) return "Enter the card holder name.";
      if (!/^\d{2}\/\d{2}$/.test(paymentDetails.cardExpiry.trim())) return "Enter expiry in MM/YY format.";
      if (!/^\d{3,4}$/.test(paymentDetails.cardCvv.trim())) return "Enter a valid CVV.";
    }
    if (paymentMethod === "NETBANKING" && !paymentDetails.bankName.trim()) {
      return "Enter your bank name.";
    }
    if (paymentMethod === "WALLET" && !/^\d{10}$/.test(paymentDetails.walletMobile.trim())) {
      return "Enter a valid 10 digit wallet mobile number.";
    }
    return null;
  };

  const handleBooking = async () => {
    const err = validate();

    if (err) {
      setError(err);
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload = {
        schedule_id: schedule.id,
        seat_ids: selectedSeats.map((s) => s.id),
        passengers: passengers.map((p, i) => ({
          ...p,
          age: parseInt(p.age),
          seat: selectedSeats[i].id,
        })),
        payment_method: paymentMethod,
      };

      const booking = await createBooking(payload);

      if (booking && booking.id) {
        alert("Payment Successful! Ticket Generated Successfully");
        navigate(`/booking-confirmation/${booking.id}`, {
          state: { booking },
        });
      } else {
        throw new Error("Booking creation failed - no booking ID returned");
      }

    } catch (e) {
      setError(e.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (iso) =>
    new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

  return (
    <div className="passenger-page">
      <div className="passenger-layout">
        <div className="passenger-main">
          <h2 className="page-title">Passenger Details</h2>

          {/* Journey Info */}
          <div className="journey-info-card">
            <div className="journey-route">
              <span>{schedule.route_detail?.source_detail?.name}</span>
              <span className="arrow-mid">→</span>
              <span>{schedule.route_detail?.destination_detail?.name}</span>
            </div>
            <div className="journey-meta">
              <span>{formatTime(schedule.departure_time)}</span>
              <span>·</span>
              <span>{new Date(schedule.departure_time).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              <span>·</span>
              <span>{schedule.bus_detail?.bus_name}</span>
            </div>
          </div>

          {/* Passenger Forms */}
          {passengers.map((p, idx) => (
            <div key={idx} className="passenger-form-card">
              <h3 className="passenger-form-title">
                Passenger {idx + 1} — Seat {selectedSeats[idx]?.seat_number}
              </h3>

              <div className="passenger-form-grid">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    placeholder="As per ID proof"
                    value={p.name}
                    onChange={(e) => updatePassenger(idx, "name", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Age *</label>
                  <input
                    type="number"
                    placeholder="Age"
                    value={p.age}
                    min="1"
                    max="120"
                    onChange={(e) => updatePassenger(idx, "age", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Gender *</label>
                  <select value={p.gender} onChange={(e) => updatePassenger(idx, "gender", e.target.value)}>
                    <option value="M">Male</option>
                    <option value="F">Female</option>
                    <option value="O">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>ID Type</label>
                  <select value={p.id_type} onChange={(e) => updatePassenger(idx, "id_type", e.target.value)}>
                    <option value="AADHAAR">Aadhaar</option>
                    <option value="PAN">PAN Card</option>
                    <option value="PASSPORT">Passport</option>
                    <option value="DL">Driving License</option>
                  </select>
                </div>

                <div className="form-group form-group-wide">
                  <label>ID Number (optional)</label>
                  <input
                    type="text"
                    placeholder="Enter ID number"
                    value={p.id_number}
                    onChange={(e) => updatePassenger(idx, "id_number", e.target.value)}
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Payment Method */}
          <div className="payment-section">
            <h3 className="section-subtitle">Payment Method</h3>
            <div className="payment-options">
              {PAYMENT_METHODS.map((m) => (
                <label
                  key={m.value}
                  className={`payment-option ${paymentMethod === m.value ? "selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={m.value}
                    checked={paymentMethod === m.value}
                    onChange={() => setPaymentMethod(m.value)}
                  />
                  <div className="payment-label">{m.label}</div>
                  <div className="payment-desc">{m.desc}</div>
                </label>
              ))}
            </div>

            <div className="payment-details">
              {paymentMethod === "UPI" && (
                <div className="form-group">
                  <label>UPI ID</label>
                  <input
                    type="text"
                    placeholder="name@bank"
                    value={paymentDetails.upiId}
                    onChange={(e) => updatePaymentDetail("upiId", e.target.value)}
                  />
                </div>
              )}

              {paymentMethod === "CARD" && (
                <div className="payment-card-grid">
                  <div className="form-group form-group-wide">
                    <label>Card Number</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="1234 5678 9012 3456"
                      value={paymentDetails.cardNumber}
                      onChange={(e) => updatePaymentDetail("cardNumber", e.target.value)}
                    />
                  </div>
                  <div className="form-group form-group-wide">
                    <label>Name on Card</label>
                    <input
                      type="text"
                      placeholder="Card holder name"
                      value={paymentDetails.cardName}
                      onChange={(e) => updatePaymentDetail("cardName", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Expiry</label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={paymentDetails.cardExpiry}
                      onChange={(e) => updatePaymentDetail("cardExpiry", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>CVV</label>
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="123"
                      value={paymentDetails.cardCvv}
                      onChange={(e) => updatePaymentDetail("cardCvv", e.target.value)}
                    />
                  </div>
                </div>
              )}

              {paymentMethod === "NETBANKING" && (
                <div className="form-group">
                  <label>Bank Name</label>
                  <input
                    type="text"
                    placeholder="Enter bank name"
                    value={paymentDetails.bankName}
                    onChange={(e) => updatePaymentDetail("bankName", e.target.value)}
                  />
                </div>
              )}

              {paymentMethod === "WALLET" && (
                <div className="form-group">
                  <label>Wallet Mobile Number</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    placeholder="10 digit mobile number"
                    value={paymentDetails.walletMobile}
                    onChange={(e) => updatePaymentDetail("walletMobile", e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>

          {error && <div className="form-error-box">⚠ {error}</div>}

          <button
            className="btn btn-primary btn-lg btn-block"
            onClick={handleBooking}
            disabled={loading}
          >
            {loading ? "Processing..." : `Pay ₹${totalFare} & Book →`}
          </button>
        </div>

        {/* Order Summary */}
        <aside className="order-summary">
          <h3 className="panel-title">Order Summary</h3>
          <div className="summary-route-mini">
            <strong>{schedule.route_detail?.source_detail?.name}</strong>
            <span> → </span>
            <strong>{schedule.route_detail?.destination_detail?.name}</strong>
          </div>
          <div className="summary-seats">
            {selectedSeats.map((s) => (
              <div key={s.id} className="summary-seat-row">
                <span>Seat {s.seat_number}</span>
                <span>₹{parseFloat(schedule.fare) + parseFloat(s.extra_charge)}</span>
              </div>
            ))}
          </div>
          <div className="summary-divider" />
          <div className="summary-total-row">
            <span>Total Payable</span>
            <span className="total-amount">₹{totalFare}</span>
          </div>
          <p className="summary-note">🔒 Secure payment. Instant e-ticket on confirmation.</p>
        </aside>
      </div>
    </div>
  );
}
