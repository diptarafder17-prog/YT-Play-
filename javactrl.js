Developer Automation Hub
v3.4
YouTube API • GitHub CLI • Pascal Unit Generator • Java Control

YouTube API v3
GitHub CLI (gh)
FreePascal
javaCtrl
YouTube API Target Config
Endpoint: /videos
YouTube Video URL or Video ID
https://www.youtube.com/watch?v=L3wKzyIN1yk

Fetch
YouTube API Key (Optional)
AIzaSy...
Target Sync Action

Export Lyrics to Gist

Coldplay - Yellow
Coldplay Official

ID: L3wKzyIN1yk
GitHub CLI (`gh`) Automation
CLI Executable: gh
Target Repository / Gist Title
yt-lyrics-sync-backup
Visibility

Public
GitHub Branch
main
Automated `gh` Command Preview
gh gist create L3wKzyIN1yk_lyrics.lrc --desc "Synced lyrics for YouTube Video ID L3wKzyIN1yk" --public


Execute javaCtrl & Pascal Pipeline

Pascal Unit (.pas)

GitHub CLI (`gh.sh`)

javaCtrl.js

Copy Code
/**
 * javaCtrl - Async Pipeline Controller Module
 */
class JavaCtrlEngine {
    constructor(videoId, repoName) {
        this.videoId = videoId;
        this.repoName = repoName;
    }

    async syncPipeline() {
        console.log(`[javaCtrl] Initializing YouTube target: ${this.videoId}`);
        const lrcData = await this.fetchLrc();
        return this.pushToGitHub(lrcData);
    }

    async fetchLrc() {
        const res = await fetch(`https://lrclib.net/api/get?youtube_id=${this.videoId}`);
        return res.json();
    }
}
javaCtrl Live Pipeline Console
Clear Log
[javaCtrl] Console initialized. Awaiting API trigger...
