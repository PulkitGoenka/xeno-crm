"""
Seed Script - Fake data insert karta hai database mein
Run: python seed.py
"""
import requests
import random

BASE_URL = "http://localhost:8000"

 
# FAKE CUSTOMERS DATA
 
customers = [
    {"name": "Rahul Sharma",   "email": "rahul@gmail.com",   "phone": "9811234567", "city": "Delhi"},
    {"name": "Priya Singh",    "email": "priya@gmail.com",   "phone": "9822345678", "city": "Mumbai"},
    {"name": "Amit Verma",     "email": "amit@gmail.com",    "phone": "9833456789", "city": "Delhi"},
    {"name": "Sneha Patel",    "email": "sneha@gmail.com",   "phone": "9844567890", "city": "Ahmedabad"},
    {"name": "Rohan Gupta",    "email": "rohan@gmail.com",   "phone": "9855678901", "city": "Mumbai"},
    {"name": "Neha Joshi",     "email": "neha@gmail.com",    "phone": "9866789012", "city": "Pune"},
    {"name": "Vikram Yadav",   "email": "vikram@gmail.com",  "phone": "9877890123", "city": "Delhi"},
    {"name": "Ananya Roy",     "email": "ananya@gmail.com",  "phone": "9888901234", "city": "Kolkata"},
    {"name": "Karan Mehta",    "email": "karan@gmail.com",   "phone": "9899012345", "city": "Mumbai"},
    {"name": "Pooja Agarwal",  "email": "pooja@gmail.com",   "phone": "9800123456", "city": "Jaipur"},
]

 
# FAKE PRODUCTS
 
products = [
    ("Nike Air Max",      2499),
    ("Levi's Jeans",      1999),
    ("H&M T-Shirt",        599),
    ("Zara Jacket",       3499),
    ("Adidas Sneakers",   2999),
    ("Puma Hoodie",       1499),
    ("Ray-Ban Sunglasses",4999),
    ("Fastrack Watch",    1899),
    ("Boat Earphones",     999),
    ("Wildcraft Backpack",1299),
]

print("🚀 Seeding database...")
print("=" * 40)

 
# CUSTOMERS INSERT KARO
 
customer_ids = []

for c in customers:
    try:
        res = requests.post(f"{BASE_URL}/customers", json=c)
        if res.status_code == 200:
            cid = res.json()["id"]
            customer_ids.append(cid)
            print(f"✅ Customer: {c['name']}")
        else:
            print(f"⚠️  Skip {c['name']}: {res.json().get('detail', 'already exists')}")
            # Agar already exist karta hai toh ID get karo
            all_customers = requests.get(f"{BASE_URL}/customers").json()
            for existing in all_customers:
                if existing["email"] == c["email"]:
                    customer_ids.append(existing["id"])
                    break
    except Exception as e:
        print(f"❌ Error: {e}")

print(f"\n📦 {len(customer_ids)} customers ready")
print("=" * 40)
 
# ORDERS INSERT KARO
# Har customer ke 1-4 random orders
 
total_orders = 0

for cid in customer_ids:
    num_orders = random.randint(1, 4)
    for _ in range(num_orders):
        product, base_price = random.choice(products)
        # Price thoda random karo
        amount = base_price + random.randint(-200, 500)

        res = requests.post(f"{BASE_URL}/orders", json={
            "customer_id":  cid,
            "amount":       amount,
            "product_name": product
        })

        if res.status_code == 200:
            total_orders += 1

print(f"✅ {total_orders} orders inserted!")
print("=" * 40)


# SEGMENTS BANAO (AI powered)
 
segments = [
    {
        "name": "High Value Customers",
        "natural_language": "customers who spent more than 2000"
    },
    {
        "name": "Frequent Buyers",
        "natural_language": "customers who ordered at least 3 times"
    },
    {
        "name": "Delhi Customers",
        "natural_language": "customers from Delhi"
    },
    {
        "name": "Mumbai VIPs",
        "natural_language": "customers from Mumbai who spent more than 1000"
    },
]

print("\n🤖 Creating AI segments...")
segment_ids = []

for s in segments:
    try:
        res = requests.post(f"{BASE_URL}/segments", json=s)
        if res.status_code == 200:
            data = res.json()
            sid  = data["segment"]["id"]
            count = data["preview_count"]
            segment_ids.append(sid)
            print(f"✅ Segment '{s['name']}': {count} customers match")
        else:
            print(f"❌ Segment error: {res.text}")
    except Exception as e:
        print(f"❌ Error: {e}")

print("=" * 40)
print(f"\n🎉 Database seeded successfully!")
print(f"   Customers : {len(customer_ids)}")
print(f"   Orders    : {total_orders}")
print(f"   Segments  : {len(segment_ids)}")
print(f"\n👉 Ab localhost:3000 pe jao aur campaigns create karo!")