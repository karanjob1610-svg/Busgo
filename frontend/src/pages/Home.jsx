import React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCities } from "../services/api";

export default function Home() {
  const [cities, setCities] = useState([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [date, setDate] = useState("");
  const [seats, setSeats] = useState(1);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchCities().then((data) => setCities(data.results || data)).catch(() => {});
    // Default date = tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setDate(tomorrow.toISOString().split("T")[0]);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!from || !to || !date) { setError("Please fill all fields."); return; }
    if (from === to) { setError("Source and destination cannot be same."); return; }
    setError("");
    navigate(`/search?from=${from}&to=${to}&date=${date}&seats=${seats}`);
  };

  const popularRoutes = [
    { from: "Chennai", to: "Bengaluru", fromCode: "CHN", toCode: "BLR", price: "₹550", time: "6.5h" },
    { from: "Mumbai", to: "Pune", fromCode: "MUM", toCode: "PNE", price: "₹300", time: "3h" },
    { from: "Chennai", to: "Hyderabad", fromCode: "CHN", toCode: "HYD", price: "₹750", time: "10h" },
    { from: "Bengaluru", to: "Hyderabad", fromCode: "BLR", toCode: "HYD", price: "₹700", time: "9.5h" },
  ];

  const features = [
    { icon: "🔒", title: "Secure Booking", desc: "SSL-encrypted payments with instant confirmation" },
    { icon: "🎟️", title: "Easy Cancellation", desc: "Cancel up to 4 hours before departure for a refund" },
    { icon: "💺", title: "Seat Selection", desc: "Choose your preferred seat — window, aisle or berth" },
    { icon: "📱", title: "E-Ticket", desc: "Get your ticket instantly on email and SMS" },
  ];

  return (
    <div className="home-page">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Travel Smarter.<br />
            <span className="text-accent">Book Faster.</span>
          </h1>
          <p className="hero-subtitle">
            Book bus tickets across India — AC sleeper, Volvo, seater and more.
            Instant confirmation, easy cancellation.
          </p>

          {/* Search Box */}
          <form className="search-box" onSubmit={handleSearch}>
            <h2 className="search-title">Find Your Bus</h2>
            {error && <p className="form-error">⚠ {error}</p>}

            <div className="search-grid">
              <div className="form-group">
                <label>From</label>
                <select value={from} onChange={(e) => setFrom(e.target.value)} required>
                  <option value="">Select departure city</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                className="swap-btn"
                onClick={() => { const tmp = from; setFrom(to); setTo(tmp); }}
                title="Swap cities"
              >⇄</button>

              <div className="form-group">
                <label>To</label>
                <select value={to} onChange={(e) => setTo(e.target.value)} required>
                  <option value="">Select destination city</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Date of Journey</label>
                <input
                  type="date"
                  value={date}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Passengers</label>
                <select value={seats} onChange={(e) => setSeats(e.target.value)}>
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>{n} Passenger{n > 1 ? "s" : ""}</option>
                  ))}
                </select>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg search-submit">
              🔍 Search Buses
            </button>
          </form>
        </div>

        <div className="hero-visual">
          <div className="bus-illustration">🚌</div>
          <div className="route-line" />
          <div className="city-dots">
            <span className="dot dot-from" />
            <span className="dot dot-to" />
          </div>
        </div>
      </section>

      {/* Popular Routes */}
      <section className="section">
        <h2 className="section-title">Popular Routes</h2>
        <div className="routes-grid">
          {popularRoutes.map((route, i) => (
            <div
              key={i}
              className="route-card"
              onClick={() => {
                const fromCity = cities.find((c) => c.code === route.fromCode);
                const toCity = cities.find((c) => c.code === route.toCode);
                if (fromCity && toCity) {
                  navigate(`/search?from=${fromCity.id}&to=${toCity.id}&date=${date}&seats=1`);
                }
              }}
            >
              <div className="route-cities">
                <span className="route-city">{route.from}</span>
                <span className="route-arrow">→</span>
                <span className="route-city">{route.to}</span>
              </div>
              <div className="route-meta">
                <span className="route-price">{route.price}</span>
                <span className="route-time">⏱ {route.time}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="section features-section">
        <h2 className="section-title">Why Choose BusGo?</h2>
        <div className="features-grid">
          {features.map((f, i) => (
            <div key={i} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Banner */}
      <section className="stats-banner">
        <div className="stat"><span className="stat-number">500+</span><span className="stat-label">Bus Operators</span></div>
        <div className="stat"><span className="stat-number">100+</span><span className="stat-label">Cities</span></div>
        <div className="stat"><span className="stat-number">10L+</span><span className="stat-label">Happy Travelers</span></div>
        <div className="stat"><span className="stat-number">24/7</span><span className="stat-label">Customer Support</span></div>
      </section>
    </div>
  );
}