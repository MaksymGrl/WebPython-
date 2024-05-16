from typing import List
from fastapi import FastAPI, HTTPException, Depends, status, Body, Query
from pymongo import MongoClient, TEXT
import datetime
import bcrypt
from bson import ObjectId
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI()
app.mount("/static", StaticFiles(directory="public"), name="static")

# MongoDB configuration
client = MongoClient("mongodb://localhost:27017")
db = client.lab1


def serialize_doc(doc):
    """Convert MongoDB document ObjectIds to strings."""
    if isinstance(doc, list):
        return [serialize_doc(item) for item in doc]
    if isinstance(doc, dict):
        return {k: serialize_doc(v) for k, v in doc.items()}
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc


def get_password_hash(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password, hashed_password):
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def initialize():
    # Create text index on doctors collection
    db.doctors.create_index([("name", TEXT), ("specialization", TEXT)])

    # Check if any doctors exist already
    doctor_count = db.doctors.count_documents({})

    if doctor_count == 0:
        # Define initial doctors
        initial_doctors = [
            {"name": "Авербух Леонід Григорович", "specialization": "Кардіологія"},
            {"name": "Єщенко Валентина Миколаївна", "specialization": "Дерматологія"},
            {"name": "Крутько Валерій Семенович", "specialization": "Педіатрія"},
            {"name": "Оксак Григорій Анатолійович", "specialization": "Неврологія"}
        ]
        # Add initial doctors to the database
        db.doctors.insert_many(initial_doctors)

    # Check if there is an admin user, if not create one
    if db.users.count_documents({"role": "admin"}) == 0:
        admin_user = {
            "username": "admin",
            "email": "admin",
            "password_hash": get_password_hash("admin"),
            "role": "admin"
        }
        db.users.insert_one(admin_user)


@app.on_event("startup")
def startup_event():
    initialize()


@app.get("/")
def main():
    return FileResponse("public/index.html")


# Doctors
@app.post("/doctors/", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_doctor(doctor: dict = Body(...)):
    new_doctor = {
        "name": doctor['name'],
        "specialization": doctor['specialization']
    }
    result = db.doctors.insert_one(new_doctor)
    new_doctor['id'] = str(result.inserted_id)
    return serialize_doc(new_doctor)


@app.get("/doctors/", response_model=List[dict])
def read_doctors():
    doctors = list(db.doctors.find({}))
    return serialize_doc(doctors)


@app.get("/doctors/{doctor_id}", response_model=dict)
def read_doctor(doctor_id: str):
    doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if doctor:
        return serialize_doc(doctor)
    raise HTTPException(status_code=404, detail="Doctor not found")


@app.put("/doctors/{doctor_id}", response_model=dict)
def update_doctor(doctor_id: str, doctor_data: dict = Body(...)):
    update_data = {}
    if 'name' in doctor_data:
        update_data['name'] = doctor_data['name']
    if 'specialization' in doctor_data:
        update_data['specialization'] = doctor_data['specialization']
    result = db.doctors.update_one({"_id": ObjectId(doctor_id)}, {"$set": update_data})
    if result.matched_count == 1:
        updated_doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
        return serialize_doc(updated_doctor)
    raise HTTPException(status_code=404, detail="Doctor not found")


@app.delete("/doctors/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: str):
    result = db.doctors.delete_one({"_id": ObjectId(doctor_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")


# New Function: Search doctors by specialization
@app.get("/doctors/specialization/", response_model=List[dict])
def search_doctors_by_specialization(specialization: str = Query(...)):
    doctors = list(db.doctors.find({"specialization": specialization}))
    return serialize_doc(doctors)


# New Function: Text search on doctors
@app.get("/doctors/search/", response_model=List[dict])
def search_doctors(query: str = Query(...)):
    doctors = list(db.doctors.find({"$text": {"$search": query}}))
    return serialize_doc(doctors)


# New Function: Aggregate appointments by doctor
@app.get("/appointments/aggregate_by_doctor", response_model=List[dict])
def aggregate_appointments_by_doctor():
    pipeline = [
        {"$group": {"_id": "$doctor_id", "appointment_count": {"$sum": 1}}},
        {"$lookup": {
            "from": "doctors",
            "localField": "_id",
            "foreignField": "_id",
            "as": "doctor"
        }},
        {"$unwind": "$doctor"},
        {"$project": {
            "_id": 0,
            "doctor_id": "$_id",
            "doctor_name": "$doctor.name",
            "specialization": "$doctor.specialization",
            "appointment_count": 1
        }}
    ]
    result = list(db.appointments.aggregate(pipeline))
    return serialize_doc(result)


# Users
@app.post("/users/", status_code=status.HTTP_201_CREATED)
def create_user(username: str = Body(...), email: str = Body(...), password: str = Body(...)):
    password_hash = get_password_hash(password)
    new_user = {
        "username": username,
        "email": email,
        "password_hash": password_hash,
        "role": "user"
    }
    try:
        result = db.users.insert_one(new_user)
        new_user['id'] = str(result.inserted_id)
        return serialize_doc(new_user)
    except:
        raise HTTPException(status_code=400, detail="Username or email already exists")


@app.get("/users/{user_id}")
def read_user(user_id: str):
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if user:
        return serialize_doc(user)
    raise HTTPException(status_code=404, detail="User not found")


@app.put("/users/{user_id}", response_model=dict)
def update_user(user_id: str, user_data: dict = Body(...)):
    update_data = {}
    if 'username' in user_data:
        update_data['username'] = user_data['username']
    if 'email' in user_data:
        update_data['email'] = user_data['email']
    if 'password' in user_data:
        update_data['password_hash'] = get_password_hash(user_data['password'])
    result = db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update_data})
    if result.matched_count == 1:
        updated_user = db.users.find_one({"_id": ObjectId(user_id)})
        return serialize_doc(updated_user)
    raise HTTPException(status_code=404, detail="User not found")


@app.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: str):
    result = db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    # Cascade delete appointments
    db.appointments.delete_many({"user_id": ObjectId(user_id)})


@app.post("/login/")
def login(username: str = Body(...), password: str = Body(...)):
    user = db.users.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(password, user['password_hash']):
        raise HTTPException(status_code=400, detail="Incorrect password")
    return {"message": "User authenticated successfully", "role": user['role'], "user_id": str(user['_id'])}


# New Function: Get a user's appointments
@app.get("/users/{user_id}/appointments", response_model=List[dict])
def get_user_appointments(user_id: str):
    pipeline = [
        {"$match": {"user_id": ObjectId(user_id)}},
        {"$lookup": {
            "from": "doctors",
            "localField": "doctor_id",
            "foreignField": "_id",
            "as": "doctor"
        }},
        {"$unwind": "$doctor"},
        {"$project": {
            "id": {"$toString": "$_id"},
            "doctor_name": "$doctor.name",
            "appointment_time": 1
        }}
    ]
    appointments = list(db.appointments.aggregate(pipeline))
    return serialize_doc(appointments)


# Appointments
@app.get("/appointments/{appointment_id}")
def read_appointment(appointment_id: str):
    appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
    if appointment:
        return serialize_doc(appointment)
    raise HTTPException(status_code=404, detail="Appointment not found")


@app.get("/doctors/{doctor_id}/occupied_times", response_model=List[dict])
def get_occupied_times(doctor_id: str, date: str = Query(...)):
    try:
        date_parsed = datetime.datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, please use YYYY-MM-DD format.")

    start_of_day = datetime.datetime.combine(date_parsed, datetime.time(0, 0))
    end_of_day = datetime.datetime.combine(date_parsed, datetime.time(23, 59))

    occupied_times = list(db.appointments.find({
        "doctor_id": ObjectId(doctor_id),
        "appointment_time": {"$gte": start_of_day, "$lt": end_of_day}
    }, {"appointment_time": 1, "appointment_end_time": 1}))

    return serialize_doc(occupied_times)

@app.post("/appointments/", status_code=status.HTTP_201_CREATED)
def create_appointment(user_id: str = Body(...), doctor_id: str = Body(...), appointment_time: str = Body(...),
                       duration: int = Body(...)):
    # Check if the user exists
    user = db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if the doctor exists
    doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Parse the appointment time
    try:
        parsed_time = datetime.datetime.fromisoformat(appointment_time)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format, please use ISO 8601 format.")

    # Check if the appointment time is in the future
    if parsed_time <= datetime.datetime.now():
        raise HTTPException(status_code=400, detail="Appointment time must be in the future")

    # Check if the appointment is within working hours (8:00 AM to 6:00 PM)
    if parsed_time.hour < 8 or parsed_time.hour >= 18:
        raise HTTPException(status_code=400,
                            detail="Appointment time must be within working hours (8:00 AM to 6:00 PM)")

    # Calculate the end time of the appointment
    end_time = parsed_time + datetime.timedelta(minutes=duration)

    # Check if the doctor is available at the chosen time
    overlapping_appointments = db.appointments.count_documents({
        "doctor_id": ObjectId(doctor_id),
        "$or": [
            {"appointment_time": {"$lt": end_time, "$gte": parsed_time}},
            {"appointment_end_time": {"$lt": end_time, "$gte": parsed_time}}
        ]
    })

    if overlapping_appointments > 0:
        raise HTTPException(status_code=400, detail="The doctor is not available at the chosen time")

    # Create the appointment
    new_appointment = {
        "user_id": ObjectId(user_id),
        "doctor_id": ObjectId(doctor_id),
        "appointment_time": parsed_time,
        "appointment_end_time": end_time,
        "duration": duration
    }
    result = db.appointments.insert_one(new_appointment)
    new_appointment['id'] = str(result.inserted_id)
    return serialize_doc(new_appointment)