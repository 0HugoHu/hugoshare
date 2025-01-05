#!/bin/bash

# Navigate to the directory
cd /var/www/sharedrop

# Force stop the service (find and kill all processes started by "nf")
pkill -f "nf --procfile=Procfile"

# Ensure the service is stopped
if pgrep -f "nf --procfile=Procfile" > /dev/null; then
  echo "The service could not be stopped."
  exit 1
fi

# Clear the current folder
rm -rf ./*

# Copy the .env file back into the folder
cp /home/.env ./.env

# Install dependencies and build the application
yarn install --frozen-lockfile
yarn build
