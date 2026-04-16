export const QUEUE_CONFIG = {
  exchange: process.env.RABBITMQ_EXCHANGE ?? "notificationExchange",
  queue: process.env.RABBITMQ_QUEUE ?? "notificationQueue",
  routingKey: process.env.RABBITMQ_ROUTING_KEY ?? "notification.send",
  dlqExchange: process.env.RABBITMQ_DLQ_EXCHANGE ?? "notificationExchange.dlq",
  dlqQueue: process.env.RABBITMQ_DLQ_QUEUE ?? "notificationQueue.dlq",
  dlqRoutingKey: process.env.RABBITMQ_DLQ_ROUTING_KEY ?? "notification.dlq",
} as const;
