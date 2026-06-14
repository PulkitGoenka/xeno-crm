import React, { useState, useEffect } from "react";
import { getCampaigns, getSegments, createCampaign, launchCampaign, getCampaignStats } from "../api";

const inputStyle = {
  background: "#0f0f13", border: "1px solid #2a2a3a", color: "#e8e8f0",
  borderRadius: "8px", padding: "10px 14px", fontSize: "14px", width: "100%", outline: "none"
};

const CHANNELS = ["whatsapp", "sms", "email"];

const STATUS_COLOR = {
  draft:     { bg: "#1e1b4b", color: "#a78bfa" },
  running:   { bg: "#052e16", color: "#34d399" },
  completed: { bg: "#1c1917", color: "#a8a29e" },
};

const StatBar = ({ label, value, total, color }) => {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
        <span style={{ color: "#888" }}>{label}</span>
        <span style={{ color, fontWeight: 600 }}>{value} ({pct.toFixed(0)}%)</span>
      </div>
      <div style={{ height: "6px", background: "#0f0f13", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: "3px", transition: "width 0.5s" }} />
      </div>
    </div>
  );
};

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [segments,  setSegments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msg,       setMsg]       = useState("");
  const [statsMap,  setStatsMap]  = useState({});
  const [showForm,  setShowForm]  = useState(false);

  const [form, setForm] = useState({
    name: "", segment_id: "", message: "", channel: "whatsapp"
  });

  const load = async () => {
    setLoading(true);
    const [cRes, sRes] = await Promise.all([getCampaigns(), getSegments()]);
    setCampaigns(cRes.data);
    setSegments(sRes.data);
    setLoading(false);

    // Load stats for running campaigns
    for (const c of cRes.data) {
      if (c.status === "running") {
        const sRes2 = await getCampaignStats(c.id);
        setStatsMap(prev => ({ ...prev, [c.id]: sRes2.data }));
      }
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.segment_id || !form.channel)
      return setMsg("Name, segment, and channel required!");
    try {
      setMsg(" Creating campaign (AI drafting message if empty)...");
      await createCampaign(form);
      setMsg(" Campaign created! Launch it below.");
      setForm({ name: "", segment_id: "", message: "", channel: "whatsapp" });
      setShowForm(false);
      load();
    } catch (e) {
      setMsg(" " + (e.response?.data?.detail || "Error"));
    }
  };

  const handleLaunch = async (campaignId) => {
    try {
      setMsg("Launching campaign...");
      const res = await launchCampaign(campaignId);
      setMsg(` ${res.data.message}`);
      load();

      // Poll stats every 5 seconds for 1 minute
      let count = 0;
      const interval = setInterval(async () => {
        const sRes = await getCampaignStats(campaignId);
        setStatsMap(prev => ({ ...prev, [campaignId]: sRes.data }));
        count++;
        if (count >= 12) clearInterval(interval);
      }, 5000);

    } catch (e) {
      setMsg("❌ " + (e.response?.data?.detail || "Error"));
    }
  };

 const handleRefreshStats = async (campaignId) => {
    try {
      const res = await getCampaignStats(campaignId);
      setStatsMap(prev => ({ ...prev, [campaignId]: res.data.stats }));
      // Force re-render
      setCampaigns(prev => [...prev]);
    } catch(e) {
      console.error("Stats error:", e);
    }
};
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Campaigns</h1>
          <p style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
            Create and launch personalised campaigns
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: "#7c3aed", border: "none", color: "white",
          borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600
        }}>
          + New Campaign
        </button>
      </div>

      {msg && (
        <div style={{
          padding: "12px 16px", borderRadius: "8px", marginBottom: "16px", fontSize: "14px",
          background: msg.startsWith("✅") ? "#052e16" : msg.startsWith("🤖") || msg.startsWith("🚀") ? "#1e1b4b" : "#2d0a0a",
          color: msg.startsWith("✅") ? "#34d399" : msg.startsWith("🤖") || msg.startsWith("🚀") ? "#a78bfa" : "#f87171",
          border: "1px solid #2a2a3a"
        }}>
          {msg}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div style={{
          background: "#1a1a24", border: "1px solid #7c3aed44", borderRadius: "12px",
          padding: "24px", marginBottom: "24px"
        }}>
          <h3 style={{ color: "#a78bfa", marginBottom: "16px" }}>New Campaign</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <input style={inputStyle} placeholder="Campaign name *"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

            <select style={inputStyle} value={form.segment_id}
              onChange={e => setForm({ ...form, segment_id: e.target.value })}>
              <option value="">Select Segment *</option>
              {segments.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.customer_count} customers)</option>
              ))}
            </select>

            <select style={inputStyle} value={form.channel}
              onChange={e => setForm({ ...form, channel: e.target.value })}>
              {CHANNELS.map(c => (
                <option key={c} value={c}>{c.toUpperCase()}</option>
              ))}
            </select>

            <textarea style={{ ...inputStyle, height: "80px", resize: "vertical" }}
              placeholder="Message (leave empty — AI will draft it automatically 🤖)"
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })} />

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={handleCreate} style={{
                background: "#7c3aed", border: "none", color: "white",
                borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600
              }}>
                Create Campaign
              </button>
              <button onClick={() => setShowForm(false)} style={{
                background: "#333", border: "none", color: "#888",
                borderRadius: "8px", padding: "10px 20px", cursor: "pointer", fontSize: "14px"
              }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {loading ? (
        <div style={{ color: "#666", padding: "40px", textAlign: "center" }}>Loading...</div>
      ) : campaigns.length === 0 ? (
        <div style={{
          background: "#1a1a24", borderRadius: "12px", padding: "60px",
          textAlign: "center", color: "#555", border: "1px solid #2a2a3a"
        }}>
          No campaigns yet. Create your first campaign above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {campaigns.map(c => {
            const stats = statsMap[c.id] || c.stats;
            const total = stats ? Object.values(stats).reduce((a, b) => a + b, 0) : 0;
            const sc    = STATUS_COLOR[c.status] || STATUS_COLOR.draft;

            return (
              <div key={c.id} style={{
                background: "#1a1a24", border: "1px solid #2a2a3a",
                borderRadius: "12px", padding: "20px"
              }}>
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "12px" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
                      <span style={{ fontSize: "16px", fontWeight: 600 }}>{c.name}</span>
                      <span style={{
                        background: sc.bg, color: sc.color,
                        borderRadius: "20px", padding: "2px 10px", fontSize: "12px"
                      }}>{c.status}</span>
                      <span style={{
                        background: "#0f0f13", color: "#888", border: "1px solid #2a2a3a",
                        borderRadius: "20px", padding: "2px 10px", fontSize: "12px"
                      }}>{c.channel.toUpperCase()}</span>
                    </div>
                    <div style={{
                      fontSize: "13px", color: "#777", fontStyle: "italic",
                      background: "#0f0f13", padding: "8px 12px", borderRadius: "6px",
                      maxWidth: "500px"
                    }}>
                      "{c.message}"
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    {c.status === "draft" && (
                      <button onClick={() => handleLaunch(c.id)} style={{
                        background: "#059669", border: "none", color: "white",
                        borderRadius: "8px", padding: "8px 16px", cursor: "pointer",
                        fontSize: "13px", fontWeight: 600
                      }}>
                        🚀 Launch
                      </button>
                    )}
                    {c.status === "running" && (
                      <button onClick={() => handleRefreshStats(c.id)} style={{
                        background: "#0f0f13", border: "1px solid #2a2a3a", color: "#888",
                        borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "13px"
                      }}>
                        ↻ Refresh
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                {statsMap[c.id] && (
                  <div style={{
                    background: "#0f0f13", borderRadius: "8px", padding: "16px",
                    marginTop: "12px", border: "1px solid #1e1e2a"
                  }}>
                    <div style={{ fontSize: "12px", color: "#555", marginBottom: "12px" }}>
                      PERFORMANCE — {total} messages
                    </div>
                    <StatBar label="Delivered" value={stats.delivered || 0} total={total} color="#34d399" />
                    <StatBar label="Opened"    value={stats.opened    || 0} total={total} color="#60a5fa" />
                    <StatBar label="Clicked"   value={stats.clicked   || 0} total={total} color="#f472b6" />
                    <StatBar label="Failed"    value={stats.failed    || 0} total={total} color="#f87171" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
