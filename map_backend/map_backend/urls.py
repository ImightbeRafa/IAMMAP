from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('map_app.urls')),  # Include your app's URLs
    path('api/', include('map_app.urls')),  # Include API URLs if needed
]