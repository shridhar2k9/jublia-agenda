# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-13 02:02
from __future__ import unicode_literals

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0009_track'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='track',
            field=models.ForeignKey(default=0, on_delete=django.db.models.deletion.CASCADE, to='backend.Track'),
            preserve_default=False,
        ),
    ]
