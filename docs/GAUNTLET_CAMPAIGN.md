# Gauntlet campaign

## Champion baseline

- Version: repository `0.1.0` at the start of 2026-08-31.
- Evidence: `docs/BASELINE_AUDIT.md` and locally generated `/tmp/heroes2-gauntlet/baseline/` captures (not committed).
- Preserved functions: adventure movement, pickups/mines, Knight town/recruitment, simplified battle, day advance.

## Round 1 — semantic animation asset lock

- **Gap:** creature strips had only dimensions/frame count and played as an undifferentiated loop.
- **Builder:** Asset Archaeologist, isolated ownership of `src/assets/**` and `/asset-lab/`.
- **Success criterion set before editing:** a local catalog must expose state animation geometry/timing/anchors/orientation/impact/projectile/provenance, refuse invented states, validate deterministically, and be inspectable in a real browser with nearest-neighbour rendering.
- **Challenger:** immutable semantic catalog plus `/asset-lab/` museum, linked from the champion interface.
- **Tests:** catalog validation; Chrome visit with zero JavaScript/console errors; HTTP asset checks; existing smoke and visual checks.
- **Screens:** locally generated `/tmp/heroes2-gauntlet/challenger/asset-lab.png` and `/tmp/heroes2-gauntlet/comparisons/round-1-asset-lock.png`; textual observations and scores stay here while binaries remain outside Git.
- **Independent animation/QA critic:** provisional presentation score 6.7/10 across the eleven applicable rubric axes. The critic confirmed clearer inspection, integer scales, frame stepping and honest missing-state disclosure, while flagging chroma remnants, unverified `idle` semantics, missing bounds/impact overlays and the lack of a licensed original gameplay capture. Recommended promotion only as an Asset Lock foundation; a fidelity verdict is deferred.
- **Decision:** promoted with that bounded scope. It materially improves inspectability and animation data quality without changing gameplay or remote runtime dependencies; it is not claimed as a visual-fidelity win over an unavailable original capture.
- **Regression guards:** original source strips unchanged; missing states are explicit, not fabricated; Canvas remains runnable; pixel smoothing remains disabled in the lab.

## Round 2 — playable tactical battle

- **Gap:** decorative battle grid without tactical cell rules.
- **Builder:** Battle Builder, isolated ownership of `src/battle/**`.
- **Criterion:** deterministic cell occupancy/range, initiative, wait/defend, melee/ranged/retaliation, casualties and outcome must work without Canvas.
- **Visible challenger:** `game.js` now drives the Canvas from the tactical engine: real stack positions, active initiative, reachable highlights, cell hit-testing, animated movement, melee adjacency, ranged ammunition, retaliation, wait, defend, casualties, terminal death frames, basic enemy turns, and survivor persistence.
- **Browser evidence:** the deterministic map → battle → map flow is played through Canvas and buttons by `tests/battle-flow.cjs`; local before/after captures live under `/tmp/heroes2-gauntlet/battle-flow/`. It verifies a rejected distant melee attack, a stationary ranged shot with ammunition loss, real wait/defend state, victory reward, neutral removal, survivors, and zero console errors.
- **Decision:** promoted after the independent battle critic completed the same flow. The spatial interaction and visible feedback materially surpass the fixed-position click-to-attack champion without removing adventure, town, recruitment, or daily economy.

## Next gap

Verify original Heroes II frame ranges and battlefield geometry, then improve projectile presentation and move-plus-melee without changing the now-tested spatial flow.
