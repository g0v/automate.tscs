#!/bin/bash

INDEX=tscs

# Init Influx
curl -XDELETE "http://localhost:9200/$INDEX"
curl -XPOST "http://localhost:9200/$INDEX" -d'
{
     "settings": {
		 "index": {
			"refresh_interval": "5s"
		}
	  },
	"mappings": {
		 "_default_": {
			"properties": {
				  "@timestamp": { "type": "date", "doc_values": true }
			 }
		 }
	}
}'

