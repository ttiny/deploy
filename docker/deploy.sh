#!/bin/bash
# run the ssh agent in the background
DEBUG="&>/dev/null"

if [[ -f /app/config/DEBUG ]]; then
	DEBUG=
fi

eval 'eval "$(ssh-agent -s)"' $DEBUG

if [[ -f /app/config/id_rsa ]]; then
	# make sure ssh-add won't complain the key is not secure
	eval chmod 600 /app/config/id_rsa $DEBUG
	# add keys
	eval ssh-add /app/config/id_rsa $DEBUG
fi

# listen for deploy requests
exec node /app/deploy.js "$@"