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

## Round 2 — extracted tactical rules challenger

- **Gap:** decorative battle grid without tactical cell rules.
- **Builder:** Battle Builder, isolated ownership of `src/battle/**`.
- **Criterion:** deterministic cell occupancy/range, initiative, wait/defend, melee/ranged/retaliation, casualties and outcome must work without Canvas.
- **Result:** pure rule engine and seven deterministic tests are complete. It is retained as an integration-ready challenger, but **not yet promoted into the playable champion**, because the Canvas adapter is not complete. This avoids degrading the existing playable battle.

## Next gap

Integrate the tested battle engine into `game.js` through a narrow adapter, then compare the same grass battle state and promote only after the full playable flow passes.
