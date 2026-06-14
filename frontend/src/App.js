import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import Customers from "./components/Customers";
import Segments  from "./components/Segments";
import Campaigns from "./components/Campaigns";

// ── Global Styles ──
const styles = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', sans-serif; background: #0f0f13; color: #e8e8f0; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #1a1a24; }
  ::-webkit-scrollbar-thumb { background: #7c3aed; border-radius: 3px; }
`;

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard",  icon: "▦" },
  { id: "customers", label: "Customers",  icon: "👥" },
  { id: "segments",  label: "Segments",   icon: "🎯" },
  { id: "campaigns", label: "Campaigns",  icon: "📣" },
];

export default function App() {
  const [active, setActive] = useState("dashboard");

  return (
    <>
      <style>{styles}</style>
      <div style={{ display: "flex", minHeight: "100vh" }}>

        {/* ── Sidebar ── */}
        <aside style={{
          width: "220px", background: "#13131c", borderRight: "1px solid #2a2a3a",
          display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0
        }}>
          {/* Logo */}
          <div style={{ padding: "0 24px 28px", borderBottom: "1px solid #2a2a3a" }}>
            <div style={{ fontSize: "22px", fontWeight: 700, color: "#a78bfa", letterSpacing: "-0.5px" }}>
              ✦ Xeno CRM
            </div>
            <div style={{ fontSize: "11px", color: "#666", marginTop: "4px" }}>AI-Native Marketing</div>
          </div>

          {/* Nav Links */}
          <nav style={{ padding: "16px 12px", flex: 1 }}>
            {NAV_ITEMS.map(item => (
              <button key={item.id} onClick={() => setActive(item.id)} style={{
                width: "100%", display: "flex", alignItems: "center", gap: "10px",
                padding: "10px 12px", borderRadius: "8px", border: "none", cursor: "pointer",
                marginBottom: "4px", fontSize: "14px", fontWeight: active === item.id ? 600 : 400,
                background: active === item.id ? "#2d1b69" : "transparent",
                color: active === item.id ? "#a78bfa" : "#888",
                transition: "all 0.15s"
              }}>
                <span style={{ fontSize: "16px" }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          {/* Footer */}
          <div style={{ padding: "16px 24px", borderTop: "1px solid #2a2a3a" }}>
            <div style={{ fontSize: "11px", color: "#555" }}>Powered by Groq AI</div>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
          {active === "dashboard" && <Dashboard onNavigate={setActive} />}
          {active === "customers" && <Customers />}
          {active === "segments"  && <Segments  />}
          {active === "campaigns" && <Campaigns />}
        </main>
      </div>
    </>
  );
}
