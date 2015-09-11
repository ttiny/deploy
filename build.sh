#!/bin/bash
if [[ $1 == 'debug' ]]; then
	CMD=node-debug
else
	CMD=node
fi
DOCKER_HOST=tcp://192.168.99.100:2376 DOCKER_CERT_PATH=/Users/bobi/.docker/machine/machines/default DOCKER_TLS_VERIFY=1 $CMD ./deploy.js build bonotel master
# $CMD ./deploy.js