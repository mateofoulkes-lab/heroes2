# Asset gaps and animation lock

## Catalog status

`src/assets/animation-catalog.js` is the authoritative, testable catalog for the six existing creature strips. It records explicit frame rectangles, order, per-frame duration, looping, anchor, orientation, displacement, impact point, projectile point, provenance, and confidence. `/asset-lab/` renders those fields without depending on the game renderer.

The repository inherited horizontal strips whose extraction notes do not identify semantic boundaries. Required `idle`, `move`, `attack`, `ranged`, `hit`, and `death` clips are declarative runtime Canvas crops of those existing strips and are explicitly marked as fallbacks, not verified semantic locks. `defend`, `victory`, and `turn` remain missing. No derived PNG is generated or committed; a visually plausible frame split must not be promoted to Asset Lock without source evidence.

## Verification queue

| Priority | Gap | Evidence required before lock |
| --- | --- | --- |
| P0 | Creature state boundaries | Compare frame IDs against the original ICN sequence and fheroes2 animation metadata; record original indexes. |
| P0 | Death terminal pose | Verify non-looping order and ensure the final corpse frame persists. |
| P0 | Attack impact/projectile points | Measure against matched battle captures at native 640×480. |
| P1 | Hero direction states | Extract all eight facings and movement phases; current `hero-map.png` is not yet in the semantic catalog. |
| P1 | Adventure objects | Inventory resources, mines, chests, artifacts, cursors, and path markers against original ICN assets. |
| P2 | Chroma-key quality | Inspect at 3× on light/dark/battle backgrounds; replace extractions that show colored halos. |

If a required original asset is absent, record its source URL and deterministic
extraction recipe here, keep using the closest existing local strip at runtime,
and do not introduce a broken URL. The currently missing states can be researched
from the [Heroes II sheet index](https://www.spriters-resource.com/ms_dos/heroesofmightandmagicii/): obtain the owner-authorized source, record its native frame grid and chroma key, then update only catalog rectangles after verification.

## Provenance

The creature strips are repository-inherited, chroma-keyed/cropped derivatives of the [Heroes of Might and Magic II raw spritesheets](https://www.spriters-resource.com/ms_dos/heroesofmightandmagicii/asset/43135/), used under the owner's stated authorization for this private experiment. No code or assets from fheroes2 or other oracle repositories were copied for this catalog.
