# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-06 12:34
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0004_auto_20161003_1545'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='session',
            name='end_at',
        ),
        migrations.AddField(
            model_name='session',
            name='duration',
            field=models.IntegerField(blank=True, null=True),
        ),
        migrations.RemoveField(
            model_name='session',
            name='start_at',
        ),
        migrations.AddField(
            model_name='session',
            name='start_at',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
