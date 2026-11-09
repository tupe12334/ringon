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

-- Likely real people per day: drops data-centre networks, headless defaults (tz UTC, 800x600) and
-- runs that rotate the language each load. Heuristic: extend the network list as new bots show up.
-- devices (user agent + screen) is the better people count: some browsers lose their stored id, so
-- one person can show up as a new uid on every load.
WITH real AS (
  SELECT * FROM events
  WHERE coalesce(json_extract(props, '$.tz'), '') NOT IN ('', 'UTC', 'Etc/Unknown')
    AND coalesce(json_extract(props, '$.screen'), '') NOT LIKE '800x600@%'
    AND coalesce(as_org, '') NOT LIKE '%Amazon%' AND coalesce(as_org, '') NOT LIKE '%Google%'
    AND coalesce(as_org, '') NOT LIKE '%Microsoft%' AND coalesce(as_org, '') NOT LIKE '%YouTube%'
    AND coalesce(as_org, '') NOT LIKE '%Palo Alto%' AND coalesce(as_org, '') NOT LIKE '%Fortinet%'
    AND coalesce(as_org, '') NOT LIKE '%HostRoyale%' AND coalesce(as_org, '') NOT LIKE '%Scaleway%'
    AND coalesce(as_org, '') NOT LIKE '%Leaseweb%' AND coalesce(as_org, '') NOT LIKE '%LogicWeb%'
    AND coalesce(as_org, '') NOT LIKE '%code200%' AND coalesce(as_org, '') NOT LIKE '%Hosting%'
    AND coalesce(as_org, '') NOT LIKE '%Data Center%' AND coalesce(as_org, '') NOT LIKE '%Cloud%'
    AND coalesce(as_org, '') NOT LIKE '%HostPapa%' AND coalesce(as_org, '') NOT LIKE '%Railway%'
    AND coalesce(as_org, '') NOT LIKE '%OCULUS%' AND coalesce(as_org, '') NOT LIKE '%FASTPLANET%'
    AND coalesce(as_org, '') NOT LIKE '%Subnet Digital%' AND coalesce(as_org, '') NOT LIKE '%BraveWay%'
    AND ua NOT LIKE '%Headless%'
    AND (host, coalesce(ua, '')) NOT IN (
      SELECT host, coalesce(ua, '') FROM events GROUP BY host, ua, as_org
      HAVING count(DISTINCT json_extract(props, '$.lang')) > 2
    )
)
SELECT date(ts / 1000, 'unixepoch') AS day, count(DISTINCT ua || json_extract(props, '$.screen')) AS devices,
  count(DISTINCT uid) AS uids, count(*) AS events,
  group_concat(DISTINCT country || ' ' || coalesce(as_org, '?')) AS networks
FROM real GROUP BY day ORDER BY day;
