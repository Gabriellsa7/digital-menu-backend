# Real-time events

Socket.IO shares the HTTP server. Sockets are a **notification channel**: on every event (or reconnect) the front ends refetch the data through REST.

## Connecting

```ts
import { io } from 'socket.io-client';

const socket = io(API_URL, { auth: { token: accessToken } });
socket.on('connect_error', (error) => {
  if (error.message === 'UNAUTHORIZED') {
    // refresh the access token and reconnect
  }
});
```

Without a token the socket is anonymous and only receives public store events.

## Rooms

Rooms come from the token; clients never pick them.

| Room                    | Who joins             | Purpose                                  |
| ----------------------- | --------------------- | ---------------------------------------- |
| `store:public`          | everyone              | store open/closed, sold-out changes      |
| `store:staff`           | staff tokens          | new orders and every order change        |
| `customer:<customerId>` | the customer's tokens | updates to that customer's orders only   |

## Events (server → client)

| Event                          | Rooms                          | Payload                                                                       |
| ------------------------------ | ------------------------------ | ----------------------------------------------------------------------------- |
| `order.created`                | `store:staff`                  | `{ orderId, number, totalInCents, itemsCount, fulfillmentType, createdAt }`   |
| `order.status_changed`         | `store:staff`, `customer:<id>` | `{ orderId, number, status, previousStatus, at, estimatedReadyAt?, reason? }` |
| `order.payment_updated`        | `store:staff`, `customer:<id>` | `{ orderId, paymentStatus }`                                                  |
| `store.status_changed`         | `store:public`                 | `{ isOpenNow, manualStatus, nextOpeningAt?, closesAt? }`                      |
| `product.availability_changed` | `store:public`                 | `{ productId, isAvailable }`                                                  |
| `option.availability_changed`  | `store:public`                 | `{ optionGroupId, optionId, isAvailable }`                                    |

`order.created` is sent when an order becomes `PLACED`: right away for payments on delivery, and only after approval for Pix and online card.

Event names and payload types live in `src/interfaces/ws/ws.events.ts`.

## Scheduled jobs

A tick runner (`src/infrastructure/jobs/tick-runner.ts`) runs every 30 seconds, skipping a job while its previous run is still going:

- `store-status`: resets an expired forced status to `AUTO` (STO-R05) and publishes `store.status_changed` when the store opens or closes.
- `expire-unpaid-orders`: cancels orders still `AWAITING_PAYMENT` after 15 minutes (PAY-R06).
- `pix-auto-approve`: approves pending Pix payments after `PIX_AUTO_APPROVE_SECONDS` (demo, PAY-R02). Off when the variable is `0` or missing.
