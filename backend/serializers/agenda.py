from django.db.transaction import atomic

from backend.models import Agenda
from .base import BaseSerializer
from .session import SessionViewSerializer
from .speaker import BaseSpeakerSerializer
from .track import BaseTrackSerializer


class BaseAgendaSerializer(BaseSerializer):
    @atomic
    def create(self, validated_data):
        validated_data['profile'] = self.context['user'].profile
        agenda = super().create(validated_data)
        # Create a default track for the new agenda
        track = BaseTrackSerializer(data={}, context={'agenda': agenda})
        track.is_valid(True)
        track.save()
        return agenda

    class Meta:
        model = Agenda
        fields = ('id', 'name', 'location', 'start_at', 'end_at',)


class AgendaSerializer(BaseAgendaSerializer):
    sessions = SessionViewSerializer(many=True, required=False, source='session_set')
    tracks = BaseTrackSerializer(many=True, required=False, source='track_set')
    speakers = BaseSpeakerSerializer(many=True, required=False, source='speaker_set')

    class Meta:
        model = Agenda
        fields = ('id', 'name', 'location', 'start_at', 'end_at', 'sessions', 'tracks', 'speakers',)
