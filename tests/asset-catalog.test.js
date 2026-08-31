import assert from "node:assert/strict";
import test from "node:test";
import { CREATURE_CATALOG, SEMANTIC_STATES, validateCatalog } from "../src/assets/animation-catalog.js";

test("catalog metadata and frame rectangles are internally consistent", () => {
  assert.deepEqual(validateCatalog(), []);
  assert.equal(Object.keys(CREATURE_CATALOG).length, 6);
  for (const creature of Object.values(CREATURE_CATALOG)) {
    for (const state of ["idle", "move", "attack", "ranged", "hit", "death"]) {
      assert.ok(creature.animations[state], `${creature.id}.${state} is declarative`);
      assert.match(creature.animations[state].confidence, new RegExp(`fallback:${state}$`));
    }
    assert.equal(creature.animations.death.loop, false);
    assert.deepEqual([...creature.missingStates].sort(), SEMANTIC_STATES.filter((s) => !["idle", "move", "attack", "ranged", "hit", "death"].includes(s)).sort());
    assert.match(creature.provenance.url, /^https:\/\//);
    const last = creature.animations.idle.frames.at(-1);
    assert.equal(last.x + last.width, creature.sheet.frameWidth * creature.sheet.columns);
  }
});

test("catalog is immutable at its public boundaries", () => {
  assert.throws(() => { CREATURE_CATALOG.archer.animations.idle.frames.push({}); }, TypeError);
  assert.throws(() => { CREATURE_CATALOG.archer.missingStates.push("idle"); }, TypeError);
});
