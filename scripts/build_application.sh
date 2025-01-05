#!/bin/bash

# Navigate to the directory
cd /var/www/sharedrop

# Copy the .env file back into the folder
cp /home/.env ./.env

# Install dependencies and build the application
yarn install --frozen-lockfile
yarn build
