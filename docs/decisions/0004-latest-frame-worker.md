# ADR 0004: Latest-frame worker

**Status:** Accepted

Run synchronous inference in a worker. Allow one in-flight frame and one replaceable pending frame. CPU is baseline; GPU requires measured 15% p95 improvement.
