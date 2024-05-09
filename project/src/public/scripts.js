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

// When the user clicks on <span> (x), close the modal
for (let span of spans) {
    span.onclick = function() {
        loginModal.style.display = "none";
        registerModal.style.display = "none";
    }
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
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            alert(data.message); // Display the login status
            const role = data.message.split('role:')[1];
            if (role === 'admin') {
                document.getElementById('adminSection').style.display = 'block';
                document.getElementById('userSection').style.display = 'none';
            } else if (role === 'user') {
                document.getElementById('userSection').style.display = 'block';
                document.getElementById('adminSection').style.display = 'none';
                loadDoctorsForAppointment();
            }
            localStorage.setItem('userId', data.user_id);
            loginModal.style.display = "none";
        }
    })
    .catch(error => {
        alert('Failed to log in');
        console.error('Error:', error);
    });
});

document.getElementById('registerForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission
    const username = document.getElementById('registerUsername').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    fetch('/users/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "username": username,"email": email,"password": password })
    })
    .then(response => response.json())
    .then(data => {
        if (data.username) {
            alert('Registration successful! Username: ' + data.username);
            registerModal.style.display = "none";
        }
    })
    .catch(error => {
        alert('Failed to register');
        console.error('Error:', error);
    });
});

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
            updateButton.textContent = 'Update';
            updateButton.onclick = function() { showUpdateForm(doctor.id, doctor.name, doctor.specialization); };

            // Add delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = function() { deleteDoctor(doctor.id); };

            item.appendChild(updateButton);
            item.appendChild(deleteButton);
            list.appendChild(item);
        });
    })
    .catch(error => console.error('Error loading doctors:', error));
}

// Function to display update form with doctor information
function showUpdateForm(doctorId, name, specialization) {
    document.getElementById('updateDoctorId').value = doctorId;
    document.getElementById('updateDoctorName').value = name;
    document.getElementById('updateDoctorSpecialization').value = specialization;
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
            alert('Failed to delete doctor');
        }
    })
    .catch(error => console.error('Error deleting doctor:', error));
}

document.getElementById('updateDoctorForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const doctorId = document.getElementById('updateDoctorId').value;
    const name = document.getElementById('updateDoctorName').value;
    const specialization = document.getElementById('updateDoctorSpecialization').value;

    fetch(`/doctors/${doctorId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ "name": name,"specialization": specialization })
    })
    .then(response => response.json())
    .then(updatedDoctor => {
        alert('Doctor updated successfully');
        closeModal('updateDoctorModal');
        loadDoctorsAdmin();  // Reload the list to reflect changes
    })
    .catch(error => {
        console.error('Error updating doctor:', error);
        alert('Failed to update doctor');
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
        alert('Appointment booked successfully!');
    })
    .catch(error => {
        console.error('Error booking appointment:', error);
        alert('Failed to book appointment');
    });
});

// Call loadDoctors on admin section access
document.addEventListener('DOMContentLoaded', loadDoctorsAdmin);