#!/bin/bash
# Restart your application server (e.g., using PM2 or a similar tool)
pm2 restart sharedrop || pm2 start dist/index.html --name sharedrop
