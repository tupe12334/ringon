-- Reports on the events table (migrations/0001_events.sql). Run in the D1 console of
-- database ringon-events, or with `wrangler d1 execute ringon-events --remote --command "..."`.
-- Times are ms since epoch; strftime('%s','now','-7 days')*1000 is "a week ago".

-- Users and visits per day.
SELECT date(ts / 1000, 'unixepoch') AS day, count(DISTINCT uid) AS users, count(DISTINCT sid) AS visits
FROM events WHERE event = 'page_view' GROUP BY day ORDER BY day;

-- Where users are: country and network owner (a cloud host here usually means a bot).
SELECT country, as_org, count(DISTINCT uid) AS users FROM events GROUP BY country, as_org ORDER BY users DESC LIMIT 50;

-- Where visits come from: referring site and utm_source.
SELECT coalesce(referrer, '(none)') AS referrer, json_extract(props, '$.utm_source') AS utm, count(DISTINCT sid) AS visits
FROM events WHERE event = 'page_view' GROUP BY referrer, utm ORDER BY visits DESC;

-- Funnel: users who opened the page, the try-on, took a photo or clip, shared.
SELECT event, count(DISTINCT uid) AS users FROM events GROUP BY event ORDER BY users DESC;

-- Referrals: for each sharer, how many new people their links brought.
SELECT from_uid AS sharer, count(DISTINCT uid) AS brought FROM events
WHERE from_uid IS NOT NULL GROUP BY from_uid ORDER BY brought DESC;

-- Referral edges (sharer -> receiver, first time), to draw the sharing graph.
SELECT from_uid AS sharer, uid AS receiver, min(ts) AS first_open, max(country) AS receiver_country
FROM events WHERE from_uid IS NOT NULL GROUP BY from_uid, uid ORDER BY first_open;

-- Viral factor: new users brought by links per user who shared.
SELECT round(1.0 * (SELECT count(DISTINCT uid) FROM events WHERE from_uid IS NOT NULL)
  / nullif((SELECT count(DISTINCT uid) FROM events WHERE event IN ('share_link', 'share_media')), 0), 2) AS k;
