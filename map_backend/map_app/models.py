from django.db import models
from django.contrib.gis.db import models as gis_models
from django.contrib.auth.models import User

class DrawnArea(models.Model):
    SHAPE_TYPES = (
        ('polygon', 'Polygon'),
        ('rectangle', 'Rectangle'),
        ('circle', 'Circle'),
    )
    
    SAFETY_LEVELS = (
        ('green', 'Safe'),
        ('yellow', 'Caution'),
        ('red', 'Unsafe'),
    )
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    shape_type = models.CharField(max_length=20, choices=SHAPE_TYPES)
    coordinates = gis_models.PolygonField()  # For polygons and rectangles
    center = gis_models.PointField(null=True, blank=True)  # For circles
    radius = models.FloatField(null=True, blank=True)  # For circles in meters
    safety_level = models.CharField(max_length=10, choices=SAFETY_LEVELS)
    safety_message = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['shape_type']),
            models.Index(fields=['safety_level']),
        ]

class Comment(models.Model):
    drawn_area = models.ForeignKey(DrawnArea, related_name='comments', on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    text = models.TextField()
    author = models.CharField(max_length=50, default='Anonymous')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']