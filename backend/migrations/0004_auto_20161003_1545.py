# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-03 15:45
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0003_agenda_profile'),
    ]

    operations = [
        migrations.AlterField(
            model_name='agenda',
            name='date',
            field=models.DateField(blank=True, null=True),
        ),
    ]
