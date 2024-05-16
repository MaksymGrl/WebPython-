// Get the modals
var loginModal = document.getElementById("loginModal");
var registerModal = document.getElementById("registerModal");

// Get the button that opens the modal
var loginBtn = document.getElementById("loginBtn");
var registerBtn = document.getElementById("registerBtn");

// Get the <span> element that closes the modal
var spans = document.getElementsByClassName("close");

// When the user clicks the button, open the modal 
loginBtn.onclick = function() {
    loginModal.style.display = "block";
}

registerBtn.onclick = function() {
    registerModal.style.display = "block";
}


// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
    if (event.target == loginModal || event.target == registerModal) {
        loginModal.style.display = "none";
        registerModal.style.display = "none";
    }
}

document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    fetch('/login/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "username": username,"password": password })
    })
    .then(response => {
        if (!response.ok) {  // Checks if the response status code is not in the range 200-299
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        if (data.message) {
            alert(data.message); // Display the login status
            const role = data.message.split('role:')[1];
            if (role === 'admin') {
                document.getElementById('adminSection').style.display = 'block';
                document.getElementById('doctorSection').style.display = 'none';
                document.getElementById('userSection').style.display = 'none';
            } else if (role === 'user') {
                document.getElementById('userSection').style.display = 'block';
                document.getElementById('doctorSection').style.display = 'none';
                document.getElementById('adminSection').style.display = 'none';
                loadDoctorsForAppointment();
                checkIfDoctor(data.user_id)
                    .then(result => {
                        if (result.isDoctor) {
                            document.getElementById('doctorSection').style.display = 'block';
                            document.getElementById('userSection').style.display = 'none';
                            loadDoctorAppointments();
                        }
                    });
            }
            localStorage.setItem('userId', data.user_id);
            loginModal.style.display = "none";
        }
    })
        .catch(error => {
        alert('Не вдалося увійти');
        console.error('Error:', error);
    });
});



function loadAllPatients() {
    fetch('/patients/')
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch patients');
        return response.json();
    })
    .then(patients => {
        const select = document.getElementById('patientSelect');
        select.innerHTML = '<option value="">Оберіть пацієнта</option>'; // Reset and add default option
        patients.forEach(patient => {
            const option = document.createElement('option');
            option.value = patient.user_id;
            option.textContent = patient.name; 
            select.appendChild(option);
        });
    })
    .catch(error => {
        console.error('Error loading patients:', error);
        alert('Не вдалося завантажити дані пацієнта.');
    });
}

function openPatientListModal() {
    document.getElementById('patientListModal').style.display = 'block';
    loadAllPatients();  // This function should fetch and populate the select dropdown with patients
}


function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function loadPatientInfo(patientId) {
    if (!patientId) return; // Exit if default option is selected

    fetch(`/patients/${patientId}`)
    .then(response => {
        if (!response.ok) throw new Error('Failed to fetch patient');
        return response.json();
    })
    .then(patient => {
        document.getElementById('patientId').value = patient.id;
        document.getElementById('patientName').value = patient.name;
        document.getElementById('patientAge').value = patient.age || ''; // Handle null age
        document.getElementById('patientInfo').value = patient.info || '';
        document.getElementById('patientInfoModal').style.display = 'block'; // Show the modal
    })
    .catch(error => {
        console.error('Error loading patient info:', error);
        alert('Не вдалося завантажити дані пацієнта.');
    });
}

document.getElementById('updatePatientForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const patientId = document.getElementById('patientId').value;
    const name = document.getElementById('patientName').value;
    const age = document.getElementById('patientAge').value;
    const info = document.getElementById('patientInfo').value;

    fetch(`/patients/update/${patientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ "name": name,"age": age,"info": info })
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to update patient');
        alert('Дані оновлено');
        closeModal('patientInfoModal');
        closeModal('patientListModal');
        loadAllPatients(); // Optionally refresh the patient list
    })
    .catch(error => {
        console.error('Error updating patient:', error);
        alert('Не вдалося оновити дані пацієнта.');
    });
});


function checkIfDoctor(userId) {
    return fetch('/doctors/')
    .then(response => response.json())
    .then(doctors => {
        // Find the doctor with a matching user ID
        const doctor = doctors.find(doc => doc.user_id === userId);
        if (doctor) {
            return { isDoctor: true, doctorId: doctor.id }; // Return an object with isDoctor flag and doctorId
        } else {
            return { isDoctor: false }; // Return object indicating not a doctor
        }
    })
    .catch(error => {
        console.error('Error checking doctor status:', error);
        return { isDoctor: false, error: error }; // Return error in case of failure
    });
}


document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;
    const name = document.getElementById('registerName').value;
    const age = document.getElementById('registerAge').value;

    fetch('/users/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({"name": name,"age": age, "username": username,"email": email,"password": password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.username) {
            alert('Реєстрацію успішно завершено! Username: ' + data.username);
            registerModal.style.display = "none";
        }
    })
    .catch(error => {
        alert('Failed to register');
        console.error('Error:', error);
    });
});

function loadDoctorAppointments() {
    const userId = localStorage.getItem("userId");

    // Check if userId is retrieved correctly
    if (!userId) {
        console.error("No user ID found in local storage.");
        alert("Будь ласка, увійдіть, щоб переглянути зустрічі.");
        return; // Prevent further execution
    }

    fetch('/doctors/')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to fetch doctors');
            }
            return response.json();
        })
        .then(doctors => {
            // Filter out any doctors without a user_id and find the one with a matching user_id
            const doctor = doctors.filter(doc => doc.user_id).find(doc => doc.user_id.toString() === userId);
            if (!doctor) {
                throw new Error('No matching doctor found for the current user.');
            }
            return doctor.id;
        })
        .then(doctorId => {
            // Fetch appointments using the found doctorId
            return fetch(`/appointments/doctor/${doctorId}`);
        })
        .then(response => {
            if (!response.ok && response.detail != "No appointments found for this doctor") {
                throw new Error('Failed to fetch appointments');
            }
            return response.json();
        })
        .then(appointments => {
            if (appointments.length === 0) {
                console.log('No appointments found for this doctor.');
            } else {
                console.log('Appointments:', appointments); // Process or display appointments
                displayAppointments(appointments);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert(error.message); 
        });
}

function displayAppointments(appointments) {
    const list = document.getElementById('appointmentList');
    list.innerHTML = ''; // Clear previous entries
    appointments.forEach(appt => {
        fetch(`/patients/${appt.user_id}`)
            .then(response => response.json())
            .then(patient => {
                const item = document.createElement('li');
                item.textContent = `Appointment with ${patient.name} at ${appt.appointment_time}`;
                list.appendChild(item);
            })
            .catch(error => {
                console.error('Error:', error);
            });

    });
}

// Function to add a new doctor
document.getElementById('addDoctorForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const name = document.getElementById('doctorName').value;
    const specialization = document.getElementById('doctorSpecialization').value;

    fetch('/doctors/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, specialization })
    })
    .then(response => response.json())
    .then(data => {
        console.log('Doctor added:', data);
        loadDoctorsAdmin();  // Reload the list of doctors
    })
    .catch(error => console.error('Error adding doctor:', error));
});

// Function to load doctors
function loadDoctorsAdmin() {
    fetch('/doctors/')
    .then(response => response.json())
    .then(doctors => {
        const list = document.getElementById('doctorsList');
        list.innerHTML = '';  // Clear the list
        doctors.forEach(doctor => {
            const item = document.createElement('li');
            item.textContent = `${doctor.name} - ${doctor.specialization} `;

            // Add update button
            const updateButton = document.createElement('button');
            updateButton.textContent = 'Оновити';
            updateButton.onclick = function() { showUpdateForm(doctor.id, doctor.name, doctor.specialization); };

            // Add delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Видалити';
            deleteButton.onclick = function() { deleteDoctor(doctor.id); };

            item.appendChild(updateButton);
            item.appendChild(deleteButton);
            list.appendChild(item);
        });
    })
    .catch(error => console.error('Error loading doctors:', error));
}

// Function to display update form with doctor information
function showUpdateForm(doctorId, name, specialization, userId) {
    document.getElementById('updateDoctorId').value = doctorId;
    document.getElementById('updateDoctorName').value = name;
    document.getElementById('updateDoctorSpecialization').value = specialization;
    document.getElementById('updateDoctorUserId').value = userId || '';  // Set to empty if no user is connected
    document.getElementById('updateDoctorModal').style.display = 'block';
}

// Function to close modals
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Function to send a DELETE request to the backend
function deleteDoctor(doctorId) {
    fetch(`/doctors/${doctorId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            alert('Doctor deleted successfully');
            loadDoctorsAdmin();  // Refresh the list after deletion
        } else {
            alert('Не вдалося видалити лікаря');
        }
    })
    .catch(error => console.error('Error deleting doctor:', error));
}

document.getElementById('updateDoctorForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const doctorId = document.getElementById('updateDoctorId').value;
    const name = document.getElementById('updateDoctorName').value;
    const specialization = document.getElementById('updateDoctorSpecialization').value;
    const userId = document.getElementById('updateDoctorUserId').value;  // Get the user ID from the form

    let payload = {
        "name": name,
        "specialization": specialization
    }; 
    if (userId) {  // Only add userId to the payload if it's not empty
        payload.user_id = userId;
    }
    
    fetch(`/doctors/${doctorId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)  // Use the conditionally constructed payload
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => {
                throw new Error(err.detail);
            });
        }
        return response.json();
    })
    .then(updatedDoctor => {
        alert('Лікар успішно оновився');
        closeModal('updateDoctorModal');
        loadDoctorsAdmin();  // Reload the list to reflect changes
    })
    .catch(error => {
        console.error('Error updating doctor:', error);
        alert('Не вдалося оновити лікаря: ' + error.message);
        closeModal('updateDoctorModal');
    });
});

// User's modal


// Function to load doctors for the appointment form
function loadDoctorsForAppointment() {
    fetch('/doctors/')
    .then(response => response.json())
    .then(doctors => {
        const doctorSelect = document.getElementById('doctorSelect');
        doctorSelect.innerHTML = ''; // Clear existing options
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor.id;
            option.textContent = `${doctor.name} - ${doctor.specialization}`;
            doctorSelect.appendChild(option);
        });
    })
    .catch(error => console.error('Error loading doctors:', error));
}

// Event listener for opening the user section which triggers doctor loading
document.getElementById('userSection').addEventListener('open', loadDoctorsForAppointment);

// Function to submit the appointment form
document.getElementById('appointmentForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const doctorId = document.getElementById('doctorSelect').value;
    const appointmentTime = document.getElementById('appointmentTime').value;
    const userId = localStorage.getItem('userId');  // user ID is stored in localStorage

    fetch('/appointments/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "user_id": userId,
            "doctor_id": doctorId,
            "appointment_time": appointmentTime
        })
    })
    .then(response => response.json())
    .then(appointment => {
        alert('Прийом успішно заброньовано!');
        
    })
    .catch(error => {
        console.error('Error booking appointment:', error);
        alert('Не вдалося записатись на прийом');
    });
});

// Call loadDoctors on admin section access
document.addEventListener('DOMContentLoaded', loadDoctorsAdmin);