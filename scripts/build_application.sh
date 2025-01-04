#!/bin/bash

cd /var/www/sharedrop
cp /home/.env ./.env
yarn install --frozen-lockfile
yarn build
