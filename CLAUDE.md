# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A vanilla HTML/CSS/JS anniversary gift — a 14-step guessing game ("Deux ans ensemble") where the player must identify memories from blurred photos and videos. No build step, no framework, no package manager.

## Running the project

Open `index.html` directly in a browser, or serve it with any static file server (e.g. `npx serve .` or VS Code Live Server). There is no build, lint, or test command.

## Architecture

Three files make up the entire application:

- **`data.js`** — exports `window.SOUVENIRS_DATA`, an array of 14 stage objects. Each stage has an `id`, a `title` (display name), an `answer` (the accepted string), and a `media` array of `{ type, src }` objects (images or videos).
- **`app.js`** — all game logic. Reads `window.SOUVENIRS_DATA` at startup. Manages state in module-level variables (`currentIndex`, `totalHelpUsed`, `currentHelpLevel`, `solvedStages[]`, `helpByStage[]`). No classes, no modules — plain global script.
- **`styles.css`** — single stylesheet. Uses CSS custom properties (`--bg`, `--accent`, `--accent-strong`, etc.) defined on `:root` for the warm coral/pink palette.

### Answer matching

`isCorrectAnswer` (app.js:76) normalizes both strings (NFD decomposition, strip accents, `&`→`et`, lowercase) then accepts if the Levenshtein similarity score is ≥ 0.7. This is intentionally lenient to handle typos and accent-less input.

### Help / blur system

`helpLevels` (app.js:6) is `[24, 20, 16, 12, 8, 4, 0]` — pixel blur values. `currentHelpLevel` indexes into this array; each "Aide" click increments it and re-renders media with reduced blur. At level 0, images are also grayscale + dark overlay with a `?`. At max level (6), blur is 0 (fully revealed without solving).

### Media rendering

`renderMedia` (app.js:107) rebuilds `#mediaGrid` from scratch on every state change. Videos are `autoplay muted loop playsInline`. All paths go through `encodeURI` to handle spaces and special characters in the `resources/souvenirs/` folder names.

### Adding a new memory stage

1. Create `resources/souvenirs/<N> - <Name>/` and drop photos/videos inside
2. Run `node generate-data.js` — it scans all folders and rewrites `data.js` automatically
3. Custom `title` and `answer` values already in `data.js` are preserved across regenerations; the `answer` field matters when it differs from the folder name (e.g., `"Mariage demdem et eva"` vs the folder `"7 - Marriage demdem & eva"`)
