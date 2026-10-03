# Lyric Fade

A lyrics website that finds time-synced lyrics online and fades each line in and out in step with the music. It plays a song file or a YouTube video, or runs a timer alongside music playing in another app.

## What's in the folder

| File | What it is |
| --- | --- |
| `lyric-fade.html` | The website. Everything (page, styles, script) is in this one file. |
| `server.js` | Optional local server. Serves the page, looks up lyrics, and searches YouTube. |

Keep both files in the same folder.

## Quick start

1. Install [Node.js](https://nodejs.org) 18 or newer (check with `node --version`).
2. Open a terminal in the folder and run:

   ```
   node server.js
   ```

3. Open **http://localhost:8000** in your browser.

To turn on YouTube search by song name, start the server with a YouTube API key (see [YouTube setup](#youtube-setup)).

## Using the site

You can start from any of three places:

- **Play from YouTube:** paste a YouTube link into the YouTube box and press **Play from YouTube**. The video appears in a small player and the lyrics follow its clock. Typing a song name instead of a link searches YouTube (needs an API key).
- **Open song file:** choose an audio file (mp3, m4a, wav, ogg, flac), or drag it onto the page. The artist and title are read from the file name, for example `Artist - Song.mp3`.
- **Timer:** if you play music in another app, press **Use timer instead** (or just search for a song without opening anything), then press **Play** at the moment your song starts.

In every case the page searches the internet for the lyrics by itself. You can also type an artist and song and press **Find lyrics**, or load your own file with **Load .lrc**.

### Controls

| Control | What it does |
| --- | --- |
| Play / Pause | Starts or stops the video, song or timer. |
| Position bar | Drag to jump. |
| Offset -0.5s / +0.5s | Shifts the lyrics earlier or later if they feel out of step. |
| Click a lyric line | Jumps to that line. |
| Full screen | Fills the screen. |

Keyboard: **Space** play or pause, **Left / Right** skip 5 seconds, **F** full screen, **Esc** close panels.

### About timing

- **Synced** (shown on the stage) means the lyrics have real timestamps.
- **Estimated timing** means only plain lyrics exist, so the lines are spread evenly across the song. Use the offset buttons to improve it.
- YouTube videos often have intros or edits that the studio version does not, so a small offset is normal.

## YouTube setup

Pasting a video link needs no setup. Searching by song name needs a free **YouTube Data API key**:

1. Open the [Google Cloud Console](https://console.cloud.google.com/), create a project, and enable **YouTube Data API v3**.
2. Create an API key under **Credentials**.
3. Start the server with the key:

   - **Windows (PowerShell):**
     ```
     $env:YOUTUBE_API_KEY="your-key"; node server.js
     ```
   - **Mac / Linux:**
     ```
     YOUTUBE_API_KEY=your-key node server.js
     ```

The key stays inside the server and is never sent to the browser. Each name search uses 100 of the 10,000 free units Google gives you per day, and repeat searches are remembered for an hour.

## Server settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `PORT` | `8000` | The port to listen on. |
| `HOST` | `127.0.0.1` | Only this computer can connect. Use `HOST=0.0.0.0` to reach it from a phone on the same Wi-Fi. |
| `YOUTUBE_API_KEY` | none | Turns on YouTube search by song name. |

Example: `PORT=8080 node server.js`

## Running without the server

You can open `lyric-fade.html` by double-clicking it. Lyrics lookup, song files, `.lrc` files and the timer all still work, because the page contacts the lyrics service directly.

Two limits apply in this mode:

- **YouTube will not play.** YouTube refuses its player on pages opened from a file (error 153). Use the server, or any other web address such as `python3 -m http.server`.
- **Searching by name** needs the key pasted into the page's **API key** panel. It is then kept in your browser only.

## Troubleshooting

| Problem | Fix |
| --- | --- |
| YouTube shows error 153 | Open the page from `http://localhost:8000` through `server.js`, not from the file. |
| "The owner of that video does not allow it to play on other sites" | That upload blocks embedding. Choose another upload. |
| "No lyrics found" | Check the spelling, edit the Artist and Song boxes, or load your own `.lrc`. |
| Lyrics are early or late | Use the **Offset** buttons. |
| "Port 8000 is already in use" | Run `PORT=8080 node server.js` and open that port instead. |
| "This server needs Node 18 or newer" | Update Node.js from nodejs.org. |
| YouTube search says the key was rejected or refused | Check the key, make sure YouTube Data API v3 is enabled for it, and check that today's quota is not used up. |
| Nothing loads, "Could not reach..." | Check your internet connection. The lyrics service and YouTube both need it. |

## API reference

All endpoints are `GET` and return JSON.

| Endpoint | Parameters | Returns |
| --- | --- | --- |
| `/api/config` | none | `{ "youtubeSearch": true or false }` |
| `/api/lyrics` | `title` (required), `artist`, `duration` in seconds | `{ trackName, artistName, duration, syncedLyrics, plainLyrics }`. `404` if nothing is found. |
| `/api/search` | `q` (required) | `{ "items": [{ id, title, channel, thumb }] }`. `503` if no key is set on the server. |

Errors from the lyrics service or YouTube come back as `502`. For `/api/search`, a bad key or used-up quota comes back as `400` or `403`.

## Where the data comes from

- **Lyrics:** [LRCLIB](https://lrclib.net), a free community database of synced lyrics. Nothing is stored in this project. Lyrics are fetched when you search them and are shown for your own use.
- **Video and search:** the YouTube IFrame Player API and YouTube Data API v3.
- **Fonts:** Google Fonts (Bricolage Grotesque, IBM Plex Mono, Noto Sans Bengali). The page falls back to system fonts if they cannot load.

## Privacy

- The server only talks to LRCLIB and Google, and only to answer your searches.
- Nothing is saved to disk. Lyrics and search results are kept in memory until you stop the server.
- Without the server, the only thing the page stores is the API key you choose to paste, in your browser's local storage.
