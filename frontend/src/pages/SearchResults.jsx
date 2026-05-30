import React from "react";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { searchBuses, fetchCities } from "../services/api";

const BUS_TYPE_LABELS = {
  SLEEPER: "Sleeper", SEATER: "Seater",
  AC_SLEEPER: "AC Sleeper", AC_SEATER: "AC Seater", VOLVO: "Volvo",
};

export default function SearchResults() {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const [buses, setBuses] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [busType, setBusType] = useState("");
  const [maxFare, setMaxFare] = useState("");
  const [sort, setSort] = useState("departure_time");

  const from = params.get("from");
  const to = params.get("to");
  const date = params.get("date");
  const seats = params.get("seats") || 1;

  useEffect(() => {
    fetchCities().then((d) => setCities(d.results || d)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!from || !to || !date) return;
    setLoading(true);
    setError("");
    searchBuses({ from, to, date, seats, bus_type: busType, max_fare: maxFare, sort })
      .then((data) => setBuses(data.results || data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to, date, seats, busType, maxFare, sort]);

  const cityName = (id) => cities.find((c) => String(c.id) === String(id))?.name || "—";

  const formatTime = (iso) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  };
  const formatDate = (iso) => new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="search-page">
      {/* Summary Bar */}
      <div className="search-summary-bar">
        <div className="summary-route">
          <span className="summary-city">{cityName(from)}</span>
          <span className="summary-arrow">→</span>
          <span className="summary-city">{cityName(to)}</span>
        </div>
        <div className="summary-meta">
          <span>📅 {date}</span>
          <span>👥 {seats} seat{seats > 1 ? "s" : ""}</span>
          <button className="btn btn-outline btn-sm" onClick={() => navigate("/")}>Modify</button>
        </div>
      </div>

      <div className="search-layout">
        {/* Filters Sidebar */}
        <aside className="filters-sidebar">
          <h3 className="filters-title">Filters</h3>

          <div className="filter-group">
            <label>Bus Type</label>
            <select value={busType} onChange={(e) => setBusType(e.target.value)}>
              <option value="">All Types</option>
              {Object.entries(BUS_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Max Fare (₹)</label>
            <input
              type="number"
              placeholder="e.g. 800"
              value={maxFare}
              onChange={(e) => setMaxFare(e.target.value)}
              min="0"
            />
          </div>

          <div className="filter-group">
            <label>Sort By</label>
            <select value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="departure_time">Departure Time</option>
              <option value="fare">Fare (Low to High)</option>
              <option value="available_seats">Available Seats</option>
            </select>
          </div>

          <button className="btn btn-outline btn-sm" onClick={() => { setBusType(""); setMaxFare(""); setSort("departure_time"); }}>
            Clear Filters
          </button>
        </aside>

        {/* Results */}
        <main className="results-main">
          {loading && (
            <div className="loading-state">
              <div className="spinner" />
              <p>Searching buses...</p>
            </div>
          )}

          {!loading && error && (
            <div className="error-state">
              <p>⚠ {error}</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}

          {!loading && !error && buses.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🚌</div>
              <h3>No buses found</h3>
              <p>Try changing the date or removing filters.</p>
            </div>
          )}

          {!loading && !error && buses.length > 0 && (
            <>
              <p className="results-count">{buses.length} bus{buses.length > 1 ? "es" : ""} found</p>
              <div className="bus-list">
                {buses.map((bus) => (
                  <div key={bus.id} className="bus-card">
                    <div className="bus-card-header">
                      <div className="bus-info">
                        <span className="bus-name">{bus.bus_name}</span>
                        <span className={`bus-type-badge badge-${bus.bus_type?.toLowerCase()}`}>
                          {bus.bus_type_display || BUS_TYPE_LABELS[bus.bus_type] || bus.bus_type}
                        </span>
                        <span className="bus-number">{bus.bus_number}</span>
                      </div>
                      <div className="bus-fare">
                        <span className="fare-amount">₹{bus.fare}</span>
                        <span className="fare-label">per seat</span>
                      </div>
                    </div>

                    <div className="bus-timing">
                      <div className="timing-block">
                        <span className="time">{formatTime(bus.departure_time)}</span>
                        <span className="city-label">{cityName(from)}</span>
                        <span className="date-label">{formatDate(bus.departure_time)}</span>
                      </div>
                      <div className="timing-middle">
                        <span className="duration">⏱ {bus.duration}</span>
                        <div className="timing-line" />
                        <span className="distance">📍 {bus.distance_km} km</span>
                      </div>
                      <div className="timing-block timing-block-right">
                        <span className="time">{formatTime(bus.arrival_time)}</span>
                        <span className="city-label">{cityName(to)}</span>
                        <span className="date-label">{formatDate(bus.arrival_time)}</span>
                      </div>
                    </div>

                    <div className="bus-card-footer">
                      <span className={`seats-badge ${bus.available_seats < 5 ? "seats-low" : ""}`}>
                        💺 {bus.available_seats} seats available
                      </span>
                      <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/seat-selection/${bus.id}`)}
                        disabled={bus.available_seats === 0}
                      >
                        {bus.available_seats === 0 ? "Sold Out" : "Select Seats →"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
