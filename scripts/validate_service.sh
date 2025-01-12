#!/bin/bash

# Retry mechanism with a delay (e.g., 10 attempts with 5 seconds between each)
for i in {1..10}; do
  if curl -k https://p2p.hugohu.site; then
    echo "Service is up"
    exit 0
  else
    echo "Attempt $i failed, retrying in 5 seconds..."
    sleep 5
  fi
done

echo "Service failed to respond after 10 attempts"
exit 1
