from rest_framework.fields import CharField

from backend.models import Track
from .base import BaseSerializer
from .session import SessionViewSerializer


class DefaultTrack:
    def set_context(self, field):
        self.agenda = field.context['agenda']

    def __call__(self, *args, **kwargs):
        count = self.agenda.track_set.count()
        return 'Track {}'.format(count + 1)


class BaseTrackSerializer(BaseSerializer):
    name = CharField(default=DefaultTrack())

    def validate(self, attrs):
        attrs['agenda'] = self.context['agenda']
        return super().validate(attrs)

    class Meta:
        model = Track
        fields = ('id', 'name',)


class TrackSerializer(BaseTrackSerializer):
    sessions = SessionViewSerializer(many=True, required=False, source='session_set')

    class Meta:
        model = Track
        fields = ('id', 'name', 'sessions',)
