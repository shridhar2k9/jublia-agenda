# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-31 06:39
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0008_auto_20161030_1130'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='is_dirty',
            field=models.BooleanField(default=False),
        ),
    ]