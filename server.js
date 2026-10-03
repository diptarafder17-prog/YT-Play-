#!/usr/bin/env node
"use strict";

/*
  Lyric Fade API server (no packages to install, needs Node 18 or newer).

  Run:
    Windows (PowerShell):  $env:YOUTUBE_API_KEY="your-key"; node server.js
    Mac / Linux:           YOUTUBE_API_KEY=your-key node server.js
  Then open http://localhost:8000

  The YouTube key is optional. Without it, pasting a video link still works;
  only searching YouTube by song name needs it. The key stays on this server
  and is never sent to the browser.

  Endpoints
    GET /                 the Lyric Fade page
    GET /api/config       { youtubeSearch: true | false }
    GET /api/lyrics       ?title=...&artist=...&duration=SECONDS   best synced lyrics match
    GET /api/search       ?q=...                                   YouTube video search
*/

const http = require("http");
const fs = require("fs");
const path = require("path");

if (typeof fetch !== "function") {
  console.error("This server needs Node 18 or newer. Download it from https://nodejs.org");
  process.exit(1);
}

const PORT = Number(process.env.PORT) || 8000;
const HOST = process.env.HOST || "127.0.0.1"; // local only. Use HOST=0.0.0.0 to open it to your Wi-Fi.
const YT_KEY = process.env.YOUTUBE_API_KEY || "";
const PAGE = path.join(__dirname, "lyric-fade.html");
const LRCLIB = "https://lrclib.net/api";
const UA = "LyricFade/1.0 (local app)";

/* ---------- tiny in-memory cache, so repeat searches cost nothing ---------- */
const cache = new Map();
const TTL = 60 * 60 * 1000;
function cacheGet(key) {
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < TTL ? hit : undefined;
}
function cacheSet(key, value) {
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), value });
}

async function getJSON(url, ms = 12000) {
  const r = await fetch(url, { signal: AbortSignal.timeout(ms), headers: { "User-Agent": UA } });
  if (!r.ok) {
    const e = new Error("HTTP " + r.status);
    e.status = r.status;
    throw e;
  }
  return r.json();
}

/* ---------- lyrics (LRCLIB) ---------- */
function pick(list, duration) {
  list = (list || []).filter((x) => x && !x.instrumental);
  const synced = list.filter((x) => x.syncedLyrics);
  const pool = synced.length ? synced : list.filter((x) => x.plainLyrics);
  if (!pool.length) return null;
  if (duration) pool.sort((a, b) => Math.abs((a.duration || 0) - duration) - Math.abs((b.duration || 0) - duration));
  return pool[0];
}

async function findLyrics(artist, title, duration) {
  let exact = null;
  if (artist && duration) {
    try {
      const q = new URLSearchParams({ artist_name: artist, track_name: title, duration: String(Math.round(duration)) });
      const r = await getJSON(`${LRCLIB}/get?${q}`);
      if (r && (r.syncedLyrics || r.plainLyrics)) exact = r;
    } catch (e) {
      if (e.status !== 404) throw e;
    }
  }
  if (exact && exact.syncedLyrics) return exact;

  const q1 = new URLSearchParams({ track_name: title });
  if (artist) q1.set("artist_name", artist);
  let list = await getJSON(`${LRCLIB}/search?${q1}`);
  if (!list || !list.length) {
    const q2 = new URLSearchParams({ q: `${artist} ${title}`.trim() });
    list = await getJSON(`${LRCLIB}/search?${q2}`);
  }
  return pick(list, duration) || exact;
}

async function handleLyrics(url, res) {
  const title = (url.searchParams.get("title") || "").trim().slice(0, 200);
  const artist = (url.searchParams.get("artist") || "").trim().slice(0, 200);
  const duration = Math.max(0, Math.min(Number(url.searchParams.get("duration")) || 0, 7200));
  if (!title) return send(res, 400, { error: "Missing title." });

  const key = `lyrics|${artist.toLowerCase()}|${title.toLowerCase()}|${Math.round(duration)}`;
  let hit = cacheGet(key);
  if (!hit) {
    const r = await findLyrics(artist, title, duration);
    const value = r
      ? {
          trackName: r.trackName,
          artistName: r.artistName,
          duration: r.duration,
          syncedLyrics: r.syncedLyrics || null,
          plainLyrics: r.plainLyrics || null
        }
      : null;
    cacheSet(key, value);
    hit = { value };
  }
  if (!hit.value) return send(res, 404, { error: "No lyrics found." });
  send(res, 200, hit.value);
}

/* ---------- YouTube search (key stays here) ---------- */
async function handleSearch(url, res) {
  const q = (url.searchParams.get("q") || "").trim().slice(0, 200);
  if (!q) return send(res, 400, { error: "Missing search text." });
  if (!YT_KEY) return send(res, 503, { error: "This server has no YOUTUBE_API_KEY set." });

  const key = "yt|" + q.toLowerCase();
  let hit = cacheGet(key);
  if (!hit) {
    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      maxResults: "6",
      q,
      key: YT_KEY
    });
    const data = await getJSON(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const items = ((data && data.items) || [])
      .filter((it) => it.id && it.id.videoId)
      .map((it) => {
        const sn = it.snippet || {};
        return {
          id: it.id.videoId,
          title: sn.title || "",
          channel: sn.channelTitle || "",
          thumb: (sn.thumbnails && sn.thumbnails.default && sn.thumbnails.default.url) || ""
        };
      });
    cacheSet(key, items);
    hit = { value: items };
  }
  send(res, 200, { items: hit.value });
}

/* ---------- plumbing ---------- */
function send(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(text);
}

function sendPage(res) {
  fs.readFile(PAGE, (err, data) => {
    if (err) return send(res, 500, { error: "lyric-fade.html must sit next to server.js." });
    res.writeHead(200, {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      // YouTube refuses players on pages that send no referrer, so state the policy explicitly.
      "Referrer-Policy": "strict-origin-when-cross-origin"
    });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  let url = new URL("http://localhost/");
  try {
    if (req.method !== "GET") return send(res, 405, { error: "Method not allowed." });
    url = new URL(req.url, "http://localhost");
    if (url.pathname === "/" || url.pathname === "/lyric-fade.html") return sendPage(res);
    if (url.pathname === "/api/config") return send(res, 200, { youtubeSearch: Boolean(YT_KEY) });
    if (url.pathname === "/api/lyrics") return await handleLyrics(url, res);
    if (url.pathname === "/api/search") return await handleSearch(url, res);
    send(res, 404, { error: "Not found." });
  } catch (e) {
    // For YouTube search only, pass Google's 400 / 403 (bad key, quota used up) through so the page can explain them.
    const keyProblem = url.pathname === "/api/search" && e && (e.status === 400 || e.status === 403);
    const passThrough = keyProblem ? e.status : 502;
    send(res, passThrough, { error: "The upstream service failed.", upstreamStatus: (e && e.status) || null });
  }
});

server.on("error", (e) => {
  if (e.code === "EADDRINUSE") console.error(`Port ${PORT} is already in use. Try: PORT=8080 node server.js`);
  else console.error(e.message);
  process.exit(1);
});

server.listen(PORT, HOST, () => {
  console.log(`Lyric Fade is running at http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}`);
  console.log(YT_KEY ? "YouTube search: on" : "YouTube search: off (set YOUTUBE_API_KEY to turn it on)");
});
