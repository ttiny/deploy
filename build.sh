#!/bin/bash
if [[ $1 == 'debug' ]]; then
	node-debug ./deploy.js sync bonotel
else
	node ./deploy.js sync bonotel 1.1 -clean
fi