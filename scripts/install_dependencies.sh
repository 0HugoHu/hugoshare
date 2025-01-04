#!/bin/bash

# Update the package manager and install Node.js and Yarn
sudo dnf update -y

# Install Node.js 22.x
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
sudo dnf install -y nodejs

# Install Yarn and PM2 globally
sudo npm install -g yarn pm2
