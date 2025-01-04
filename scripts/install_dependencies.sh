#!/bin/bash
cd /var/www/sharedrop
yarn install --frozen-lockfile
yarn build
