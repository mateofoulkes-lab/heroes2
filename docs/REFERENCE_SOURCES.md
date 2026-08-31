# Reference sources

Research log for the Heroes II fidelity gauntlet. Accessed 2026-08-31. Links are
references only: the application does not fetch any of them at runtime.

## Primary behavioral oracles

| Source | What was consulted | Evidence / use | Caveat |
|---|---|---|---|
| [fheroes2](https://github.com/ihhub/fheroes2) | README, GPL-2.0 license, battle and hero-movement source | The README identifies it as a from-scratch Heroes II engine recreation. `battle_cell.cpp` exposes reachability constrained by speed; `battle_troop.cpp` distinguishes retaliation and its disabling conditions; `heroes_move.cpp` separates turning and movement animation. Use to formulate tests, not as code to copy. | Current fheroes2 intentionally contains improvements and fixes; it is not automatically evidence of original behavior. |
| [Heroes II Gold reconstruction](https://github.com/sushi-shi/homm2-decomp) | README and CC0-1.0 license | README identifies the target as Heroes II Gold 2.1 (with a Price of Loyalty 2.0 reference). Suitable for checking constants and sequences against a named version. | Reconstructed/decompiled implementation is factual evidence, not a source of original art. It explicitly requires separately installed game resources. |
| [fheroes2 1.1.17 web port](https://github.com/Carter54git/fheroes-1.1.17-ported-to-web) | README and license | Browser deployment reference for local-file loading and web constraints. Its README explicitly says it does not include the copyrighted game data. | GPL-2.0 engine; it is also a port of fheroes2, not original DOS behavior. |
| [HeroWO Core](https://github.com/HeroWO-js/Core) | repository metadata and license | Architectural vocabulary for keeping rules/data/rendering separate in a browser game. | Models Heroes III, so it must never settle Heroes II visual or rules disputes. |
| [HOMM3Clone](https://github.com/mwardrop/HOMM3Clone) | README and repository metadata | Historical Canvas/A* reference only. | Heroes III, old dependencies, and no detected repository license; no code reuse. |

Direct files consulted in fheroes2: [battle cell](https://github.com/ihhub/fheroes2/blob/master/src/fheroes2/battle/battle_cell.cpp), [battle troop](https://github.com/ihhub/fheroes2/blob/master/src/fheroes2/battle/battle_troop.cpp), [hero movement](https://github.com/ihhub/fheroes2/blob/master/src/fheroes2/heroes/heroes_move.cpp), and [game improvements](https://github.com/ihhub/fheroes2/blob/master/docs/GAME_IMPROVEMENTS.md). Any behavior described as an “improvement” must be excluded from original-fidelity evidence unless independently confirmed.

## Visual and asset references

| Screen / material | URL | Version and resolution | What can be observed | Confidence |
|---|---|---|---|---|
| Adventure map | [fheroes2 world-map image](https://github.com/ihhub/fheroes2/blob/master/docs/images/screenshots/screenshot_world_map.webp) | fheroes2 current; screenshot displayed at 820 px in README; native resolution not recorded locally | Broad screen composition, map density, right rail, status hierarchy | Medium: faithful engine, potentially enhanced UI |
| Knight castle | [fheroes2 castle image](https://github.com/ihhub/fheroes2/blob/master/docs/images/screenshots/screenshot_castle.webp) | fheroes2 current; unknown native resolution | Full-screen scenic town, building hit areas, bottom controls | Medium |
| Grass battle | [fheroes2 battle image](https://github.com/ihhub/fheroes2/blob/master/docs/images/screenshots/screenshot_battle.webp) | fheroes2 current; unknown native resolution | Side-on battlefield, army placement, bottom combat controls | Medium |
| Original sprite material already incorporated | [The Spriters Resource: Heroes II](https://www.spriters-resource.com/ms_dos/heroesofmightandmagicii/) | MS-DOS Heroes II; sheet-dependent | Creature, overworld, portrait, artifact, spell, and Knight-town pixels | High for pixel appearance; low for timing/anchors without extraction evidence |
| Existing sheet provenance | [project asset source ledger](ASSET_SOURCES.md) | Individual links per sheet | Provenance of the repository's current local derivatives | High for current-file origin |

The research pass did **not** copy remote screenshots into the repository. GitHub
screenshots demonstrate fheroes2 rather than an unmodified original, and their
reuse terms are not sufficiently isolated from the repository license. The
reference pack therefore stores metadata/links only until the owner supplies an
authorized original capture or a capture is made from the owner's installation.

## Manual and gameplay-video search

An Internet Archive metadata request for a Heroes II manual was blocked by the
environment's proxy with HTTP 403. Automated web search also returned HTTP 401.
No restriction was bypassed and no uncertain mirror was substituted. A later
round should use an owner-supplied manual or a publisher-authorized scan, record
edition/page numbers, and add time-coded gameplay evidence for cursor/path
confirmation, recruitment, battle wait/defend, and end-of-week growth.

## Evidence policy

1. Record version, screen, native resolution, URL, access date, and confidence.
2. Prefer an original manual or an owner-captured original installation over a recreation.
3. Require two independent observations for timing or interaction claims.
4. Treat fheroes2 “improvements” as non-original until corroborated.
5. Never use Heroes III imagery to score Heroes II fidelity.
6. Keep all runtime assets local and add their exact license/provenance before integration.
