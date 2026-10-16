# Notification Delivery Flow — Outbox → RabbitMQ → notification-service

End-to-end path from a backend domain action queuing a notification through to
the email being sent and delivery status being reported back — including the
DLQ retry path and the two independent feedback loops.

**notification-service has its own PostgreSQL database, separate from the
backend's.** The two services never share a schema or connection — everything
crosses the boundary via RabbitMQ.

## File map

| Layer | File | Role |
|---|---|---|
| Producer | `backend/src/shared/notifications/notification.publisher.ts` | `publishNotificationSafely()` — entry point for all 49 notification types |
| Outbox table | `backend/prisma/schema.prisma` (`OutboxNotification`) | Transactional outbox, backend's own DB |
| Outbox worker | `backend/src/shared/notifications/outbox.worker.ts` | `FOR UPDATE SKIP LOCKED` claim + publish + retry |
| Main consumer | `notification-service/src/consumers/notificationConsumer.ts` | Binds `notificationQueue`, prefetch 10 |
| DLQ consumer | `notification-service/src/consumers/dlqConsumer.ts` | Binds `notificationQueue.dlq`, prefetch 10 |
| Dispatch | `notification-service/src/consumers/processNotification.ts` | Routes to email channel or cancellation |
| Send + idempotency | `notification-service/src/services/notificationService.ts`, `notificationRepository.ts` | `Notification` table, notification-service's own DB |
| Feedback publish | `notification-service/src/services/feedbackPublisher.ts` | `publishFeedback()` (legacy, student-email-only) + `publishDeliveryFeedback()` (generic) |
| Feedback consume | `backend/src/shared/notifications/communication.feedback.ts` | Updates `StudentCommunicationLog` |
| Delivery consume | `backend/src/shared/notifications/notificationDelivery.consumer.ts` | Upserts `NotificationDelivery` |

## RabbitMQ topology

One exchange, three routing keys, three queues:

| Exchange | Routing key | Queue | Bound by |
|---|---|---|---|
| `notificationExchange` | `notification.send` | `notificationQueue` (DLX → `notificationExchange.dlq`) | `notification-service` |
| `notificationExchange` | `notification.feedback` | `notificationResponseQueue` | `backend` (`communication.feedback.ts`) |
| `notificationExchange` | `notification.delivery` | `notificationDeliveryQueue` | `backend` (`notificationDelivery.consumer.ts`) |

`notification.feedback` only fires for `STUDENT_CUSTOM_EMAIL` sends (legacy
path, updates `StudentCommunicationLog` by id). `notification.delivery` fires
for **any** notification carrying a `notificationKey` (updates
`NotificationDelivery`, upserted by `notificationKey`) — `STUDENT_CUSTOM_EMAIL`
sends trigger both.

## Call flow diagram (flowchart)

```mermaid
flowchart TD
    subgraph Producer["1. PRODUCER (Backend API Service — own DB)"]
        DomainService["Domain Service<br/>Booking / Reschedule / Cancel / Invite"]
        PubSafely["publishNotificationSafely()"]
        OutboxTable[("OutboxNotification Table")]
        OutboxWorker["Outbox Worker<br/>FOR UPDATE SKIP LOCKED"]
        CommLogConsumer["communication.feedback.ts"]
        CommLogTable[("StudentCommunicationLog Table")]
        DeliveryConsumer["notificationDelivery.consumer.ts"]
        DeliveryTable[("NotificationDelivery Table")]
    end

    subgraph Broker["2. BROKER (RabbitMQ — single exchange, 3 routing keys)"]
        MainExchange{{"notificationExchange"}}
        MainQueue["notificationQueue<br/>key: notification.send"]
        DLX["notificationExchange.dlq"]
        DLQ["notificationQueue.dlq"]
        FeedbackQueue["notificationResponseQueue<br/>key: notification.feedback"]
        DeliveryQueue["notificationDeliveryQueue<br/>key: notification.delivery"]
    end

    subgraph Consumer["3. CONSUMER (Notification Service — own DB)"]
        MainConsumer["notificationConsumer.ts<br/>prefetch: 10"]
        DLQConsumer["dlqConsumer.ts<br/>prefetch: 10"]
        ProcessNotif["processNotification()"]
        NotifTable[("Notification Table")]
        TemplateEngine["Handlebars Templates +<br/>Per-Recipient TZ Renderer"]
        Mailer["Mailer Service Nodemailer"]
        PublishFeedback["publishFeedback<br/>STUDENT_CUSTOM_EMAIL only"]
        PublishDelivery["publishDeliveryFeedback<br/>any keyed notification"]
    end

    DomainService -->|1. Business Action| PubSafely
    PubSafely -->|2. Atomic INSERT| OutboxTable
    OutboxTable <-->|3. Batch Claim and Process| OutboxWorker
    OutboxWorker -->|4. Publish, key notification.send| MainExchange
    MainExchange --> MainQueue

    MainQueue -->|5. Deliver Message| MainConsumer
    MainConsumer --> ProcessNotif
    ProcessNotif -->|6. Check idempotency and persist, own DB| NotifTable
    ProcessNotif -->|7. Render Template| TemplateEngine
    TemplateEngine -->|8. Send Email| Mailer

    Mailer -->|Success| Ack["channel.ack()"]
    Mailer -->|Permanent Error or Exhausted| Nack["channel.nack no requeue"]
    Nack -->|Reroute via DLX| DLX
    DLX --> DLQ
    DLQ -->|9. Process Retry| DLQConsumer
    DLQConsumer --> ProcessNotif

    Mailer -->|"if STUDENT_CUSTOM_EMAIL"| PublishFeedback
    Mailer -->|"if notificationKey present"| PublishDelivery
    PublishFeedback -->|10a. Publish, key notification.feedback| MainExchange
    PublishDelivery -->|10b. Publish, key notification.delivery| MainExchange
    MainExchange --> FeedbackQueue
    MainExchange --> DeliveryQueue

    FeedbackQueue -->|11a. Deliver Message| CommLogConsumer
    CommLogConsumer -->|12a. Update by id| CommLogTable

    DeliveryQueue -->|11b. Deliver Message| DeliveryConsumer
    DeliveryConsumer -->|12b. Upsert by notificationKey| DeliveryTable
```

## Related flows

- [Booking creation](./booking-creation.md) — queues `BOOKING_CREATED`/reminder notifications via `publishNotificationSafely()`.
- [Event creation](./event-creation.md)
