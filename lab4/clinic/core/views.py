from django.shortcuts import render, redirect


# Initial doctors list
doctors = [
    {"id": 1, "name": "Авербух Леонід Григорович", "specialization": "Кардіологія"},
    {"id": 2, "name": "Єщенко Валентина Миколаївна", "specialization": "Дерматологія"},
    {"id": 3, "name": "Крутько Валерій Семенович", "specialization": "Педіатрія"},
    {"id": 4, "name": "Оксак Григорій Анатолійович", "specialization": "Неврологія"}
]


users = {
    'user': {'username': 'user', 'password': 'userpass', 'role': 'user'},
    'admin': {'username': 'admin', 'password': 'adminpass', 'role': 'admin'}
}

def login_page(request):
    return render(request, 'login.html')

def register_page(request):
    return render(request, 'register.html')

def index(request):
    return render(request, 'index.html')

def info(request):
    return render(request, 'info.html')

def login(request, username=None, password=None):
    if username and password:
        user = users.get(username)
        if user and user['password'] == password:
            request.session['username'] = username
            request.session['role'] = user['role']
            if user['role'] == 'admin':
                return redirect('admin_dashboard')
            else:
                return redirect('user_dashboard')
    return render(request, 'login.html')

def register(request, username=None, email=None, password=None):
    if username and email and password:
        users[username] = {'username': username, 'password': password, 'role': 'user', 'email': email}
        return redirect('login_page')
    return render(request, 'register.html')

def user_dashboard(request):
    if request.session.get('role') == 'user':
        return render(request, 'user_dashboard.html')
    else:
        return redirect('login')

def admin_dashboard(request):
    if request.session.get('role') == 'admin':
        return render(request, 'admin_dashboard.html', {'doctors': doctors})
    else:
        return redirect('login')

def add_doctor(request, name, specialization):
    new_id = max(doctor['id'] for doctor in doctors) + 1 if doctors else 1
    doctors.append({"id": new_id, "name": name, "specialization": specialization})
    return redirect('admin_dashboard')

def update_doctor(request, doctor_id, name, specialization):
    for doctor in doctors:
        if doctor['id'] == doctor_id:
            doctor['name'] = name
            doctor['specialization'] = specialization
            break
    return redirect('admin_dashboard')

def delete_doctor(request, doctor_id):
    global doctors
    doctors = [doctor for doctor in doctors if doctor['id'] != doctor_id]
    return redirect('admin_dashboard')