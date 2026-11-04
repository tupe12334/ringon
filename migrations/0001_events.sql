-- One row per analytics event from the app (worker/index.ts). Applied by hand: D1 console or
-- `wrangler d1 migrations apply ringon-events --remote`.
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY,
  ts INTEGER NOT NULL, -- server time, ms since epoch
  event TEXT NOT NULL,
  uid TEXT NOT NULL, -- random id kept in this browser's storage
  sid TEXT NOT NULL, -- random id per tab session
  from_uid TEXT, -- uid of the user whose share link opened this visit
  props TEXT, -- event details, JSON
  host TEXT,
  referrer TEXT, -- referring site's host name only
  country TEXT,
  region TEXT,
  city TEXT,
  timezone TEXT,
  asn INTEGER,
  as_org TEXT, -- network owner: an ISP for people, a cloud host for most bots
  ua TEXT
);
CREATE INDEX IF NOT EXISTS events_ts ON events (ts);
CREATE INDEX IF NOT EXISTS events_uid ON events (uid);
CREATE INDEX IF NOT EXISTS events_from ON events (from_uid);
