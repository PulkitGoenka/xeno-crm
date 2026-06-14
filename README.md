# ✦ Xeno Mini CRM
### AI-Native Mini CRM for Reaching Shoppers

> Built for Xeno Engineering Take-Home Assignment

---

##  What It Does

A mini CRM that helps retail brands intelligently reach their shoppers through:

- **Customer & Order Management** — Store and view shopper data
- **AI-Powered Segmentation** — Describe your audience in plain English, AI converts it to filter rules
- **Personalised Campaigns** — AI drafts messages, sends via WhatsApp/SMS/Email
- **Performance Tracking** — Real-time delivery stats (sent → delivered → opened → clicked)

---

##  Architecture

```
React Frontend (Port 3000)
         ↓
FastAPI CRM Backend (Port 8000) ←→ PostgreSQL
         ↓
Channel Stub Service (Port 8001)
         ↓ async callback (delivered/opened/clicked/failed)
CRM Backend /receipt API
```

### Two-Service Design
The CRM and Channel Service are deliberately separate:
- CRM sends messages to Channel Service
- Channel Service simulates delivery asynchronously
- Callbacks update communication status in real-time

This mirrors how real messaging providers (Twilio, MSG91, Meta) work.

---

##  AI-Native Features

| Feature | How AI Is Used |
|---|---|
| Segment Builder | Natural language → JSON filter rules via Groq (Llama 3.1) |
| Message Drafting | AI writes personalized campaign messages per channel |
| Smart Targeting | AI understands complex filters like "high value inactive customers" |

---

##  Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python + FastAPI |
| Database | PostgreSQL + SQLAlchemy |
| AI | Groq API (Llama 3.1 8b Instant) |
| Frontend | React |
| Channel Stub | Python + FastAPI |
| Deploy | Railway |

---

##  Project Structure

```
xeno-crm/
├── backend/
│   ├── main.py          # All CRM APIs
│   ├── models.py        # Database models
│   ├── database.py      # DB connection
│   ├── seed.py          # Sample data script
│   └── requirements.txt
├── channel-service/
│   ├── main.py          # Stub delivery service
│   └── requirements.txt
└── frontend/
    └── src/
        ├── App.js
        ├── api.js
        └── components/
            ├── Dashboard.jsx
            ├── Customers.jsx
            ├── Segments.jsx
            └── Campaigns.jsx
```

---

##  Local Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Groq API Key (free at groq.com)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt

# Create .env file
DATABASE_URL=postgresql://postgres:password@localhost/xenocrm
GROQ_API_KEY=your_groq_key_here
CHANNEL_SERVICE_URL=http://localhost:8001

# Create database
psql -U postgres -c "CREATE DATABASE xenocrm;"

# Run
python -m uvicorn main:app --reload --port 8000
```

### 2. Channel Service Setup
```bash
cd channel-service
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
CRM_URL=http://localhost:8000

# Run
python -m uvicorn main:app --reload --port 8001
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Seed Sample Data (Optional)
```bash
cd backend
python seed.py
```

---

## 📡 API Endpoints

### Customers
```
POST   /customers              → Add customer
GET    /customers              → List all customers
```

### Orders
```
POST   /orders                 → Add order
GET    /orders                 → List all orders
```

### Segments (AI Powered)
```
POST   /segments               → Create segment from natural language
GET    /segments               → List all segments
GET    /segments/{id}/customers → Preview matching customers
```

### Campaigns
```
POST   /campaigns              → Create campaign (AI drafts message)
POST   /campaigns/{id}/launch  → Launch campaign
GET    /campaigns              → List all campaigns
GET    /campaigns/{id}/stats   → Get performance stats
```

### System
```
POST   /receipt                → Channel service callback
GET    /dashboard              → Dashboard summary stats
```

---

## Campaign Flow

```
1. Marketer creates segment using natural language
   "customers who spent more than 1000 and ordered 3+ times"
         ↓
2. AI converts to filter rules
   {"min_total_spend": 1000, "min_orders": 3}
         ↓
3. Campaign created, AI drafts message
   "Hey! You're one of our top shoppers — here's 20% off just for you 🎁"
         ↓
4. Campaign launched → CRM calls Channel Service for each customer
         ↓
5. Channel Service simulates delivery asynchronously
   → delivered (2-4 sec)
   → opened    (5-12 sec)
   → clicked   (3-8 sec)
         ↓
6. Callbacks update CRM stats in real-time
```

---

## Channel Delivery Simulation

| Channel | Fail Rate | Open Rate | Click Rate |
|---|---|---|---|
| WhatsApp | 5% | 85% | 45% |
| SMS | 10% | 65% | 25% |
| Email | 12% | 35% | 15% |

Retry logic included — failed callbacks retry 3 times with exponential backoff.

---

## Screenshots

> Dashboard, Customers, Segments, and Campaigns views available at localhost:3000

---

## System Design Decisions

**Why two separate services?**
Real messaging providers work via webhooks/callbacks. Separating the channel service mirrors this architecture and allows independent scaling.

**Why Groq over OpenAI?**
Groq offers free tier with fast inference — perfect for this assignment without cost concerns.

**Why FastAPI?**
Async support for background tasks (campaign sending) + automatic Swagger docs at `/docs`.

**Tradeoffs made for this scope:**
- No auth/login system (would add JWT in production)
- In-memory background tasks (would use Celery + Redis at scale)
- Single PostgreSQL instance (would add read replicas at scale)

---

##  Built By

**Pulkit Goenka**
B.Tech CSE, SRM Institute of Science and Technology
