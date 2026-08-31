import test from "node:test";
import assert from "node:assert/strict";
import {
  attackStack,
  battleOutcome,
  createBattle,
  defendStack,
  hexDistance,
  moveStack,
  reachableForStack,
  waitStack,
} from "../src/battle/index.js";

function stack(id, side, q, r, overrides = {}) {
  return { id, side, position: { q, r }, count: 10, maxHp: 10, speed: 3, attack: 5, defense: 5, damage: { min: 2, max: 2 }, ...overrides };
}

test("axial distance, occupancy and blockers constrain movement reach", () => {
  const battle = createBattle([
    stack("knights", "player", 0, 0, { speed: 4 }),
    stack("orc", "enemy", 1, 0, { speed: 3 }),
  ], { width: 5, height: 5, blocked: [{ q: 0, r: 1 }] });
  assert.equal(hexDistance({ q: 0, r: 0 }, { q: 2, r: 1 }), 3);
  const reachable = reachableForStack(battle, "knights").map(({ q, r }) => `${q},${r}`);
  assert.deepEqual(reachable, ["0,0"]);
  assert.throws(() => moveStack(battle, "knights", { q: 1, r: 0 }), /not reachable/);
});

test("initiative orders by speed and waiting acts in the second phase", () => {
  const battle = createBattle([
    stack("fast", "player", 0, 0, { speed: 7 }),
    stack("slow", "enemy", 4, 4, { speed: 2 }),
  ], { width: 6, height: 6 });
  assert.equal(battle.activeId, "fast");
  waitStack(battle, "fast");
  assert.equal(battle.activeId, "slow");
  defendStack(battle, "slow");
  assert.equal(battle.phase, "waiting");
  assert.equal(battle.activeId, "fast");
});

test("melee requires adjacency and retaliates only once per round", () => {
  const battle = createBattle([
    stack("swords", "player", 0, 0, { speed: 8 }),
    stack("goblins", "enemy", 1, 0, { count: 30, maxHp: 5, speed: 2, damage: { min: 1, max: 1 } }),
  ]);
  const result = attackStack(battle, "swords", "goblins", { roll: 0 });
  assert.equal(result.damage, 20);
  assert.equal(result.casualties, 4);
  assert.equal(result.retaliation.damage, 26);
  assert.equal(battle.stacks.find(({ id }) => id === "goblins").retaliations, 0);
  assert.equal(battle.log.at(-1).type, "retaliation");
});

test("ranged attacks spend shots, do not trigger retaliation, and suffer long-range penalty", () => {
  const battle = createBattle([
    stack("archers", "player", 0, 0, { ranged: true, shots: 2, speed: 8 }),
    stack("ogres", "enemy", 8, 0, { count: 20 }),
  ]);
  const result = attackStack(battle, "archers", "ogres", { roll: 0 });
  assert.equal(result.damage, 10);
  assert.equal(result.retaliation, undefined);
  assert.equal(battle.stacks[0].shots, 1);
  assert.equal(battle.log.at(-1).type, "ranged");
});

test("an adjacent enemy forces a shooter into melee", () => {
  const battle = createBattle([
    stack("archers", "player", 0, 0, { ranged: true, shots: 4, speed: 8 }),
    stack("wolf", "enemy", 1, 0),
  ]);
  attackStack(battle, "archers", "wolf", { roll: 0 });
  assert.equal(battle.stacks[0].shots, 4);
  assert.equal(battle.log[0].type, "melee");
  assert.equal(battle.log[1].type, "retaliation");
});

test("defend reduces incoming damage and expires on the following round", () => {
  const battle = createBattle([
    stack("guard", "player", 0, 0, { speed: 8 }),
    stack("raider", "enemy", 1, 0, { speed: 2 }),
  ]);
  defendStack(battle, "guard");
  const result = attackStack(battle, "raider", "guard", { roll: 0 });
  assert.equal(result.damage, 17);
  assert.equal(battle.round, 2);
  assert.equal(battle.stacks[0].defended, false);
});

test("casualties preserve top creature HP and victory reports persistent survivors", () => {
  const battle = createBattle([
    stack("champion", "player", 0, 0, { count: 2, damage: { min: 10, max: 10 }, speed: 8 }),
    stack("peasant", "enemy", 1, 0, { count: 3, maxHp: 1 }),
  ]);
  attackStack(battle, "champion", "peasant", { roll: 0 });
  assert.equal(battle.winner, "player");
  assert.equal(battle.activeId, null);
  assert.deepEqual(battleOutcome(battle), {
    winner: "player",
    survivors: [{ id: "champion", side: "player", count: 2, currentHp: 10 }],
  });
});

test("a killed queued stack is skipped before the next turn", () => {
  const battle = createBattle([
    stack("champion", "player", 0, 0, { count: 10, damage: { min: 20, max: 20 }, speed: 8 }),
    stack("victim", "enemy", 1, 0, { count: 1, maxHp: 1, speed: 6 }),
    stack("reserve", "enemy", 3, 0, { speed: 2 }),
  ]);
  attackStack(battle, "champion", "victim", { roll: 0 });
  assert.equal(battle.activeId, "reserve");
  assert.equal(battle.queue.includes("victim"), false);
});

test("initial stacks must be inside an unblocked board cell", () => {
  assert.throws(() => createBattle([
    stack("outside", "player", 9, 0),
    stack("enemy", "enemy", 1, 0),
  ], { width: 4, height: 4 }), /outside the board/);
  assert.throws(() => createBattle([
    stack("blocked", "player", 0, 0),
    stack("enemy", "enemy", 1, 0),
  ], { width: 4, height: 4, blocked: [{ q: 0, r: 0 }] }), /blocked cell/);
});
