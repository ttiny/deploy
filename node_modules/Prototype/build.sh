#!/bin/bash
if [[ $1 == 'build' ]]; then
	node ./tests/tests.js nocolor
elif [[ $1 == 'tests' ]]; then
	node ./tests/tests.js nocolor
elif [[ $1 == 'debug' ]]; then
	node-debug ./tests/tests.js
fi