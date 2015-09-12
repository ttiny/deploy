#!/bin/bash
if [[ $1 == 'debug' ]]; then
	node-debug ./app.js
else
	node ./app.js
fi