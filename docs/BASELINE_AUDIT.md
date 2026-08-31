# Baseline audit — champion 0.1.0

Date: 2026-08-31. Viewport: 1365 × 820. Browser: Google Chrome 152 headless through Playwright.

## Materialized screens (local, ignored)

- `/tmp/heroes2-gauntlet/baseline/adventure.png`: adventure canvas and external hero/resources panel.
- `/tmp/heroes2-gauntlet/baseline/castle.png`: Knight town.
- `/tmp/heroes2-gauntlet/baseline/battle.png`: grass battle reached by moving five cells east.
- `/tmp/heroes2-gauntlet/baseline/hero-panel.png`: hero summary.
- `/tmp/heroes2-gauntlet/baseline/recruitment.png`: recruitment cards on the town canvas.
- `/tmp/heroes2-gauntlet/baseline/console.json`: console capture.

These files are regenerated during evaluation and deliberately excluded from Git.

## Verified findings

The application starts and the HTTP smoke check passes. `game.js` owns state, generation, path finding, interaction, rules and every renderer. Creature strips are advanced as one modulo loop. Adventure resources/mines are provisional Canvas primitives. Battle has decorative hexes but attacks do not use cell occupancy or movement. The existing browser check was initially unreproducible because Playwright was undeclared and had no browser; the dependency is now declared and the check can use a system Chrome.

The only captured console error was the browser's missing favicon request (HTTP 404); no JavaScript exception occurred.

## Binary hygiene recovery

The recovery diff classified every binary reported by `git diff --numstat
main...HEAD` as a newly generated baseline, challenger, or comparison screenshot.
No pre-existing game asset from `main` was modified, and no indispensable new
runtime binary was found. All generated images were removed from the changeset;
Playwright now writes them to `/tmp/heroes2-gauntlet/playwright/`. The favicon
request is handled without adding a binary file, so the current browser check has
no console or page errors.
