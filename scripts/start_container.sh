#!/bin/bash
# Stop and remove the existing container if it exists
docker stop my-app-container || true
docker rm my-app-container || true

# Pull the latest image from ECR
docker pull 329599616303.dkr.ecr.us-east-2.amazonaws.com/hugoshare:latest

# Run the new container
docker run -d --name my-app-container -p 80:8080 329599616303.dkr.ecr.us-east-2.amazonaws.com/hugoshare:latest
