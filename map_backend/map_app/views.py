from rest_framework import viewsets
from .models import Location, Comment
from .serializers import LocationSerializer, CommentSerializer

from django.shortcuts import render

def index(request):
    return render(request, 'map_app/index.html')

class LocationViewSet(viewsets.ModelViewSet):
    queryset = Location.objects.all()
    serializer_class = LocationSerializer

class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer