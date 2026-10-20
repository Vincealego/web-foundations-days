# Reflection

**The most difficult concept.** The hardest idea for me was designing a system that keeps working as it grows. At first, terms like read replica, cache, queue and worker felt like a pile of boxes. Then I learned to start from numbers. Working out reads and writes per second showed me why each part exists: the cache protects the database, and the queue lets slow work happen in the background. I overcame it by doing the calculations myself and asking why each component was there, until I could explain every box in one sentence.

**What I would improve in my capstone.** The feedback showed me two weaknesses. Some of my documents ended before important sections, such as the upload flow and the trade-offs, so my design looked unfinished. I also needed to cover failures properly, such as what happens when a worker crashes. Now I check the end of every file before I commit, and I plan for retries and failed jobs from the start.

**What I will learn next.** I want to learn how to build a real backend with a database, so I can turn my API design into working code. After that, I want to study authentication and deployment, so I can put a project online and test how it behaves under real traffic.
