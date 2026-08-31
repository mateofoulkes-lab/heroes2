const assetUrl = (path) => new URL(`../../assets/${path}`, import.meta.url).href;

export const SEMANTIC_STATES = Object.freeze([
  "idle", "move", "attack", "ranged", "hit", "defend", "death", "victory", "turn",
]);

const frameRects = (count, width, height, row = 0) =>
  Array.from({ length: count }, (_, column) => Object.freeze({
    x: column * width, y: row * height, width, height,
  }));

const animation = ({ frames, duration = 140, loop = true, order, ...metadata }) => Object.freeze({
  frames: Object.freeze(frames),
  order: Object.freeze(order ?? frames.map((_, index) => index)),
  duration: Object.freeze(frames.map(() => duration)),
  loop,
  anchor: Object.freeze(metadata.anchor ?? { x: 0.5, y: 1 }),
  orientation: metadata.orientation ?? "right",
  displacement: Object.freeze(metadata.displacement ?? { x: 0, y: 0 }),
  impactPoint: Object.freeze(metadata.impactPoint ?? { x: 0.72, y: 0.42 }),
  projectilePoint: Object.freeze(metadata.projectilePoint ?? { x: 0.72, y: 0.42 }),
  confidence: metadata.confidence ?? "derived-strip-unverified-semantics",
});

const unit = (id, width, height, count, provenance, options = {}) => {
  const frames = frameRects(count, width, height);
  const fallbackClip = (state, { duration, loop = true, order } = {}) => animation({
    frames,
    duration,
    loop,
    order,
    confidence: `existing-strip-runtime-fallback:${state}`,
  });
  // The source strips predate this catalog and have no verified state ledger.
  // Every required state is therefore a declarative runtime crop of that existing
  // strip, explicitly marked as a fallback rather than a newly derived PNG.
  return Object.freeze({
    id,
    label: options.label ?? id[0].toUpperCase() + id.slice(1),
    spritesheet: assetUrl(`units/${id}.png`),
    sheet: Object.freeze({ frameWidth: width, frameHeight: height, columns: count, rows: 1 }),
    animations: Object.freeze({
      idle: fallbackClip("idle", { duration: options.duration ?? 140 }),
      move: fallbackClip("move", { duration: options.moveDuration ?? 110 }),
      attack: fallbackClip("attack", { duration: options.attackDuration ?? 90, loop: false }),
      ranged: fallbackClip("ranged", { duration: options.attackDuration ?? 90, loop: false }),
      hit: fallbackClip("hit", { duration: options.hitDuration ?? 120, loop: false }),
      death: fallbackClip("death", {
        duration: options.deathDuration ?? 150,
        loop: false,
        order: frames.map((_, index) => index),
      }),
    }),
    missingStates: Object.freeze(SEMANTIC_STATES.filter((state) => !["idle", "move", "attack", "ranged", "hit", "death"].includes(state))),
    provenance,
  });
};

const SPRITERS_RESOURCE_RAW = Object.freeze({
  label: "Heroes of Might and Magic II raw spritesheets",
  url: "https://www.spriters-resource.com/ms_dos/heroesofmightandmagicii/asset/43135/",
  license: "User-authorized original-game material; private experiment",
  transform: "Chroma-keyed and cropped into a horizontal strip by the repository's original author",
});

export const CREATURE_CATALOG = Object.freeze({
  peasant: unit("peasant", 58, 72, 6, SPRITERS_RESOURCE_RAW),
  paladin: unit("paladin", 76, 108, 10, SPRITERS_RESOURCE_RAW, { duration: 125 }),
  skeleton: unit("skeleton", 64, 88, 9, SPRITERS_RESOURCE_RAW),
  goblin: unit("goblin", 58, 84, 8, SPRITERS_RESOURCE_RAW),
  archer: unit("archer", 58, 84, 10, SPRITERS_RESOURCE_RAW, { duration: 125 }),
  dragon: unit("dragon", 112, 128, 12, SPRITERS_RESOURCE_RAW, { duration: 115 }),
});

export function validateCatalog(catalog = CREATURE_CATALOG) {
  const errors = [];
  for (const [id, entry] of Object.entries(catalog)) {
    if (!entry.spritesheet || !entry.provenance?.url) errors.push(`${id}: missing spritesheet or provenance`);
    for (const [state, clip] of Object.entries(entry.animations ?? {})) {
      if (!SEMANTIC_STATES.includes(state)) errors.push(`${id}.${state}: unknown state`);
      if (!clip.frames.length || clip.frames.length !== clip.duration.length) errors.push(`${id}.${state}: frame/duration mismatch`);
      clip.frames.forEach((frame, index) => {
        if (frame.width <= 0 || frame.height <= 0 || frame.x < 0 || frame.y < 0) errors.push(`${id}.${state}[${index}]: invalid rect`);
      });
    }
  }
  return errors;
}
