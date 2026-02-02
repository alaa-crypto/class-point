# Use official Python image
FROM python:3.10

# Set working directory inside container
WORKDIR /app

# Copy dependency list
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the backend code
COPY . .

# Expose Django port
EXPOSE 8000

# Default command (overridden by docker-compose)
CMD ["daphne", "-b", "0.0.0.0", "-p", "8000", "classpoint.asgi:application"]
