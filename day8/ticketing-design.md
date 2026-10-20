# TicketHub: Design Document

## 1. Requirements

**Functional:** browse events, view a seat map, hold seats, pay, view my tickets.

**Non-functional:**
- **Speed:** pages load in under 1 second, even during a big sale
- **Correctness:** a seat is never sold twice, and nobody pays for a seat they did not get
- **Fairness:** in a big sale everyone gets an equal chance, and holds expire so seats are never locked forever
- **Availability:** stays up during the sale (99.9%)

## 2. Estimates (86,400 seconds per day)

| | Normal day | Big sale (first 10 minutes = 600 s) |
|---|---|---|
| People | 50,000 | 200,000 |
| Requests | 50,000 x 10 pages = 500,000/day = **6 per second** | 200,000 x 10 requests = 2,000,000 = **3,333 per second** |
| Ticket sales | 5,000/day = **0.06 per second** | up to 20,000 / 600 = **33 per second** |

Comparison: the big sale is about **575 times** a normal day, for both requests and sales, and 10 people compete for every seat. So most requests must fail quickly and safely.

## 3. API

| Method | Path | Purpose |
|---|---|---|
| GET | `/events` | Browse events |
| GET | `/events/{id}/seats` | View the seat map with each seat's status |
| POST | `/events/{id}/holds` | Hold seats for 5 minutes (`{"seatIds":[12,13]}`); 201, or 409 if a seat is taken |
| POST | `/orders/{id}/payment` | Pay for a held order; 200, or 410 if the hold expired |
| GET | `/orders` | View my tickets |
| DELETE | `/orders/{id}` | Release a hold early |

## 4. Data model

- **users** (id PK, email UNIQUE, name)
- **events** (id PK, name, venue, starts_at)
- **orders** (id PK, user_id FK, event_id FK, status PENDING/PAID/EXPIRED, total)
- **seats** (id PK, event_id FK, section, row_label, seat_number, price, status AVAILABLE/HELD/SOLD, hold_expires_at, order_id FK or NULL, UNIQUE(event_id, section, row_label, seat_number))

Relationships: a user has many orders; an event has many seats and many orders; an order has many seats, but each seat belongs to at most one order.

## 5. How double-booking is prevented

Each seat is **one database row**, and the database is the only judge (the cache is never used to decide).

1. **Atomic hold.** In one transaction, the app creates a PENDING order and runs, for each seat:
   `UPDATE seats SET status='HELD', order_id=:o, hold_expires_at=now()+5min WHERE id=:s AND (status='AVAILABLE' OR hold_expires_at < now())`
   The database locks the row, so if two people click at once, one update changes 1 row and the other changes **0 rows**. Zero rows means 409 "seat taken".
2. **All or nothing.** If any seat in the request fails, the transaction **rolls back**, so nobody gets half a booking.
3. **Safe payment.** Paying runs `UPDATE seats SET status='SOLD' WHERE order_id=:o AND status='HELD' AND hold_expires_at > now()` in a transaction; it commits only if every seat updates.
4. **Constraints.** One row per seat (UNIQUE) and an `order_id` that holds a single owner mean the database itself refuses a second buyer.
5. **Expiry.** A worker releases expired holds every minute.

## 6. Architecture

```
Client -> DNS -> CDN -> Waiting Room -> Load Balancer
                                            |
                      App Servers (many, auto-scaling) --> Payment Provider
                        |            |            |
                      Cache     Primary DB      Queue --> Worker
                    (seat map)       |      (emails, expired holds)
                                     v
                               Read Replica
```

- **Client:** the browser or app the customer uses.
- **DNS:** finds our servers by name.
- **CDN:** serves pages, images and scripts from nearby so our servers don't.
- **Waiting room:** lets people into the sale at a controlled pace, in the order they arrived, which makes it fair.
- **Load balancer:** spreads traffic over many app servers.
- **App servers:** run the API and can be added fast when a sale starts.
- **Cache:** holds the seat map for 1 to 2 seconds so 3,333 requests per second don't reach the database.
- **Primary database:** the single source of truth for holds, sales and orders.
- **Read replica:** answers browsing queries.
- **Queue and worker:** send confirmation emails and release expired holds without slowing buyers.

**Surviving the big sale:** the waiting room limits traffic, the CDN and cache absorb the reads, app servers scale up before the sale, and only about 33 sales per second reach the primary, which it handles easily.

## 7. Trade-offs

- **Cache freshness vs database load:** a cached seat map can show a seat as free after it is taken, so someone may get a 409, but this protects the database and is safe because the database decides.
- **Hold time (5 minutes):** longer gives buyers time to pay but locks seats other fans want; shorter frees seats faster but rushes people.
- **Waiting room fairness vs convenience:** it is fair and protects the system, but people wait instead of buying instantly.
- **One primary database vs scale:** one primary keeps bookings correct and simple, but all writes go through one machine; 33 per second is far below its limit.
