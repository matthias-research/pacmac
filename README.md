# PacMac Deluxe

A JavaScript/Canvas recreation of DAPPSoft's Macintosh PacMac Deluxe 1.3, using the original graphics, animation sequences, bitmap fonts, sounds, music, and 2,332 levels in 117 files.

Play online: **https://pacmac.matthi3010.workers.dev**

## Two versions

- **Standalone:** download `dist/PacMac Deluxe.html` and open it in a browser. This approximately 13.1 MB file includes all code, levels, images, and audio. It works offline without a server.
- **Separate files:** `index.html`, `styles.css`, `src/`, `data/`, and `assets/` contain the same game in editable form. Run `npm start`, then open **http://localhost:4185**. No npm dependencies are required; use Node.js 22 or later.

Music starts after your first click or key press. Browser preferences, custom levels, and high scores are saved locally and may differ between the two versions.

## Controls and features

- Arrow keys move; WASD also works with default controls.
- **P** pauses, **Esc** returns to the menu, **Space** shows the menu bar.
- **Options > Sequential Play** selects a level file and starting level; random play is available too.
- Preferences configure keys, music, sound effects, volume, and original-style game speed (25-100 fps; normal 30).
- **Music > Play Next** switches between the three original tracks.
- The level editor supports drawing, right-click erasing, Alt-click tile selection, undo, testing, local saves, and JSON import/export. Esc returns from testing to the editor. Export custom levels for a portable backup.

## Build, test, and deploy

```sh
npm start
npm test
node tools/music-test.mjs
npm run build
```

The build regenerates both `dist/PacMac Deluxe.html` and an identical `dist/site/index.html` for Cloudflare. Only the downloadable HTML is committed; the deployment copy is generated.

`wrangler.jsonc` configures the `pacmac` Cloudflare Worker to publish exactly one asset from `dist/site/`. With Wrangler installed and authenticated, run:

```sh
wrangler deploy
```

The configuration runs the build automatically. Deployment is manual; pushing this repository does not publish updates.

Optional Chrome CDP checks:

```sh
node tools/browser-check.mjs
node tools/audio-playback-check.mjs
```

These expect an owned Chrome debug session at port 9247. The browser check defaults to a local game tab on port 4185; the audio check defaults to the deployed site. `CHECK_URL` selects a different tab URL prefix. The browser check also supports `CDP_URL`. Results are written to the ignored `analysis/browser/` folder. The checks exercise keyboard gameplay, pause, preferences, levels, editor paint/undo/test/import/save, audio decoding/playback, and mobile layout.

## Original-game fidelity

Assets include 726 sprite images, 74 animation definitions, eight bitmap fonts, three title/intro pictures, 12 sound effects, and three tracker songs rendered to Ogg audio.

The original game was run in a System 7.5.3 emulator for comparison. REA identified the extracted 68K code, but its Windows adapter did not support decompilation; the installed Ghidra headless decompiler was used directly. `src/ghost-ai.js` translates recovered per-colour steering routines. Recovered code also supplied food and fruit scores, tile passability, movement speeds, frightened duration and speed, ghost release intervals, life thresholds, fruit timing, and collision conditions.

Exact random-number sequences, some returning-eyes behaviour, frame/sound synchronization, and PlayerPRO's original audio mixing remain approximate. Ghosts have a safe reverse fallback in dead-end custom mazes. The browser uses high-resolution artwork responsively; dialogs and file management use browser controls. The editor and level library are available directly.

Original artwork and media retain their original authorship and copyright; no new license for those assets is asserted here.

The original downloads, extracted Mac installation, decompiler output, investigation files, local browser profiles, and recovery-only tools are intentionally excluded from this repository.
