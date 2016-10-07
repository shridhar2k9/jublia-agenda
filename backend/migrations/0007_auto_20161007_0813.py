# -*- coding: utf-8 -*-
# Generated by Django 1.10.1 on 2016-10-07 08:13
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('backend', '0006_auto_20161007_0808'),
    ]

    operations = [
        migrations.AlterField(
            model_name='speaker',
            name='company_description',
            field=models.TextField(blank=True),
        ),
        migrations.AlterField(
            model_name='speaker',
            name='company_url',
            field=models.URLField(blank=True),
        ),
        migrations.AlterField(
            model_name='speaker',
            name='phone_number',
            field=models.CharField(blank=True, max_length=20),
        ),
    ]
