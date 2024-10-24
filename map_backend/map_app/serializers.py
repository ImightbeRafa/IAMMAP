from rest_framework import serializers
from rest_framework_gis.serializers import GeoFeatureModelSerializer
from .models import DrawnArea, Comment

class CommentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Comment
        fields = ['id', 'text', 'author', 'timestamp']
        read_only_fields = ['timestamp']

class DrawnAreaSerializer(GeoFeatureModelSerializer):
    comments = CommentSerializer(many=True, read_only=True)
    
    class Meta:
        model = DrawnArea
        geo_field = 'coordinates'
        fields = ['id', 'shape_type', 'coordinates', 'center', 'radius', 
                 'safety_level', 'safety_message', 'comments', 
                 'created_at', 'updated_at']