# Feature Flow Diagrams

End-to-end sequence diagrams for the platform's core flows — every function call,
every query, every lock, in execution order. Written for onboarding and for
debugging ("where exactly does X happen?").

GitHub renders the Mermaid blocks natively; locally, use the VS Code Mermaid
extension or https://mermaid.live.

| Flow | File | Entry point |
|---|---|---|
| Booking creation (public) | [booking-creation.md](./booking-creation.md) | `POST /api/bookings` |

**Convention for adding a new flow:** one file per flow, named after the user
action (not the module). Keep the file-map table at the top, number the queries
in the diagram, and mark conditional steps with `opt`/`alt`. Update the diagram
in the same PR that changes the flow — a stale diagram is worse than none.
