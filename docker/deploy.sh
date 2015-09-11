#!/bin/bash
# run the ssh agent in the background
eval "$(ssh-agent -s)"

if [[ -f /app/config/id_rsa ]]; then
	# add keys
	ssh-add /app/config/id_rsa
fi

# listen for deploy requests
node /app/deploy.js