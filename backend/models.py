from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

Base = declarative_base()

def gen_uuid():
    return str(uuid.uuid4())

 
# CUSTOMER - ek shopper ka record
 
class Customer(Base):
    __tablename__ = "customers"

    id         = Column(String, primary_key=True, default=gen_uuid)
    name       = Column(String, nullable=False)
    email      = Column(String, unique=True, nullable=False)
    phone      = Column(String)
    city       = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)

    orders = relationship("Order", back_populates="customer")

 
# ORDER - customer ka purchase history
 
class Order(Base):
    __tablename__ = "orders"

    id           = Column(String, primary_key=True, default=gen_uuid)
    customer_id  = Column(String, ForeignKey("customers.id"), nullable=False)
    amount       = Column(Float, nullable=False)
    product_name = Column(String, nullable=False)
    ordered_at   = Column(DateTime, default=datetime.utcnow)

    customer = relationship("Customer", back_populates="orders")

 
# SEGMENT - customers ka group (AI se bana)
 
class Segment(Base):
    __tablename__ = "segments"

    id          = Column(String, primary_key=True, default=gen_uuid)
    name        = Column(String, nullable=False)
    description = Column(String)   # natural language input
    rules       = Column(JSON)     # AI ne jo JSON rules banaye
    created_at  = Column(DateTime, default=datetime.utcnow)

 
# CAMPAIGN - ek marketing campaign
 
class Campaign(Base):
    __tablename__ = "campaigns"

    id         = Column(String, primary_key=True, default=gen_uuid)
    name       = Column(String, nullable=False)
    segment_id = Column(String, ForeignKey("segments.id"), nullable=False)
    message    = Column(String, nullable=False)   # AI ne draft kiya
    channel    = Column(String, nullable=False)   # whatsapp / sms / email
    status     = Column(String, default="draft")  # draft / running / completed
    created_at = Column(DateTime, default=datetime.utcnow)

 
# COMMUNICATION - ek customer ko ek message
 
class Communication(Base):
    __tablename__ = "communications"

    id           = Column(String, primary_key=True, default=gen_uuid)
    campaign_id  = Column(String, ForeignKey("campaigns.id"), nullable=False)
    customer_id  = Column(String, ForeignKey("customers.id"), nullable=False)
    message      = Column(String, nullable=False)
    channel      = Column(String, nullable=False)
    status       = Column(String, default="sent")  # sent/delivered/failed/opened/clicked
    sent_at      = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow)
