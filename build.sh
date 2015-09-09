#!/bin/bash
if [[ $1 == 'debug' ]]; then
	node-debug ./deploy.js sync bonotel master
else
	# node ./deploy.js sync "*" "*"
	node ./deploy.js sync bonotel master
fi