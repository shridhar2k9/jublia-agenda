# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-11-03 09:00
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0013_auto_20161101_1053'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='session',
            name='track',
        ),
        migrations.AddField(
            model_name='session',
            name='tracks',
            field=models.ManyToManyField(to='backend.Track'),
        ),
    ]