#!/bin/bash
if [[ $1 == 'debug' ]]; then
	node-debug ./deploy.js clean,sync bonotel master
else
	node ./deploy.js clean,sync bonotel master
fi