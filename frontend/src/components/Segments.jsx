import React, { useState, useEffect } from "react";
import { getSegments, createSegment, getSegmentCustomers } from "../api";

const inputStyle = {
  background: "#0f0f13", border: "1px solid #2a2a3a", color: "#e8e8f0",
  borderRadius: "8px", padding: "10px 14px", fontSize: "14px", width: "100%", outline: "none"
};

const EXAMPLES = [
  "customers who spent more than 1000",
  "customers who ordered at least 3 times",
  "customers from Delhi",
  "customers who haven't ordered in 30 days",
  "customers who spent between 500 and 2000",
];

export default function Segments() {
  const [segments, setSegments] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [msg, setMsg]           = useState("");
  const [preview, setPreview]   = useState(null);

  const [form, setForm] = useState({ name: "", natural_language: "" });

  const load = () => {
    setLoading(true);
    getSegments()
      .then(res => setSegments(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.natural_language) return setMsg("Both fields required!");
    setCreating(true);
    setMsg("🤖 AI is generating segment rules...");
    try {
      const res = await createSegment(form);
      setMsg(`✅ Segment created! ${res.data.preview_count} customers match.`);
      setForm({ name: "", natural_language: "" });
      load();
    } catch (e) {
      setMsg("❌ " + (e.response?.data?.detail || "Error"));
    } finally {
      setCreating(false);
    }
  };

  const handlePreview = async (segmentId, segmentName) => {
    try {
      const res = await getSegmentCustomers(segmentId);
      setPreview({ name: segmentName, ...res.data });
    } catch (e) {
      setMsg("❌ Could not load preview");
    }
  };

  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Segments</h1>
        <p style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>
          Describe your audience in plain English — AI converts it to rules
        </p>
      </div>

      {/* Create Segment */}
      <div style={{
        background: "#1a1a24", border: "1px solid #7c3aed44", borderRadius: "12px",
        padding: "24px", marginBottom: "24px"
      }}>
        <h3 style={{ marginBottom: "16px", color: "#a78bfa", display: "flex", alignItems: "center", gap: "8px" }}>
          🤖 AI Segment Builder
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <input style={inputStyle} placeholder="Segment name (e.g. High Value Customers)"
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />

          <textarea style={{ ...inputStyle, height: "80px", resize: "vertical" }}
            placeholder="Describe in plain English (e.g. customers who spent more than 1000 and ordered at least twice)"
            value={form.natural_language}
            onChange={e => setForm({ ...form, natural_language: e.target.value })} />

          {/* Example suggestions */}
          <div>
            <div style={{ fontSize: "12px", color: "#555", marginBottom: "8px" }}>Try an example:</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {EXAMPLES.map(ex => (
                <button key={ex} onClick={() => setForm({ ...form, natural_language: ex })} style={{
                  background: "#0f0f13", border: "1px solid #2a2a3a", color: "#888",
                  borderRadius: "20px", padding: "4px 12px", fontSize: "12px", cursor: "pointer"
                }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleCreate} disabled={creating} style={{
            background: creating ? "#4c1d95" : "#7c3aed", border: "none", color: "white",
            borderRadius: "8px", padding: "12px 24px", cursor: creating ? "not-allowed" : "pointer",
            fontSize: "14px", fontWeight: 600, width: "fit-content"
          }}>
            {creating ? "🤖 Generating rules..." : "Create Segment"}
          </button>
        </div>

        {msg && (
          <div style={{
            marginTop: "12px", padding: "10px 14px", borderRadius: "8px", fontSize: "13px",
            background: msg.startsWith("✅") ? "#052e16" : msg.startsWith("🤖") ? "#1e1b4b" : "#2d0a0a",
            color: msg.startsWith("✅") ? "#34d399" : msg.startsWith("🤖") ? "#a78bfa" : "#f87171",
            border: `1px solid ${msg.startsWith("✅") ? "#34d39944" : msg.startsWith("🤖") ? "#7c3aed44" : "#f8717144"}`
          }}>
            {msg}
          </div>
        )}
      </div>

      {/* Segments List */}
      {loading ? (
        <div style={{ color: "#666", padding: "40px", textAlign: "center" }}>Loading...</div>
      ) : segments.length === 0 ? (
        <div style={{
          background: "#1a1a24", borderRadius: "12px", padding: "60px",
          textAlign: "center", color: "#555", border: "1px solid #2a2a3a"
        }}>
          No segments yet. Create your first segment above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {segments.map(s => (
            <div key={s.id} style={{
              background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px", padding: "20px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "16px", fontWeight: 600, marginBottom: "6px" }}>{s.name}</div>
                  <div style={{ fontSize: "13px", color: "#888", fontStyle: "italic", marginBottom: "12px" }}>
                    "{s.description}"
                  </div>

                  {/* Rules as tags */}
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
                    {s.rules && Object.entries(s.rules).map(([k, v]) =>
                      v !== null ? (
                        <span key={k} style={{
                          background: "#1e1b4b", color: "#a78bfa", borderRadius: "20px",
                          padding: "3px 10px", fontSize: "12px"
                        }}>
                          {k.replace(/_/g, " ")}: {v}
                        </span>
                      ) : null
                    )}
                  </div>

                  <span style={{
                    background: "#052e16", color: "#34d399", borderRadius: "20px",
                    padding: "4px 12px", fontSize: "13px", fontWeight: 600
                  }}>
                    {s.customer_count} customers
                  </span>
                </div>

                <button onClick={() => handlePreview(s.id, s.name)} style={{
                  background: "#0f0f13", border: "1px solid #2a2a3a", color: "#888",
                  borderRadius: "8px", padding: "8px 14px", cursor: "pointer", fontSize: "13px"
                }}>
                  Preview →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "#000000cc", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 100
        }} onClick={() => setPreview(null)}>
          <div style={{
            background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "16px",
            padding: "28px", width: "600px", maxHeight: "70vh", overflowY: "auto"
          }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
              <h3 style={{ color: "#a78bfa" }}>{preview.name} — {preview.count} customers</h3>
              <button onClick={() => setPreview(null)} style={{
                background: "none", border: "none", color: "#888", fontSize: "20px", cursor: "pointer"
              }}>✕</button>
            </div>
            {preview.customers?.map(c => (
              <div key={c.id} style={{
                display: "flex", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid #2a2a3a", fontSize: "14px"
              }}>
                <div>
                  <div style={{ fontWeight: 500 }}>{c.name}</div>
                  <div style={{ color: "#666", fontSize: "12px" }}>{c.city || "—"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: "#34d399" }}>₹{c.total_spend?.toLocaleString()}</div>
                  <div style={{ color: "#666", fontSize: "12px" }}>{c.order_count} orders</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
