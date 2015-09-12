#!/bin/bash
if [[ $1 == 'debug' ]]; then
	node-debug ./tests/tests.js
else
	node ./tests/tests.js nocolor
fi