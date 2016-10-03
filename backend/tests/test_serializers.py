from django.test import TestCase
from django.utils.datetime_safe import date
from rest_framework.exceptions import ValidationError

from backend.serializers import *
from backend.models import *
from backend.tests.data import user_data, agenda_data


class SerializerTestCase(TestCase):
    def _create_default_user(self):
        return self._create_user(user_data)

    def _create_user(self, data):
        s = UserSerializer(data=data)
        s.is_valid(raise_exception=True)
        user = s.save()
        self.assertIsInstance(user.profile, Profile, 'Profile object not created with user')
        return user


class UserSerializerTest(SerializerTestCase):
    def _patch_user(self, user, data):
        s = UserSerializer(user, data, partial=True)
        s.is_valid(raise_exception=True)
        return s.save()

    def test_create_user(self):
        self._create_user(user_data)

    def test_create_user_with_profile(self):
        self._create_user({
            **user_data,
            'company': 'Hello World Corp.'
        })

    def test_invalid_user(self):
        with self.assertRaises(ValidationError, msg='Invalid email not rejected'):
            self._create_user({
                'email': 'notemail',
                'password': 'password123',
            })

        with self.assertRaises(ValidationError, msg='Password may not be blank'):
            self._create_user({
                'email': 'exmaple@example.com',
                'password': '',
            })

    def test_update_user(self):
        u = self._create_user(user_data)
        u = self._patch_user(u, {'company': 'Test Company'})
        self.assertEqual(u.profile.company, 'Test Company')

        u = self._patch_user(u, {'company': 'Changed Company'})
        self.assertEqual(u.profile.company, 'Changed Company')

        u = self._patch_user(u, {'company': ''})
        self.assertEqual(u.profile.company, '')

    def test_invalid_update(self):
        u = self._create_user(user_data)

        with self.assertRaises(ValidationError):
            self._patch_user(u, {'email': 'invalid-email'})


class AgendaSerializerTest(SerializerTestCase):
    def _create_agenda(self, data):
        user = self._create_default_user()
        s = AgendaSerializer(data=data, context={'user': user})
        s.is_valid(True)
        return s.save()

    def _patch_agenda(self, agenda, data):
        s = AgendaSerializer(instance=agenda, data=data, partial=True)
        s.is_valid(True)
        return s.save()

    def test_create_agenda(self):
        self._create_agenda(agenda_data)

    def test_update_agenda(self):
        agenda = self._create_agenda(agenda_data)

        agenda = self._patch_agenda(agenda, {
            'name': 'Changed Event Name',
        })
        self.assertEqual(agenda.name, 'Changed Event Name')

        now = date.today()
        agenda = self._patch_agenda(agenda, {
            'location': 'Shelton Hotel',
            'date': now.isoformat(),
        })
        self.assertEqual(agenda.date, now)
        self.assertEqual(agenda.location, 'Shelton Hotel')

        self._patch_agenda(agenda, data={
            'location': '',
        })
