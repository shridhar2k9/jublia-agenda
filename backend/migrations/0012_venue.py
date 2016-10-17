# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-15 05:25
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0011_auto_20161015_0350'),
    ]

    operations = [
        migrations.CreateModel(
            name='Venue',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('name', models.CharField(max_length=255)),
                ('unit', models.CharField(blank=True, max_length=30)),
                ('agenda', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='backend.Agenda')),
            ],
            options={
                'abstract': False,
            },
        ),
    ]