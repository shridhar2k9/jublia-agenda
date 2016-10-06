from django.db.transaction import atomic
from rest_framework.exceptions import ValidationError
from rest_framework.serializers import StringRelatedField

from backend.models import Session, Category
from .base import BaseSerializer


class CategorySerializer(BaseSerializer):
    tags = StringRelatedField(many=True)

    @atomic
    def create(self, validated_data):
        tags = validated_data.pop('tags', [])
        category = super().create(validated_data)
        return self._update_tags(category, tags)

    @atomic
    def update(self, instance, validated_data):
        self._update_tags(instance, validated_data.pop('tags', []))
        return super().update(instance, validated_data)

    @staticmethod
    def _update_tags(category, tags):
        category.sync_tags(tags)

    class Meta:
        model = Category
        fields = ('name', 'tags',)


class SessionSerializer(BaseSerializer):
    def validate(self, attrs):
        if 'start_at' in attrs and 'duration' not in attrs and 'duration' not in self.instance:
            raise ValidationError("Start time can only be added when the duration is defined")
        return attrs

    def validate_duration(self, value):
        if value <= 0:
            raise ValidationError("Session duration can't be less than or equal to zero")

    def create(self, validated_data):
        validated_data['agenda'] = self.context['agenda']
        return super().create(validated_data)

    def update(self, instance, validated_data):
        return super().update(instance, validated_data)

    class Meta:
        model = Session
        fields = ('name', 'description', 'start_at', 'duration',)
