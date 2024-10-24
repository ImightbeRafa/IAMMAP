from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DrawnAreaViewSet,index

router = DefaultRouter()
router.register(r'areas', DrawnAreaViewSet)

urlpatterns = [
    path('', index, name='index'),
    path('api/', include(router.urls)),
]