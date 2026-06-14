import axios from "axios";

// Backend ka base URL
const API = axios.create({
  baseURL: "http://localhost:8000",
  headers: { "Content-Type": "application/json" }
});

// ── Customers ──
export const getCustomers    = ()     => API.get("/customers");
export const createCustomer  = (data) => API.post("/customers", data);

// ── Orders ──
export const getOrders       = ()     => API.get("/orders");
export const createOrder     = (data) => API.post("/orders", data);

// ── Segments ──
export const getSegments         = ()          => API.get("/segments");
export const createSegment       = (data)      => API.post("/segments", data);
export const getSegmentCustomers = (id)        => API.get(`/segments/${id}/customers`);

// ── Campaigns ──
export const getCampaigns    = ()     => API.get("/campaigns");
export const createCampaign  = (data) => API.post("/campaigns", data);
export const launchCampaign  = (id)   => API.post(`/campaigns/${id}/launch`);
export const getCampaignStats= (id)   => API.get(`/campaigns/${id}/stats`);

// ── Dashboard ──
export const getDashboard    = ()     => API.get("/dashboard");
