from backend import serializers


def create_user(data):
    s = serializers.UserSerializer(data=data)
    s.is_valid(raise_exception=True)
    user = s.save()
    # Mark the user as verified for convenience
    user.profile.is_verified = True
    user.profile.save()
    return user


def create_agenda(user, data, published=True):
    s = serializers.AgendaSerializer(data=data, context={'user': user, 'tracks': []})
    s.is_valid(True)
    agenda = s.save()
    if published:
        agenda.published = True
        agenda.save()
    return agenda


def create_session(agenda, data):
    s = serializers.SessionSerializer(data=data, context={'agenda': agenda})
    s.is_valid(True)
    return s.save()


def create_speaker(agenda, data):
    s = serializers.SpeakerSerializer(data=data, context={'agenda': agenda})
    s.is_valid(True)
    return s.save()


def create_track(agenda, data=None):
    if data is None:
        data = {}
    s = serializers.TrackSerializer(data=data, context={'agenda': agenda})
    s.is_valid(True)
    return s.save()


def create_venue(agenda, data):
    s = serializers.VenueSerializer(data=data, context={'agenda': agenda})
    s.is_valid(True)
    return s.save()


def create_viewer(agenda, data):
    s = serializers.ViewerSerializer(data=data, context={'agenda': agenda})
    s.is_valid(True)
    return s.save()


def create_category(agenda, data, tags=()):
    s = serializers.BaseCategorySerializer(data=data, context={'agenda': agenda, 'tags': tags})
    s.is_valid(True)
    return s.save()


class ErrorDetailMixin:
    def assertIsErrorDetail(self, detail):
        self.assertIsInstance(detail, dict)
        for v in detail.values():
            self.assertFalse(isinstance(v, str))
            for s in v:
                self.assertIsInstance(s, str)
