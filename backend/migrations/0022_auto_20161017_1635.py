# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-17 16:35
from __future__ import unicode_literals

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0021_auto_20161017_1629'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='viewer',
            unique_together=set([('email', 'agenda')]),
        ),
    ]
