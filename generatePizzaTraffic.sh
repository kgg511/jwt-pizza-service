#!/bin/bash

# Check if host is provided as a command line argument
if [ -z "$1" ]; then
  echo "Usage: $0 <host>"
  echo "Example: $0 http://localhost:3000"
  exit 1
fi
host=$1

# Function to cleanly exit
cleanup() {
  echo "Terminating background processes..."
  kill $pid2 $pid3 $pid4 $pid5 $pid6 $pid7
  exit 0
}

# Trap SIGINT (Ctrl+C) to execute the cleanup function
trap cleanup SIGINT

# Simulate a user requesting the menu every 3 seconds
# while true; do
#   curl -s "$host/api/order/menu" > /dev/null
#   echo "Requesting menu..."
#   sleep 3
# done &
# pid1=$!

# Simulate a user with an invalid email and password every 25 seconds
while true; do
  curl -s -X PUT "$host/api/auth" -d '{"email":"unknown@jwt.com", "password":"bad"}' -H 'Content-Type: application/json' > /dev/null
  echo "Logging in with invalid credentials..."
  sleep 25
done &
pid2=$!

# Simulate a franchisee logging in every two minutes
while true; do
  response=$(curl -s -X PUT $host/api/auth -d '{"email":"f@jwt.com", "password":"franchisee"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "Login franchisee..."
  sleep 110
  curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  echo "Logging out franchisee..."
  sleep 10
done &
pid3=$!

# Simulate a diner: login, buy pizza 5 times, sleep for 500 seconds, logout, repeat
while true; do
  response=$(curl -s -X PUT $host/api/auth -d '{"email":"d@jwt.com", "password":"diner"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "Login diner..."

  for i in {1..5}; do
    curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H "Authorization: Bearer $token" > /dev/null
    echo "Bought a pizza..."
    sleep 50
  done
  sleep 500
  curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  echo "Logging out diner..."
  sleep 10
done &
pid4=$!


# Simulate a second diner ordering a pizza every 20 seconds
while true; do
  response=$(curl -s -X PUT $host/api/auth -d '{"email":"s@jwt.com", "password":"shoots"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "Login diner..."
  curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H "Authorization: Bearer $token" > /dev/null
  echo "Bought a pizza..."
  sleep 5
  curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  echo "Logging out diner..."
  sleep 5
done &
pid6=$!

#simulate diner failing a pizza order every once in a while
while true; do
  response=$(curl -s -X PUT $host/api/auth -d '{"email":"h@jwt.com", "password":"hoots"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "Login diner..."
  curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 9}]}'  -H "Authorization: Bearer whoopity" > /dev/null
  echo "Bought a pizza BADLY..."
  sleep 100
  curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  echo "Logging out diner..."
  sleep 10
done &
pid5=$!

# Simulate a second diner ordering a pizza every 5 minutes (should be marked inactive)
while true; do
  response=$(curl -s -X PUT $host/api/auth -d '{"email":"z@jwt.com", "password":"z"}' -H 'Content-Type: application/json')
  token=$(echo $response | jq -r '.token')
  echo "Login diner..."
  curl -s -X POST $host/api/order -H 'Content-Type: application/json' -d '{"franchiseId": 1, "storeId":1, "items":[{ "menuId": 1, "description": "Veggie", "price": 0.05 }]}'  -H "Authorization: Bearer $token" > /dev/null
  echo "Bought a pizza..."
  sleep 300
  curl -s -X DELETE $host/api/auth -H "Authorization: Bearer $token" > /dev/null
  echo "Logging out diner..."
  sleep 5
done &
pid7=$!

# Wait for the background processes to complete
wait $pid2 $pid3 $pid4 $pid5 $pid6 $pid7
# $pid1
# $pid1 $pid2 $pid3

# $pid5