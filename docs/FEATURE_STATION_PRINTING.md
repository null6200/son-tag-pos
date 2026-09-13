# Feature Spec — Station Printer Routing

Status: **Not started — spec only.** Captured from a planning conversation on
2026-09-13. Nothing in this file has been built yet.

## What you asked for

When a waiter adds items to an order and hits Send, each item should print
automatically on the correct station printer based on what it is and where
the order was placed — no manual routing by staff, and never duplicated:

- Kitchen items → kitchen printer. Bar items → the bar printer for that
  specific bar (Outdoor Bar vs Indoor/Lounge are separate printers).
- Routing is anchored to the **section the order was placed in** — an order
  placed in Indoor Lounge should never print at the Outdoor Bar printer.
- An admin can **override** a section's printer assignment from Printer
  Settings — e.g. temporarily point Outdoor Bar's tickets at another printer
  if the assigned one is faulty.
- One order can contain items for multiple stations at once (rice + beer +
  shawarma + cocktail) — each item goes to its own station's printer, split
  automatically from the single order.
- Every ticket prints **exactly once** — no duplicate firings on retry/re-send.
- Each ticket carries full order context: station name, place/section,
  waiter, date, time, order items — with per-item cooking/prep notes
  ("make it crunchy," "add extra cheese," etc).
- **Returns print the same way** — a return/refund should produce its own
  ticket(s), routed and laid out the same as an order ticket, so the
  kitchen/bar knows an item was sent back.

## What's already there (good foundation)

Your Prisma schema already models most of the routing relationship:

- `Section` (e.g. "Outdoor Bar", "Indoor Lounge") belongs to a `Branch` and
  links to one `SectionFunction`.
- `SectionFunction` (e.g. "Bar", "Kitchen") is the reusable *role* a section
  plays.
- `ProductType` (e.g. "Food", "Cocktail", "Draft Beer") already links to
  allowed `SectionFunction`s via `ProductTypeAllowedFunction` — i.e. "this
  kind of product is served by this kind of station" already exists as data.
- `Product` → `ProductType`. `Order` → `Section`. `OrderItem` → `Product`.
- `Order` already carries everything a ticket header needs: `orderNumber`,
  `waiterId` / `waiterName`, `sectionId`, `tableId`, `serviceType`,
  `createdAt`.
- **Returns are already modeled as a real `Order`.** `OrdersService.refundItems()`
  creates a new `Order` (status `REFUNDED`) with negative-qty `OrderItem`
  rows for whatever was returned, sharing the original order's `branchId`
  and `sectionId`. That means a return can reuse the exact same routing and
  ticket-building logic as a normal order ticket — it's structurally an
  order already, just with negative quantities.

So the routing logic and the ticket header both lean on data that already
exists, for orders and returns alike. The missing pieces are a `Printer`
concept, the dispatch logic, and two small schema gaps (below).

## What's missing

1. **No `Printer` model at all.** `Settings.jsx` only stores one global
   printer (type + IP/name) for the entire app — not per section/station.
2. **No per-section printer assignment or override/failover mechanism.**
3. **`PrintView.jsx` only drives the browser's native print dialog**
   (`window.print()` on a hidden DOM node). That prints whatever the
   browser/OS defaults to, with a dialog — it cannot silently push a raw
   ticket to a specific thermal printer's IP. Real network/ESC-POS thermal
   printers (typically TCP port 9100) need a raw socket connection, which a
   browser cannot open on its own.
4. **No idempotency/de-dupe guard** — nothing today stops the same ticket
   from firing twice on a retry or double-click.
5. **`OrderItem` has no notes/special-instructions field.** Confirmed:
   adding it — per-item modifiers like "make it crunchy," "extra cheese,"
   "no ice."
6. **The return order (`refundItems`) doesn't copy `waiterId` / `waiterName`
   over from the original order**, and sets `tableId: null` even when the
   original had a table. Both need to carry over so the return ticket header
   isn't missing that info.

## Ticket layout

One ticket per printer per order, showing only that station's items. Same
layout for a regular order and a return — a return ticket is headed
`RETURN` instead of the station name alone, so kitchen/bar staff can't
mistake a return notice for a new item to prepare.

**Order ticket:**
```
============================
          KITCHEN
============================
Place:  Indoor Lounge
Table:  T-12
Order#: 1042
Waiter: Grace A.
Date:   2026-09-13
Time:   19:42
----------------------------
Qty   Item
2x    Grilled Chicken Shawarma
      note: make it crunchy
1x    Jollof Rice (large)
----------------------------
Service: Dine-in
============================
```

**Return ticket** (same order, item sent back):
```
============================
       KITCHEN — RETURN
============================
Place:  Indoor Lounge
Table:  T-12
Order#: 1043 (return of #1042)
Waiter: Grace A.
Date:   2026-09-13
Time:   19:58
----------------------------
Qty   Item
1x    Grilled Chicken Shawarma
----------------------------
Service: Dine-in
============================
```

Field sources:
- Station name (KITCHEN / COCKTAIL / BAR) — the resolved `SectionFunction.name`.
  A return ticket appends " — RETURN" to make it unmistakable.
- Place — the order's `Section.name`.
- Table — `Order.table.name`, omitted for takeaway/no-table orders.
- Order# — `Order.orderNumber`; a return also references the original
  order's number for traceability.
- Waiter — `Order.waiterName`.
- Date / Time — `Order.createdAt`, split into date and time.
- Items — this station's `OrderItem`s only: qty, product name, and item
  note from the new `OrderItem.notes` field.
- Service — `Order.serviceType` (Dine-in, Takeaway, etc.).

Assumption: **no prices on kitchen/bar tickets** — confirmed, it's a
production ticket, not a bill. Same applies to return tickets.

## Proposed design

### Hosting reality
Per `DEPLOYMENT_PER_COMPANY.md`, each company gets its own deployment, and
hosting varies per venue — some backends may run on-site, others in the
cloud. A design that assumes the backend can always reach the venue's LAN
directly would break for any cloud-hosted company. So printing should go
through a **local print bridge at each venue** rather than the backend
opening raw sockets to printers itself — this works identically regardless
of where the backend is hosted.

- Each venue runs a small local bridge (a lightweight local service, or a
  privileged browser tab/terminal already open at the venue) that stays
  connected to the backend over the **socket.io connection you already
  have**.
- The backend resolves routing (which printer(s) an order's items belong to)
  and emits a print job over that socket; the bridge receives it and forwards
  the raw ESC/POS ticket to the actual printer IP on the local network.
- This also means printing keeps working even if a specific browser tab
  closes, as long as the venue's bridge process is running — no dependency on
  which staff member's screen happens to be open.

### Data model additions
- `Printer` — id, name, branchId, ipAddress, port (default 9100), status
  (active/faulty), default link to a `SectionFunction`, optional direct link
  to a specific `Section` (an explicit override always wins over the
  function-level default — this is the "go into printer settings and pick a
  different printer for this section" path).
- `OrderItem.notes` (String?, optional) — per-item modifiers/instructions,
  shown on the ticket under the item line. Applies to both order items and
  return items (same table).
- Resolution order per item: **Section's own printer override (if set) →
  Section's SectionFunction's default printer → flag as unrouted** (surfaced
  to staff rather than silently dropped, if nothing is configured).

### Routing + dispatch logic (on Send / on Refund)
1. For each `OrderItem` (order or return), resolve its target printer via
   `Product → ProductType → SectionFunction` intersected with the order's
   `Section` (each product needs an unambiguous single destination — if a
   product type is currently allowed at more than one function, that needs a
   single default so there's no ambiguity about where it prints).
2. Group the items by resolved printer.
3. Build one ticket per printer using the layout above — order tickets fire
   on order Send; return tickets fire when `refundItems` completes.
4. Dispatch each ticket tagged with an idempotency key (e.g.
   `orderId + printerId + sendBatchId`) so re-sending an order, a retry, or a
   double-click never reprints a ticket that already went out. This is what
   guarantees "one printout, not two." Same idea applies to returns, keyed
   off the return order's id.
5. If a printer is offline/faulty, don't block the rest of the order — flag
   it to staff (e.g. a small "printer offline" indicator) so they know to
   check Printer Settings or manually reprint once it's back, rather than the
   ticket silently vanishing.

## Open questions for later (not blocking the spec)
- What the local bridge process actually is (packaged desktop helper vs. a
  dedicated always-on browser tab) — a build-time decision, not a data-model
  one.

## Not started
This is a genuinely new subsystem (new Prisma model + migration, a routing/
dispatch service, a local print bridge, and Printer Settings UI), plus a
small fix to `refundItems` so return orders carry waiter/table info. Nothing
has been implemented. Pair this with the existing gaps in
`docs/BUG_SCAN_2026-09-13.md` when prioritizing what to build next.
