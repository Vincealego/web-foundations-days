# SnapShare: Scaling Plan

## 1. Assumptions

- 10 million registered users; 10% are active each day
- Each active user uploads 1 photo and views 50 feed pages per day
- Photo = 2 MB, thumbnail = 50 KB; peak traffic = 5x average
- 86,400 seconds per day; 1 TB = 1,000,000 MB

**Daily active users:** 10,000,000 x 10% = **1,000,000**

## 2. Estimates

- **Uploads per second:** 1,000,000 / 86,400 = **12 average, 58 peak**
- **Feed views per second:** 50,000,000 / 86,400 = **579 average, 2,900 peak**
- **Storage per year:** photos 2 TB/day x 365 = 730 TB; thumbnails 50 GB/day x 365 = 18.25 TB; total **about 748 TB**

## 3. Read-heavy or write-heavy?

**Read-heavy:** 50 million views to 1 million uploads is **50 reads per write**. So we absorb reads with a CDN, cache and read replica, keep writes on one primary database, and do slow work (thumbnails) in the background.

## 4. Why photos are not stored in the database

Photos are huge (2 MB each, 730 TB per year), so storing them in the database would bloat it and make backups slow and costly. They go in **object storage** (such as S3), which is cheap, durable and CDN-friendly. The database holds only small metadata and the photo's URL.

## 5. Architecture diagram

```
Users --(direct upload)--------------------> Object Storage
  |                                             ^   ^   |
  v                                             |   |   | (CDN fetches
 CDN <------------------------------------------+   |   |  on cache miss)
  |                                                 |   |
  v                                           Worker|   |
Load Balancer --> App Servers (3+) --> Queue -------+   |
                    |       |                           |
              reads |       | writes                    |
                    v       v                           |
                 Cache   Primary DB --replicates--> Read Replica
                    |  (miss)                           ^
                    +-----------------------------------+
```

## 6. Components

- **CDN:** Serves photos from servers near users, cutting load time and server traffic.
- **Load balancer:** Spreads requests across app servers so none is overloaded.
- **App servers:** Run the API and feed logic and can be added easily as traffic grows.
- **Cache:** Keeps popular feeds in memory so most reads skip the database.
- **Primary database:** Stores metadata and handles every write.
- **Read replica:** A live copy of the database that answers reads and relieves the primary.
- **Object storage:** Stores photo and thumbnail files cheaply at huge scale.
- **Queue:** Holds thumbnail jobs so an upload finishes without waiting for image processing.
- **Worker:** Takes jobs from the queue and creates thumbnails in the background.

## 7. Upload flow

1. The user taps Upload; the app server checks login, file type and size, and returns a short-lived upload link for object storage.
2. The client uploads the photo **directly to object storage**, so big files never pass through the app servers.
3. The client confirms; the app server saves the metadata (owner, URL, time, status "processing") in the primary database.
4. The app server **publishes a "make thumbnail" job to the queue** and tells the user the upload worked.
5. A **worker** takes the job and downloads the photo from object storage.
6. The worker creates a 50 KB thumbnail and saves it to object storage.
7. The worker sets the photo to "ready" in the database and clears stale cached feeds, so followers now see it through the CDN.

**If the worker fails:** the job is retried a few times; after the last retry it goes to a dead-letter queue and raises an alert. The original photo is already saved, and a job leaves the queue only when finished, so a crashed worker's job is picked up again.

## 8. Trade-offs

- **Replica lag vs immediate consistency:** replicas and caches let us serve 2,900 views per second, but a new photo may appear a few seconds late, which is fine for a feed. A user's own uploads are read from the primary.
- **Cache invalidation vs freshness:** clearing cached feeds on every upload keeps them fresh but costs work, so we expire them quickly and clear only the uploader's feed.
- **Pre-generated thumbnails vs on demand:** thumbnails add only 50 GB per day (about 2.5% of storage) and make feeds fast; making them on demand would save that space but slow every first view.
- **Async thumbnails vs instant:** the queue keeps uploads fast and survives spikes, but thumbnails take a few seconds and there are more parts to monitor.
