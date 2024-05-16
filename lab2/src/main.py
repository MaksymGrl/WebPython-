from typing import List

from fastapi import FastAPI, HTTPException, Depends, status, Body
from sqlalchemy.exc import IntegrityError
from sqlalchemy.future import select
import datetime
import bcrypt
from lab2.src.database import *
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

Base.metadata.create_all(bind=engine)

app = FastAPI()
app.mount("/static", StaticFiles(directory="public"), name="static")
# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def initialize(db: Session):
    # Check if any doctors exist already
    doctor_count = db.query(Doctor).count()

    if doctor_count == 0:
        # Define initial doctors
        initial_doctors = [
            {"name": "Авербух Леонід Григорович", "specialization": "Кардіологія"},
            {"name": "Єщенко Валентина Миколаївна", "specialization": "Дерматологія"},
            {"name": "Крутько Валерій Семенович", "specialization": "Педіатрія"},
            {"name": "Оксак Григорій Анатолійович", "specialization": "Неврологія"}
        ]

        # Add initial doctors to the database
        for doc in initial_doctors:
            new_doctor = Doctor(name=doc['name'], specialization=doc['specialization'])
            db.add(new_doctor)

        db.commit()

    # Check if there is an admin user, if not create one
    if db.query(User).filter(User.role == "admin").count() == 0:
        admin_user = User(
            username="admin",
            email="admin",
            password_hash=get_password_hash("admin"),
            role="admin"
        )
        db.add(admin_user)
        db.commit()



@app.on_event("startup")
def startup_event():
    db = SessionLocal()
    try:
        initialize(db)
    finally:
        db.close()


@app.get("/")
def main():
    return FileResponse("public/index.html")


# Doctors
@app.post("/doctors/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_doctor(doctor: dict = Body(...), db: Session = Depends(get_db)):
    new_doctor = Doctor(name=doctor['name'], specialization=doctor['specialization'])
    db.add(new_doctor)
    db.commit()
    db.refresh(new_doctor)
    return {"id": new_doctor.id, "name": new_doctor.name, "specialization": new_doctor.specialization}


@app.get("/doctors/", response_model=List[dict])
def read_doctors(db: Session = Depends(get_db)):
    doctors = db.query(Doctor).all()
    return [{"id": doctor.id, "name": doctor.name, "specialization": doctor.specialization,"user_id": doctor.user_id} for doctor in doctors]


@app.get("/doctors/{doctor_id}", response_model=dict)
def read_doctor(doctor_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if doctor:
        return {"id": doctor.id, "name": doctor.name, "specialization": doctor.specialization}
    raise HTTPException(status_code=404, detail="Doctor not found")


@app.put("/doctors/{doctor_id}", response_model=dict)
def update_doctor(doctor_id: int, doctor_data: dict = Body(...), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if 'name' in doctor_data:
        doctor.name = doctor_data['name']
    if 'specialization' in doctor_data:
        doctor.specialization = doctor_data['specialization']
    if 'user_id' in doctor_data:
        user = db.query(User).filter(User.id == doctor_data['user_id']).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.doctor:
            raise HTTPException(status_code=400, detail="This user is already connected to a doctor")
        if user.patient:
            db.delete(user.patient)
        doctor.user_id = doctor_data['user_id']
    db.commit()
    return {"id": doctor.id, "name": doctor.name, "specialization": doctor.specialization}


@app.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: int, db: Session = Depends(get_db)):
    stmt = select(Doctor).where(Doctor.id == doctor_id)
    result = db.execute(stmt)
    doctor = result.scalars().first()
    if doctor:
        db.delete(doctor)
        db.commit()
    else:
        raise HTTPException(status_code=404, detail="Doctor not found")



# Users

@app.post("/users/", status_code=status.HTTP_201_CREATED)
def create_user(name: str = Body(), age: str = Body(), username: str = Body(...), email: str = Body(...),password: str = Body(...), db: Session = Depends(get_db)):
    password_hash = get_password_hash(password)
    new_user = User(username=username, email=email, password_hash=password_hash)
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Username or email already exists")
    new_patient = Patient(name=name, age=age, user_id=new_user.id)
    db.add(new_patient)
    db.commit()
    return {"id": new_user.id, "username": new_user.username, "email": new_user.email}

@app.get("/users/{user_id}")
def read_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        return {"id": user.id, "username": user.username, "email": user.email}
    raise HTTPException(status_code=404, detail="User not found")

@app.post("/login/")
def login(username: str = Body(...), password: str = Body(...), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=404, detail="Incorrect password")
    return {"message": "User authenticated successfully, role:" + user.role, "user_id": user.id}


@app.get("/patients/{user_id}",response_model=dict)
def get_patient_by_user_id(user_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {"id": patient.id, "name": patient.name, "age": patient.age,"info": patient.info}

@app.get("/patients/", response_model=List[dict])
def read_doctors(db: Session = Depends(get_db)):
    patients = db.query(Patient).all()
    return [{"id": patient.id, "name": patient.name, "user_id": patient.user_id} for patient in patients]



@app.put("/patients/update/{patient_id}",response_model=dict)
def put_patient_by_id(patient_id: int, name: str = Body(...), age: int = Body(...), info: str = Body(...),db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    patient.name = name
    patient.age = age
    patient.info = info
    db.commit()
    return {
        "message": "Patient updated successfully",
        "id": patient.id,
    }


@app.put("/patients/{doctor_id}", response_model=dict)
def update_doctor(doctor_id: int, doctor_data: dict = Body(...), db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    if 'name' in doctor_data:
        doctor.name = doctor_data['name']
    if 'specialization' in doctor_data:
        doctor.specialization = doctor_data['specialization']
    if 'user_id' in doctor_data:
        user = db.query(User).filter(User.id == doctor_data['user_id']).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        if user.doctor:
            raise HTTPException(status_code=400, detail="This user is already connected to a doctor")
        if user.patient:
            db.delete(user.patient)
        doctor.user_id = doctor_data['user_id']
    db.commit()
    return {"id": doctor.id, "name": doctor.name, "specialization": doctor.specialization}


# Appointments
@app.get("/appointments/{appointment_id}")
def read_appointment(appointment_id: int, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if appointment:
        return {
            "id": appointment.id,
            "user_id": appointment.user_id,
            "doctor_id": appointment.doctor_id,
            "appointment_time": appointment.appointment_time.isoformat()
        }
    raise HTTPException(status_code=404, detail="Appointment not found")

@app.get("/appointments/doctor/{doctor_id}", response_model=List[dict])
def get_appointments_for_doctor(doctor_id: int, db: Session = Depends(get_db)):
    appointments = db.query(Appointment).filter(Appointment.doctor_id == doctor_id).all()
    if not appointments:
        raise HTTPException(status_code=404, detail="No appointments found for this doctor")
    return [{"id": appt.id, "user_id": appt.user_id, "doctor_id": appt.doctor_id, "appointment_time": appt.appointment_time.isoformat()} for appt in appointments]

@app.post("/appointments/", status_code=status.HTTP_201_CREATED)
def create_appointment(user_id: int = Body(...), doctor_id: int = Body(...),
                       appointment_time: str = Body(...), db: Session = Depends(get_db)):
    # Check if the user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the doctor exists
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Parse the appointment time
    try:
        parsed_time = datetime.datetime.fromisoformat(appointment_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, please use ISO 8601 format. 2024-05-21T15:30:00 - May 21, 2024, at 3:30 PM.")

    # Create the appointment
    new_appointment = Appointment(
        user_id=user_id,
        doctor_id=doctor_id,
        appointment_time=parsed_time
    )
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)

    return {
        "id": new_appointment.id,
        "user_id": new_appointment.user_id,
        "doctor_id": new_appointment.doctor_id,
        "appointment_time": new_appointment.appointment_time.isoformat()
    }
