# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-11-01 10:53
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0012_auto_20161101_1011'),
    ]

    operations = [
        migrations.AddField(
            model_name='agenda',
            name='icon',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.Attachment'),
        ),
        migrations.AddField(
            model_name='speaker',
            name='image',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to='backend.Attachment'),
        ),
    ]
