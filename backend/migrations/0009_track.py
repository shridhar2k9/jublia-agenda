# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-10 13:01
from __future__ import unicode_literals

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0008_auto_20161010_1122'),
    ]

    operations = [
        migrations.CreateModel(
            name='Track',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=120)),
                ('agenda', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='backend.Agenda')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]
