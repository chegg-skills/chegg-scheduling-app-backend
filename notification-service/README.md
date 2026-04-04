# Notification Service

A microservice for handling email and notification jobs using RabbitMQ.

## Structure
- `src/jobs/` - Consumers for notification queues
- `src/services/` - Email, SMS, and push notification logic
- `src/queues/` - RabbitMQ connection helpers
- `src/templates/` - Email templates
- `src/utils/` - Utilities (logger, config, etc.)

## Usage
- Configure `.env` with your RabbitMQ and email credentials
- Run with `npm install` and `npm start`
