import React, { useState, useEffect } from "react";
import { getCustomers, createCustomer, createOrder } from "../api";

const inputStyle = {
  background: "#0f0f13", border: "1px solid #2a2a3a", color: "#e8e8f0",
  borderRadius: "8px", padding: "10px 14px", fontSize: "14px", width: "100%",
  outline: "none"
};

const btnStyle = (color = "#7c3aed") => ({
  background: color, border: "none", color: "white", borderRadius: "8px",
  padding: "10px 20px", cursor: "pointer", fontSize: "14px", fontWeight: 600
});

export default function Customers() {
  const [customers, setCustomers]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [showOrder, setShowOrder]   = useState(false);
  const [selectedCId, setSelectedCId] = useState("");
  const [msg, setMsg]               = useState("");

  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "" });
  const [orderForm, setOrderForm] = useState({ customer_id: "", amount: "", product_name: "" });

  const load = () => {
    setLoading(true);
    getCustomers()
      .then(res => setCustomers(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleAddCustomer = async () => {
    if (!form.name || !form.email) return setMsg("Name and email required!");
    try {
      await createCustomer(form);
      setMsg("Customer added!");
      setForm({ name: "", email: "", phone: "", city: "" });
      setShowForm(false);
      load();
    } catch (e) {
      setMsg("❌ " + (e.response?.data?.detail || "Error"));
    }
  };

  const handleAddOrder = async () => {
    if (!orderForm.customer_id || !orderForm.amount || !orderForm.product_name)
      return setMsg("All order fields required!");
    try {
      await createOrder({ ...orderForm, amount: parseFloat(orderForm.amount) });
      setMsg(" Order added!");
      setOrderForm({ customer_id: "", amount: "", product_name: "" });
      setShowOrder(false);
      load();
    } catch (e) {
      setMsg("❌ " + (e.response?.data?.detail || "Error"));
    }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700 }}>Customers</h1>
          <p style={{ color: "#666", fontSize: "13px", marginTop: "4px" }}>{customers.length} total customers</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => { setShowOrder(!showOrder); setShowForm(false); }} style={btnStyle("#059669")}>
            + Add Order
          </button>
          <button onClick={() => { setShowForm(!showForm); setShowOrder(false); }} style={btnStyle()}>
            + Add Customer
          </button>
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.startsWith("✅") ? "#052e16" : "#2d0a0a",
          border: `1px solid ${msg.startsWith("✅") ? "#34d399" : "#f87171"}`,
          borderRadius: "8px", padding: "12px 16px", marginBottom: "16px", fontSize: "14px",
          color: msg.startsWith("✅") ? "#34d399" : "#f87171"
        }}>
          {msg}
        </div>
      )}

      {/* Add Customer Form */}
      {showForm && (
        <div style={{
          background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px",
          padding: "24px", marginBottom: "24px"
        }}>
          <h3 style={{ marginBottom: "16px", color: "#a78bfa" }}>New Customer</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            {[
              { key: "name",  placeholder: "Full Name *" },
              { key: "email", placeholder: "Email *" },
              { key: "phone", placeholder: "Phone" },
              { key: "city",  placeholder: "City" },
            ].map(f => (
              <input key={f.key} style={inputStyle} placeholder={f.placeholder}
                value={form[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
            ))}
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button onClick={handleAddCustomer} style={btnStyle()}>Add Customer</button>
            <button onClick={() => setShowForm(false)} style={btnStyle("#333")}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add Order Form */}
      {showOrder && (
        <div style={{
          background: "#1a1a24", border: "1px solid #2a2a3a", borderRadius: "12px",
          padding: "24px", marginBottom: "24px"
        }}>
          <h3 style={{ marginBottom: "16px", color: "#34d399" }}>New Order</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
            <select style={inputStyle} value={orderForm.customer_id}
              onChange={e => setOrderForm({ ...orderForm, customer_id: e.target.value })}>
              <option value="">Select Customer *</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input style={inputStyle} placeholder="Product Name *"
              value={orderForm.product_name}
              onChange={e => setOrderForm({ ...orderForm, product_name: e.target.value })} />
            <input style={inputStyle} placeholder="Amount (₹) *" type="number"
              value={orderForm.amount}
              onChange={e => setOrderForm({ ...orderForm, amount: e.target.value })} />
          </div>
          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button onClick={handleAddOrder} style={btnStyle("#059669")}>Add Order</button>
            <button onClick={() => setShowOrder(false)} style={btnStyle("#333")}>Cancel</button>
          </div>
        </div>
      )}

      {/* Customers Table */}
      {loading ? (
        <div style={{ color: "#666", padding: "40px", textAlign: "center" }}>Loading...</div>
      ) : customers.length === 0 ? (
        <div style={{
          background: "#1a1a24", borderRadius: "12px", padding: "60px",
          textAlign: "center", color: "#555", border: "1px solid #2a2a3a"
        }}>
          No customers yet. Add your first customer above.
        </div>
      ) : (
        <div style={{ background: "#1a1a24", borderRadius: "12px", border: "1px solid #2a2a3a", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#13131c" }}>
                {["Name", "Email", "Phone", "City", "Orders", "Total Spend"].map(h => (
                  <th key={h} style={{
                    padding: "12px 16px", textAlign: "left", fontSize: "12px",
                    fontWeight: 600, color: "#666", textTransform: "uppercase", letterSpacing: "0.5px"
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((c, i) => (
                <tr key={c.id} style={{
                  borderTop: "1px solid #1e1e2a",
                  background: i % 2 === 0 ? "transparent" : "#0f0f1600"
                }}>
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 500 }}>{c.name}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#888" }}>{c.email}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#888" }}>{c.phone || "—"}</td>
                  <td style={{ padding: "12px 16px", fontSize: "13px", color: "#888" }}>{c.city || "—"}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      background: "#1e1b4b", color: "#a78bfa", borderRadius: "20px",
                      padding: "2px 10px", fontSize: "12px"
                    }}>{c.order_count}</span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "#34d399" }}>
                    ₹{c.total_spend?.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
