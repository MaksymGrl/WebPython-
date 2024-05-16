// Get the modals
var loginModal = document.getElementById("loginModal");
var registerModal = document.getElementById("registerModal");
var updateDoctorModal = document.getElementById("updateDoctorModal");

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
    if (event.target == loginModal || event.target == registerModal || event.target == updateDoctorModal) {
        loginModal.style.display = "none";
        registerModal.style.display = "none";
        updateDoctorModal.style.display = "none";
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
            const role = data.role;
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
            updateButton.onclick = function() { showUpdateForm(doctor._id, doctor.name, doctor.specialization); };

            // Add delete button
            const deleteButton = document.createElement('button');
            deleteButton.textContent = 'Delete';
            deleteButton.onclick = function() { deleteDoctor(doctor._id); };

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
    updateDoctorModal.style.display = 'block';
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

// Function to load doctors for the appointment form
function loadDoctorsForAppointment() {
    fetch('/doctors/')
    .then(response => response.json())
    .then(doctors => {
        const doctorSelect = document.getElementById('doctorSelect');
        doctorSelect.innerHTML = ''; // Clear existing options
        doctors.forEach(doctor => {
            const option = document.createElement('option');
            option.value = doctor._id;
            option.textContent = `${doctor.name} - ${doctor.specialization}`;
            doctorSelect.appendChild(option);
        });
    })
    .catch(error => console.error('Error loading doctors:', error));
}

// Event listener for opening the user section which triggers doctor loading
document.getElementById('userSection').addEventListener('open', loadDoctorsForAppointment);


function fetchOccupiedTimes() {
    const doctorId = document.getElementById('doctorSelect').value;
    const dateTime = document.getElementById('appointmentTime').value;

    if (!doctorId || !dateTime) {
        alert('Please select a doctor and date.');
        return;
    }

    // Extract the date portion from the datetime-local input
    const date = dateTime.split('T')[0];

    fetch(`/doctors/${doctorId}/occupied_times?date=${date}`)
    .then(response => response.json())
    .then(times => {
        const list = document.getElementById('occupiedTimesList');
        list.innerHTML = '';  // Clear the list

        if (times.length === 0) {
            const item = document.createElement('li');
            item.textContent = 'No occupied times for the selected date.';
            list.appendChild(item);
        } else {
            times.forEach(time => {
                const item = document.createElement('li');
                const startTime = new Date(time.appointment_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const endTime = new Date(time.appointment_end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                item.textContent = `Occupied from ${startTime} to ${endTime}`;
                list.appendChild(item);
            });
        }
    })
    .catch(error => console.error('Error fetching occupied times:', error));
}
// Function to submit the appointment form
document.getElementById('appointmentForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const doctorId = document.getElementById('doctorSelect').value;
    const appointmentDateTime = document.getElementById('appointmentTime').value;
    const duration = parseInt(document.getElementById('appointmentDuration').value, 10);
    const userId = localStorage.getItem('userId');  // user ID is stored in localStorage


    fetch('/appointments/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            "user_id": userId,
            "doctor_id": doctorId,
            "appointment_time": appointmentDateTime,
            "duration": duration
        })
    })
    .then(response => response.json().then(data => ({status: response.status, body: data})))
    .then(({status, body}) => {
        if (status === 201) {
            alert('Appointment booked successfully!');
        } else {
            alert(`Failed to book appointment: ${body.detail}`);
        }
    })
    .catch(error => {
        console.error('Error booking appointment:', error);
        alert('Failed to book appointment');
    });
});
// Call loadDoctors on admin section access
document.addEventListener('DOMContentLoaded', loadDoctorsAdmin);

// Function to view user profile
function viewUserProfile() {
    const userId = localStorage.getItem('userId');
    fetch(`/users/${userId}`)
    .then(response => response.json())
    .then(user => {
        document.getElementById('profileUsername').textContent = user.username;
        document.getElementById('profileEmail').textContent = user.email;
        document.getElementById('profileInfo').style.display = 'block';
    })
    .catch(error => console.error('Error viewing profile:', error));
}

// Function to show update profile form
function showUpdateProfileForm() {
    document.getElementById('updateProfileForm').style.display = 'block';
}

// Function to update user profile
document.getElementById('updateUserProfileForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const userId = localStorage.getItem('userId');
    const username = document.getElementById('updateProfileUsername').value;
    const email = document.getElementById('updateProfileEmail').value;
    const password = document.getElementById('updateProfilePassword').value;

    const body = { "username": username, "email": email };
    if (password) {
        body.password = password;
    }

    fetch(`/users/${userId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
    })
    .then(response => response.json())
    .then(updatedUser => {
        alert('Profile updated successfully');
        document.getElementById('updateProfileForm').style.display = 'none';
        viewUserProfile();  // Refresh profile info
    })
    .catch(error => {
        console.error('Error updating profile:', error);
        alert('Failed to update profile');
    });
});

// Function to load user appointments
function loadUserAppointments() {
    const userId = localStorage.getItem('userId');
    fetch(`/users/${userId}/appointments`)
    .then(response => response.json())
    .then(appointments => {
        const list = document.getElementById('appointmentsList');
        list.innerHTML = '';  // Clear the list
        appointments.forEach(appointment => {
            const item = document.createElement('li');
            const appointmentTime = new Date(appointment.appointment_time).toLocaleString();
            item.textContent = `Doctor: ${appointment.doctor_name}, Time: ${appointmentTime}`;
            list.appendChild(item);
        });
    })
    .catch(error => console.error('Error loading appointments:', error));
}