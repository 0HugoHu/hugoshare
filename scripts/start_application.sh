#!/bin/bash
cd /var/www/sharedrop/dist
pm2 restart sharedrop || pm2 start server.js --name sharedrop
