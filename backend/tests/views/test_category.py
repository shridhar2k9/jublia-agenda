from rest_framework import status
from rest_framework.reverse import reverse

from backend.tests import factory
from backend.tests.helper import *
from .base import BaseAPITestCase


class CategoryViewSetTest(BaseAPITestCase):
    def setUp(self):
        self.user = create_user(factory.user())
        self.agenda = create_agenda(self.user, factory.agenda())
        self.url = reverse('category-list', [self.agenda.pk])

    def test_create(self):
        self.login(self.user)
        category_data = factory.category()
        response = self.client.post(self.url, category_data)
        self.assertCreatedOk(response)

    def test_create_with_tags(self):
        self.login(self.user)
        response = self.client.post(self.url, factory.category({
           'tags': ['Test Tag 1', 'Test Tag 2'],
        }))
        self.assertCreatedOk(response)
        self.assertEqual(2, len(self.agenda.category_set.first().tag_set.all()))

    def test_list(self):
        create_category(self.agenda, factory.category())
        create_category(self.agenda, factory.category(), ['A', 'B', 'C'])
        response = self.client.get(self.url)
        self.assertEqual(2, len(response.data))

    def test_unauthenticated(self):
        self.assert401WhenUnauthenticated(self.url)

    def test_unauthorized(self):
        self.assert403WhenUnauthorized(self.url)


class CategoryDetailTest(BaseAPITestCase):
    def setUp(self):
        self.user = create_user(factory.user())
        self.agenda = create_agenda(self.user, factory.agenda())
        self.category = create_category(self.agenda, factory.category(), ['A', 'B', 'C'])
        self.url = self.category.get_absolute_url()

    def test_retrieve(self):
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(3, len(response.data['tags']))

    def test_patch(self):
        self.login(self.user)
        new_data = factory.category()
        response = self.client.patch(self.url, new_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(new_data['name'], response.data['name'])

    def test_delete(self):
        self.login(self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(0, self.agenda.category_set.count())

    def test_unauthenticated(self):
        self.assert401WhenUnauthenticated(self.url, method='patch')
        self.assert401WhenUnauthenticated(self.url, method='put')
        self.assert401WhenUnauthenticated(self.url, method='delete')

    def test_unauthorized(self):
        self.assert403WhenUnauthorized(self.url, method='patch')
        self.assert403WhenUnauthorized(self.url, method='put')
        self.assert403WhenUnauthorized(self.url, method='delete')


class TagListTest(BaseAPITestCase):
    def setUp(self):
        self.user = create_user(factory.user())
        self.agenda = create_agenda(self.user, factory.agenda())
        self.category = create_category(self.agenda, factory.category())
        self.url = reverse('tag-list', [self.agenda.pk, self.category.pk])

    def test_create(self):
        self.login(self.user)
        tag_data = factory.tag()
        response = self.client.post(self.url, tag_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(1, self.category.tag_set.count())


class TagDetailTest(BaseAPITestCase):
    def setUp(self):
        self.user = create_user(factory.user())
        self.agenda = create_agenda(self.user, factory.agenda())
        self.category = create_category(self.agenda, factory.category(), ['A', 'B', 'C'])
        self.tags = self.category.tag_set.all()
        self.session = create_session(self.agenda, factory.session())
        self.url = self.tags[0].get_absolute_url()

    def test_put(self):
        self.login(self.user)
        tag_data = factory.tag()
        response = self.client.put(self.url, tag_data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(tag_data['name'], self.tags[0].name)

    def test_delete(self):
        self.login(self.user)
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(2, self.category.tag_set.count())

    def test_delete_no_cascade(self):
        self.login(self.user)
        self.session.tags.add(self.tags[0])
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.session.refresh_from_db()

    def test_unauthenticated(self):
        self.assert401WhenUnauthenticated(self.url, method='patch')
        self.assert401WhenUnauthenticated(self.url, method='put')
        self.assert401WhenUnauthenticated(self.url, method='delete')

    def test_unauthorized(self):
        self.assert403WhenUnauthorized(self.url, method='patch')
        self.assert403WhenUnauthorized(self.url, method='put')
        self.assert403WhenUnauthorized(self.url, method='delete')
