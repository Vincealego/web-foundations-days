# SnapShare: Scaling Plan

SnapShare is a photo-sharing app where users upload photos and scroll a feed of photos from people they follow.

## 1. Assumptions

- 10 million registered users
- 10% are active each day
- Each active user uploads 1 photo per day
- Each active user views 50 feed pages per day
- An average photo is 2 MB, and each photo also gets a 50 KB thumbnail
- There are 86,400 seconds in a day
- Peak traffic is 5 times the average
- Storage uses decimal units (1 TB = 1,000,000 MB)

**Daily active users (DAU):** 10,000,000 x 10% = **1,000,000 users per day**

## 2. Estimates

### Uploads per second

- Uploads per day: 1,000,000 users x 1 photo = 1,000,000
- Average: 1,000,000 / 86,400 = about **12 uploads per second**
- Peak (5x): about **58 uploads per second**

### Feed views per second

- Feed views per day: 1,000,000 users x 50 = 50,000,000
- Average: 50,000,000 / 86,400 = about **579 views per second**
- Peak (5x): about **2,900 views per second**

### Storage per year

- Photos per day: 1,000,000 x 2 MB = 2 TB
- Thumbnails per day: 1,000,000 x 50 KB = 50 GB
- Photos per year: 2 TB x 365 = **730 TB**
- Thumbnails per year: 50 GB x 365 = **18.25 TB**
- Total: about **748 TB per year** (roughly 0.75 PB)

| Measure | Average | Peak (5x) |
|---|---|---|
| Uploads per second | 12 | 58 |
| Feed views per second | 579 | 2,900 |

| Storage | Per day | Per year |
|---|---|---|
| Photos (2 MB each) | 2 TB | 730 TB |
| Thumbnails (50 KB each) | 50 GB | 18.25 TB |
| Total | about 2.05 TB | about 748 TB |

## 3. Read-heavy or write-heavy?

SnapShare is **read-heavy**. There are 50 million feed views for every 1 million uploads, a ratio of about **50 reads to 1 write**.

What this means for the design:

- Make reads cheap and fast: use a CDN and a cache so most feed requests never reach the database.
- Add a read replica to share the database read load, and keep writes on one primary database.
- Writes are rare and slow work (such as making thumbnails) can happen in the background, so uploads can be handled asynchronously.

## 4. Why photos must not be stored in the database

Photos are large files (2 MB each, 730 TB per year). Storing them in the database would:

- make the database huge, slow and expensive to back up, replicate and scale
- waste the database's fast, costly storage on data it does not need to query
- force every photo download to pass through the database and app servers

Photos should go in **object storage** (such as Amazon S3). It is cheap, almost unlimited, built to store large files, and can be fronted by a CDN. The database stores only small **metadata** (photo id, owner, URL, caption, time), and the photo itself is found through its URL.

## 5. Architecture diagram

```
                      Users (mobile and web)
                               |
                               v
                +------------------------------+
                |             CDN              |  <-- serves photos and
                +------------------------------+      thumbnails close to users
                    |                    |
          (API requests)      (cache miss: fetch image)
                    |                    |
                    v                    |
           +-----------------+           |
           |  Load Balancer  |           |
           +-----------------+           |
              |      |      |            |
              v      v      v            |
          +-----+ +-----+ +-----+        |
          | App | | App | | App |        |
          | srv | | srv | | srv |        |
          +-----+ +-----+ +-----+        |
           |   |      |                  |
     reads |   | writes + upload requests |
           v   v                         |
      +-------+   +----------+           |
      | Cache |   | Primary  |           |
      +-------+   | Database |           |
           |      +----------+           |
           |           |  replication    |
           |           v                 |
           |     +-----------+           |
           +---->| Read      |           |
      (miss)     | Replica   |           |
                 +-----------+           |
                                         |
   Upload path:                          |
   App server --> Queue --> Worker       |
                              |          |
                              v          v
                       +---------------------+
                       |   Object Storage    |
                       | (photos+thumbnails) |
                       +---------------------+
```

Request paths:

- **Viewing the feed:** CDN -> Load Balancer -> App server -> Cache -> (on a miss) Read Replica. Photo files come from the CDN, which fetches from Object Storage when it does not have them.
- **Uploading a photo:** App server -> Object Storage, then Queue -> Worker -> Object Storage (thumbnail) -> Primary Database.

## 6. Components (one sentence each)

- **CDN:** Delivers photos and thumbnails from servers close to each user, which cuts load time and keeps most image traffic away from our servers.
- **Load balancer:** Spreads incoming requests evenly across the app servers so none is overloaded and one failure does not take the app down.
- **App servers:** Run the application logic (login, feed, uploads) and can be added or removed easily because they keep no data of their own.
- **Cache:** Keeps frequently requested data such as popular feeds in fast memory, so repeated reads do not hit the database.
- **Primary database:** Stores the metadata (users, photos, follows) and handles every write so the data stays consistent.
- **Read replica:** Holds a copy of the primary database and answers read queries, taking pressure off the primary.
- **Object storage:** Stores the photo and thumbnail files cheaply and durably at huge scale, which a database cannot do.
- **Queue:** Holds thumbnail jobs so the upload request can finish immediately instead of waiting for slow image processing.
- **Worker:** Takes jobs from the queue and creates the 50 KB thumbnails in the background, and more workers can be added when uploads spike.

## 7. Upload flow, step by step

1. The user picks a photo in the app and taps **Upload**.
2. The request goes through the CDN and load balancer to an app server.
3. The app server checks that the user is logged in and that the file is a valid image within the size limit.
4. The app server sends the photo to **object storage**, which saves the original file and returns its URL.
5. The app server saves the metadata (photo id, owner, URL, time, status "processing") in the **primary database**.
6. The app server adds a "create thumbnail" job to the **queue** and immediately tells the user the upload succeeded.
7. A **worker** takes the job from the queue and downloads the original photo from object storage.
8. The worker resizes the photo into a 50 KB thumbnail and saves it to object storage.
9. The worker updates the photo's row in the database to "ready" with the thumbnail URL, and clears any stale cached feed entries.
10. Followers' feeds now show the new photo, with the thumbnail and photo delivered through the CDN.

### If the worker fails

Thumbnail creation can fail (a corrupt image, a crashed worker, storage briefly unavailable), so the pipeline is built to recover:

- **Retries:** if a job fails, it goes back on the queue and is retried a few times, with a short delay that grows each time.
- **Safe to repeat:** the job always writes the same thumbnail file for a photo, so running it twice does no harm.
- **Dead-letter queue:** after the last retry, the job moves to a separate "failed jobs" queue and an alert is raised so an engineer can look at it, instead of the job being lost.
- **Photo stays usable:** the original photo is already saved and the row stays "processing", so the feed can show the full photo or a placeholder until the thumbnail is ready.
- **Crash recovery:** a worker only removes a job from the queue after it finishes, so if the worker dies halfway, the job reappears and another worker picks it up.

## 8. Trade-offs

- **Cache speed vs fresh data.** The cache makes feeds fast, but cached feeds can be a few seconds out of date, so a new photo may not appear instantly. We accept this because slightly stale feeds are fine for a photo app.
- **Read replica lag vs database load.** A replica removes read pressure from the primary, but copying data takes a moment, so a user might briefly not see their own new post. The fix is to read a user's own recent posts from the primary.
- **Asynchronous thumbnails vs instant results.** The queue and worker make uploads fast and able to survive traffic spikes, but a thumbnail may take a few seconds to appear and the system has more moving parts to monitor.
- **CDN and object storage cost vs speed.** About 748 TB of new data per year costs a lot to store and serve, but the CDN and cheap object storage are far cheaper and faster than the alternatives, and we can lower the cost by compressing photos or moving old ones to cheaper storage.
- **Cache invalidation vs freshness.** We can clear a cached feed the moment a new photo arrives, which keeps feeds fresh but costs extra work on every upload, or let cache entries expire after a short time (for example 30 seconds), which is simpler but shows slightly old feeds. Because uploads are rare compared with reads (1 write for every 50 reads), expiring after a short time plus clearing the uploader's own feed is a good balance.
- **Eventual consistency vs strict consistency.** The read replica, the cache and the background thumbnail job all mean different users may briefly see slightly different data. We accept this because a follower seeing a photo a few seconds late does no harm, and it lets the system handle far more traffic than if every read had to be perfectly up to date.
