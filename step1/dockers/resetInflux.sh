#!/bin/bash

INFLUX_DB=tscs

# Init Influx
curl -G http://localhost:8086/query --data-urlencode "q=drop database $INFLUX_DB"
curl -G http://localhost:8086/query --data-urlencode "q=create database $INFLUX_DB"

