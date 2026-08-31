# Visual comparison rubric

## Capture protocol

Produce one lossless sheet per state in the order **Original | Champion |
Challenger**. Use an owner-captured DOS/Gold original where possible; label
fheroes2 references as recreations. Match viewport/native 640×480 framing,
game state, terrain, camera, visible resources, armies, stack counts, and UI
selection. Disable browser interpolation for pixel art and record browser,
device scale factor, revision, seed, and capture command in adjacent metadata.

Required states: adventure map, Knight town, grass battle, hero panel, army,
recruitment dialog, resource display, cursor/path, spell book, and main menu.

## Independent critic scorecard

Score each axis 0–10. `0` means absent/unrecognizable, `5` means broadly similar
but with material discrepancies, and `10` means the matched state is visually
indistinguishable at intended integer scale. A critic must cite visible evidence,
not code complexity or intent.

| Axis | Inspect |
|---|---|
| Composition | Major regions, viewport, map/town/battle framing, chrome placement |
| Proportions | Panel widths, cell/hex scale, portraits, controls, spacing |
| Density | Object frequency, negative space, information per region |
| Sprites | Correct source frames, silhouettes, crop, orientation, integer scale |
| Backgrounds | Terrain/town/battle detail, tiling, seams, horizon |
| Borders | Stone/metal bevels, corners, separators, pressed states |
| Typography | Typeface character, pixel alignment, size, line height, shadows |
| Palette | Hue/value relationships, contrast, unwanted gradients/modern effects |
| Hierarchy | Focus, selected state, primary controls, resource/status prominence |
| Clarity | Legibility and feedback without sacrificing original composition |
| Animations | State-correct sequence, pacing, anchor stability, terminal states |
| Overall fidelity | Holistic resemblance to the named original screen/version |

Report all 12 raw scores and the arithmetic mean (one decimal). Promotion
requires: no axis decreases by more than 0.5; overall fidelity improves by at
least 0.5; no console error, functional loss, interpolation blur, or runtime
remote dependency; and animation review finds no new terminal-state defect.

## Animation inspection

Review idle, move, turn, attack/ranged, hit, defend, death, and victory at 1×,
2×, and 3× on light, dark, and battle backgrounds. Explicitly record jitter,
sliding feet, changing scale/bounds, chroma halos, frame ordering, idle return,
death resurrection, projectile alignment, and smoothing. Capture at least one
frame-strip/contact sheet plus a real-time recording or timestamp log.

## Decision template

```text
Reference/version/resolution:
Champion revision/capture:
Challenger revision/capture:
Matched state and deviations:
Scores (12 axes):
Animation defects:
Console/functional checks:
Decision: promote | revise | reject
Concrete reason and next highest-impact gap:
```
