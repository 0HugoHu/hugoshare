#!/bin/bash

# Check if the user has Docker access (ensure ec2-user is in the Docker group)
if ! groups ec2-user | grep &>/dev/null '\bdocker\b'; then
  echo "ec2-user is not in the docker group. Please add ec2-user to the docker group and restart the session."
  exit 1
fi

# Stop and remove the existing container if it exists
docker stop my-app-container || true
docker rm my-app-container || true

# Login to AWS ECR
echo "Logging into AWS ECR..."
aws ecr get-login-password --region us-east-2 | docker login --username AWS --password-stdin 329599616303.dkr.ecr.us-east-2.amazonaws.com
if [ $? -ne 0 ]; then
  echo "AWS ECR login failed. Exiting script."
  exit 1
fi

# Pull the latest image from ECR
echo "Pulling the latest Docker image from ECR..."
docker pull 329599616303.dkr.ecr.us-east-2.amazonaws.com/hugoshare:latest
if [ $? -ne 0 ]; then
  echo "Failed to pull Docker image. Exiting script."
  exit 1
fi

# Run the new container
echo "Running the new Docker container..."
docker run -d --name my-app-container -p 80:8080 329599616303.dkr.ecr.us-east-2.amazonaws.com/hugoshare:latest
if [ $? -ne 0 ]; then
  echo "Failed to run the Docker container. Exiting script."
  exit 1
fi

echo "Docker container is up and running successfully!"
