import React, { useState, useEffect } from "react";
import { getDashboard } from "../api";

const StatCard = ({ label, value, color, icon }) => (
  <div style={{
    background: "#1a1a24", borderRadius: "12px", padding: "20px",
    border: `1px solid ${color}33`, flex: 1, minWidth: "140px"
  }}>
    <div style={{ fontSize: "24px", marginBottom: "8px" }}>{icon}</div>
    <div style={{ fontSize: "28px", fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: "13px", color: "#777", marginTop: "4px" }}>{label}</div>
  </div>
);

export default function Dashboard({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getDashboard()
      .then(res => setStats(res.data))
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ color: "#666", padding: "40px" }}>Loading dashboard...</div>;

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#e8e8f0" }}>Dashboard</h1>
        <p style={{ color: "#666", marginTop: "6px", fontSize: "14px" }}>
          Your campaign performance at a glance
        </p>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "40px" }}>
          <StatCard label="Total Customers" value={stats.total_customers} color="#a78bfa" icon="👥" />
          <StatCard label="Total Orders"    value={stats.total_orders}    color="#34d399" icon="🛍️" />
          <StatCard label="Segments"        value={stats.total_segments}  color="#60a5fa" icon="🎯" />
          <StatCard label="Campaigns"       value={stats.total_campaigns} color="#f472b6" icon="📣" />
          <StatCard label="Messages Sent"   value={stats.total_messages}  color="#fbbf24" icon="💬" />
          <StatCard label="Total Revenue"   value={`₹${stats.total_revenue?.toLocaleString()}`} color="#34d399" icon="💰" />
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ background: "#1a1a24", borderRadius: "12px", padding: "24px", border: "1px solid #2a2a3a" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#a78bfa" }}>
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          {[
            { label: "Add Customer",    page: "customers", icon: "➕" },
            { label: "Create Segment",  page: "segments",  icon: "🎯" },
            { label: "Launch Campaign", page: "campaigns", icon: "🚀" },
          ].map(action => (
            <button key={action.label} onClick={() => onNavigate(action.page)} style={{
              background: "#2d1b69", border: "1px solid #7c3aed", color: "#a78bfa",
              borderRadius: "8px", padding: "10px 20px", cursor: "pointer",
              fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "8px"
            }}>
              {action.icon} {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div style={{
        marginTop: "24px", background: "#1a1a24", borderRadius: "12px",
        padding: "24px", border: "1px solid #2a2a3a"
      }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px", color: "#a78bfa" }}>
          How It Works
        </h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          {[
            "1. Add Customers & Orders",
            "→",
            "2. Create AI Segment",
            "→",
            "3. Launch Campaign",
            "→",
            "4. Track Performance"
          ].map((step, i) => (
            <div key={i} style={{
              background: step === "→" ? "transparent" : "#0f0f13",
              padding: step === "→" ? "0 4px" : "8px 16px",
              borderRadius: "6px", fontSize: "13px",
              color: step === "→" ? "#555" : "#ccc",
              border: step === "→" ? "none" : "1px solid #2a2a3a"
            }}>
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
