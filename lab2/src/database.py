from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy import create_engine, Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, scoped_session, Session


DATABASE_URL = "postgresql://postgres:123456@localhost:5432/Lab2"
Base = declarative_base()


engine = create_engine(DATABASE_URL, echo=True)

class Doctor(Base):
    __tablename__ = 'doctors'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    specialization = Column(String)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=True)

    user = relationship('User', back_populates='doctor', uselist=False)

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    role = Column(String, default='user')
    password_hash = Column(String)

    doctor = relationship('Doctor', back_populates='user', uselist=False)
    patient = relationship("Patient", back_populates="user", uselist=False, cascade="all, delete-orphan")

class Appointment(Base):
    __tablename__ = 'appointments'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    doctor_id = Column(Integer, ForeignKey('doctors.id'), nullable=False)
    appointment_time = Column(DateTime)

    user = relationship('User', back_populates='appointments')
    doctor = relationship('Doctor', back_populates='appointments')


class Patient(Base):
    __tablename__ = 'patients'

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    age = Column(Integer)
    info = Column(JSONB, default={})  # JSONB for storing additional dynamic info
    user_id = Column(Integer, ForeignKey('users.id'), unique=True)

    user = relationship("User", back_populates="patient")

User.appointments = relationship('Appointment', back_populates='user', cascade='all, delete')
Doctor.appointments = relationship('Appointment', back_populates='doctor', cascade='all, delete')

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
