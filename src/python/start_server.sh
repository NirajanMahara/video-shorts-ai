#!/bin/bash

# Create temp directory if it doesn't exist
mkdir -p temp

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start the server
echo "Starting video processing server..."
python main.py 