from django.urls import path
from . import views

urlpatterns = [
    path('', views.index, name='index'),
    path('info/', views.info, name='info'),
    path('login/<str:username>/<str:password>/', views.login, name='login'),
    path('register/<str:username>/<str:email>/<str:password>/', views.register, name='register'),
    path('user_dashboard/', views.user_dashboard, name='user_dashboard'),
    path('admin_dashboard/', views.admin_dashboard, name='admin_dashboard'),
    path('add_doctor/<str:name>/<str:specialization>/', views.add_doctor, name='add_doctor'),
    path('update_doctor/<int:doctor_id>/<str:name>/<str:specialization>/', views.update_doctor, name='update_doctor'),
    path('delete_doctor/<int:doctor_id>/', views.delete_doctor, name='delete_doctor'),
    path('login_page/', views.login_page, name='login_page'),
    path('register_page/', views.register_page, name='register_page'),
]