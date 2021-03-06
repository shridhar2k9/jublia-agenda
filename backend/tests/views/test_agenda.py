from django.conf import settings
from django.core import mail
from django.test import override_settings
from rest_framework import status
from rest_framework.reverse import reverse

from backend.models import Registration
from backend.models import Track
from backend.tests import factory
from backend.tests.helper import *
from .base import BaseAPITestCase, DetailAuthTestMixin, clear_media


class AgendaListTest(BaseAPITestCase):
    url = reverse('agenda_list')

    def setUp(self):
        self.user = create_user(factory.user())

    def test_list(self):
        create_agenda(self.user, factory.agenda())
        create_agenda(self.user, factory.agenda(full=True))

        self.login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(2, len(response.data))

        # Agenda list items should not have session data
        self.assertFalse('sessions' in response.data[0])

    def test_list_empty(self):
        self.login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(0, len(response.data))

    def test_create(self):
        self.login(self.user)
        agenda_data = factory.agenda(full=True)
        response = self.client.post(self.url, agenda_data)
        self.assertCreatedOk(response)

        # Checks that end_at is in the data and cleans it for assertEqualExceptMeta
        response.data.pop('end_at')
        # Check that new agendas are unpublished
        self.assertFalse(response.data.pop('published'))
        self.assertEqualExceptMeta(agenda_data, response.data)

    def test_create_with_tracks(self):
        self.login(self.user)
        agenda_data = factory.agenda(data={
            'tracks': ['Test Track', 'Hello World'],
        })
        response = self.client.post(self.url, agenda_data)
        self.assertCreatedOk(response)
        tracks = Track.objects.filter(agenda=response.data['id']).values_list('name', flat=True)
        self.assertIn('Test Track', tracks)
        self.assertIn('Hello World', tracks)

    def test_create_duplicate_title(self):
        self.login(self.user)
        agenda_data = factory.agenda()
        first_response = self.client.post(self.url, agenda_data)
        # Make sure the titles will collide when they are slugified
        agenda_data['name'] += '!'
        second_response = self.client.post(self.url, agenda_data)

        self.assertNotEqual(first_response.data['slug'], second_response.data['slug'])

    @override_settings(MEDIA_ROOT=settings.BASE_DIR + '/backend/tests/media/')
    @clear_media
    def test_create_with_icon(self):
        self.login(self.user)
        attachment = create_attachment(self.user)
        response = self.client.post(self.url, factory.agenda({'icon': attachment.pk}))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn(TEST_IMAGE_NAME, response.data['icon'])

    def test_unauthenticated(self):
        self.assert401WhenUnauthenticated(self.url)


class AgendaDetailTest(DetailAuthTestMixin, BaseAPITestCase):
    def setUp(self):
        self.user = create_user(factory.user())
        self.agenda_data = factory.agenda()
        self.agenda = create_agenda(self.user, self.agenda_data)

        # Session metadata
        self.speaker = create_speaker(self.agenda, factory.speaker())
        self.venue = create_venue(self.agenda, factory.venue())

        self.session = create_session(self.agenda, factory.session(full=True, data={
            'speakers': [self.speaker.pk],
            'venue': self.venue.pk,
        }))
        self.category = create_category(self.agenda, factory.agenda(), ['A', 'B', 'C'])

        self.url = self.agenda.get_absolute_url()

    def assertAgendaCorrect(self, response):
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['name'], self.agenda_data['name'])
        self.assertNoEmptyFields(response.data)

        # Check related fields
        self.assertTrue('sessions' in response.data)
        self.assertTrue('tracks' in response.data)
        self.assertTrue('speakers' in response.data)
        self.assertTrue('session_venues' in response.data)
        self.assertIsInstance(response.data['categories'][0], dict)

        # Check no deep nesting
        session = response.data['sessions'][0]
        self.assertEqual(self.speaker.pk, session['speakers'][0])
        self.assertEqual(list(self.agenda.track_set.values_list('pk', flat=True)), session['tracks'])
        self.assertEqual(self.venue.pk, session['venue'])
        self.assertFalse('sessions' in response.data['tracks'][0])
        self.assertFalse('sessions' in response.data['speakers'][0])
        self.assertFalse('sessions' in response.data['session_venues'][0])

    def test_retrieve(self):
        response = self.client.get(self.url)
        self.assertAgendaCorrect(response)

    def test_retrieve_by_slug(self):
        url = reverse('slug-agenda-detail', [self.agenda.slug])
        response = self.client.get(url)
        self.assertAgendaCorrect(response)

    def test_retrieve_end_at(self):
        self.agenda.start_at = factory.now
        self.agenda.save()
        create_session(self.agenda, factory.session(full=True))
        response = self.client.get(self.url)
        self.assertTrue('end_at' in response.data)

    def test_retrieve_unpublished(self):
        agenda = create_agenda(self.user, factory.agenda(), published=False)
        url = reverse('agenda_detail', [agenda.pk])
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        # Also check each of the component listing isn't available
        for field in ['session', 'track', 'speaker', 'venue']:
            response = self.client.get(reverse(field + '_list', [agenda.pk]))
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

        agenda.published = True
        agenda.save()
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_delete(self):
        self.login(self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)

        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch(self):
        self.login(self.user)
        response = self.client.patch(self.url, {
            'name': 'New Conference Name'
        })
        self.assertTrue(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data['name'], 'New Conference Name')
        self.assertNoEmptyFields(response.data)


class GetDirtySessionTest(BaseAPITestCase):
    count = 10

    def setUp(self):
        self.user = create_user(factory.user())
        self.agenda_data = factory.agenda()
        self.agenda = create_agenda(self.user, self.agenda_data)
        self.url = reverse('dirty_sessions', [self.agenda.pk])
        self.email_count = len(mail.outbox)

        # Create sessions to test with and set their popularity to a non-zero number
        self.sessions = [create_session(self.agenda, factory.session(full=True)) for i in range(self.count)]

    def assertIsDirty(self, index_set):
        for i in index_set:
            self.sessions[i].is_dirty = True
            self.sessions[i].popularity = 10
            self.sessions[i].save()

        self.login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(index_set), len(response.data))
        pk = [i['id'] for i in response.data]
        for i in index_set:
            self.assertIn(self.sessions[i].pk, pk)

    def associate(self, sessions, viewers):
        registrations = []
        for session in sessions:
            for viewer in viewers:
                registrations.append(Registration(session=session, viewer=viewer))
        Registration.objects.bulk_create(registrations)

    def assertSessionChangedMailSent(self, sessions, viewers):
        self.associate(sessions, viewers)
        response = self.client.post(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEmailSent(len(viewers) * 2)  # x2 to account for the signing up email
        emails = mail.outbox[-len(viewers):]
        for email in emails:
            self.assertIn(self.agenda.name, email.subject)
            for session in sessions:
                self.assertIn(session.name, email.body)
        for session in sessions:
            session.refresh_from_db()
            self.assertFalse(session.is_dirty)

    def test_empty(self):
        self.assertIsDirty([])
        self.client.post(self.url)
        self.assertEmailSent(0)

    def test_some_dirty(self):
        self.assertIsDirty([2, 3, 4, 5])

    def test_single_email(self):
        viewer = create_viewer(self.agenda, factory.viewer())
        self.assertIsDirty([0])
        self.assertSessionChangedMailSent(self.sessions[:1], [viewer])

    def test_zero_popularity(self):
        self.sessions[0].popularity = 0
        self.sessions[0].is_dirty = True
        self.sessions[0].save()

        self.login(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data)

    def test_multiple_email(self):
        viewer = create_viewer(self.agenda, factory.viewer())
        self.assertIsDirty(range(self.count))
        self.assertSessionChangedMailSent(self.sessions, [viewer])

    def test_multiple_sessions(self):
        viewers = [create_viewer(self.agenda, factory.viewer()) for i in range(10)]
        self.assertIsDirty([0])
        self.assertSessionChangedMailSent(self.sessions[:1], viewers)

    def test_unauthenticated(self):
        self.assert401WhenUnauthenticated(self.url, method='get')
        self.assert401WhenUnauthenticated(self.url, method='post')

    def test_unauthorized(self):
        self.assert403WhenUnauthorized(self.url, method='get')
        self.assert403WhenUnauthorized(self.url, method='post')
