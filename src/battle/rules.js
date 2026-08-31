import { hexDistance, hexKey, isInside, reachableHexes, sameHex } from "./hex.js";

const DEFAULT_BOARD = Object.freeze({ width: 11, height: 9, blocked: [] });

function copyStack(stack) {
  const maxHp = stack.maxHp ?? stack.hp ?? 1;
  return {
    attack: 0,
    defense: 0,
    damage: { min: 1, max: 1 },
    speed: 1,
    ranged: false,
    shots: stack.ranged ? 12 : 0,
    retaliations: 1,
    waited: false,
    defended: false,
    ...stack,
    position: { ...stack.position },
    damage: { min: 1, max: 1, ...stack.damage },
    maxHp,
    currentHp: stack.currentHp ?? maxHp,
  };
}

export function livingStacks(battle, side) {
  return battle.stacks.filter((stack) => stack.count > 0 && (!side || stack.side === side));
}

export function createBattle(stacks, board = DEFAULT_BOARD) {
  if (!Array.isArray(stacks) || stacks.length < 2) throw new Error("Battle needs at least two stacks");
  const ids = new Set();
  const cells = new Set();
  const normalized = stacks.map(copyStack);
  const normalizedBoard = { ...DEFAULT_BOARD, ...board, blocked: [...(board.blocked ?? [])] };
  const blocked = new Set(normalizedBoard.blocked.map(hexKey));
  for (const stack of normalized) {
    if (!stack.id || ids.has(stack.id)) throw new Error("Every stack needs a unique id");
    if (!stack.side) throw new Error(`Stack ${stack.id} needs a side`);
    if (stack.count < 1) throw new Error(`Stack ${stack.id} must contain creatures`);
    const cell = hexKey(stack.position);
    if (!isInside(normalizedBoard, stack.position)) throw new Error(`Stack ${stack.id} is outside the board`);
    if (blocked.has(cell)) throw new Error(`Stack ${stack.id} is on a blocked cell`);
    if (cells.has(cell)) throw new Error(`Cell ${cell} is occupied twice`);
    ids.add(stack.id);
    cells.add(cell);
  }
  const battle = {
    board: normalizedBoard,
    stacks: normalized,
    round: 0,
    phase: "initiative",
    queue: [],
    activeId: null,
    winner: null,
    log: [],
  };
  startRound(battle);
  return battle;
}

export function getStack(battle, id) {
  const stack = battle.stacks.find((candidate) => candidate.id === id && candidate.count > 0);
  if (!stack) throw new Error(`Unknown living stack: ${id}`);
  return stack;
}

function initiativeSort(a, b) {
  return b.speed - a.speed || String(a.side).localeCompare(String(b.side)) || String(a.id).localeCompare(String(b.id));
}

export function startRound(battle) {
  battle.round += 1;
  battle.phase = "initiative";
  for (const stack of livingStacks(battle)) {
    stack.retaliations = 1;
    stack.waited = false;
    stack.defended = false;
  }
  battle.queue = livingStacks(battle).sort(initiativeSort).map(({ id }) => id);
  battle.activeId = battle.queue[0] ?? null;
  return battle;
}

function advanceTurn(battle) {
  battle.queue.shift();
  const livingIds = new Set(livingStacks(battle).map(({ id }) => id));
  battle.queue = battle.queue.filter((id) => livingIds.has(id));
  if (!battle.queue.length && battle.phase === "initiative") {
    battle.phase = "waiting";
    battle.queue = livingStacks(battle)
      .filter((stack) => stack.waited)
      .sort((a, b) => a.speed - b.speed || String(a.id).localeCompare(String(b.id)))
      .map(({ id }) => id);
  }
  if (!battle.queue.length && !battle.winner) startRound(battle);
  battle.activeId = battle.queue[0] ?? null;
}

function requireTurn(battle, id) {
  if (battle.winner) throw new Error("Battle is over");
  if (battle.activeId !== id) throw new Error(`It is not ${id}'s turn`);
  return getStack(battle, id);
}

export function reachableForStack(battle, id) {
  const stack = getStack(battle, id);
  return reachableHexes({
    origin: stack.position,
    range: stack.speed,
    board: battle.board,
    occupied: livingStacks(battle).filter((other) => other.id !== id).map((other) => other.position),
    blocked: battle.board.blocked,
  });
}

export function moveStack(battle, id, destination) {
  const stack = requireTurn(battle, id);
  const destinationEntry = reachableForStack(battle, id).find((hex) => sameHex(hex, destination));
  if (!destinationEntry || destinationEntry.distance === 0) throw new Error("Destination is not reachable");
  stack.position = { q: destination.q, r: destination.r };
  battle.log.push({ type: "move", stackId: id, destination: { ...destination }, distance: destinationEntry.distance });
  advanceTurn(battle);
  return battle;
}

export function calculateDamage(attacker, defender, { roll = 0.5, ranged = false } = {}) {
  const unitDamage = attacker.damage.min + Math.floor((attacker.damage.max - attacker.damage.min + 1) * Math.min(0.999999, Math.max(0, roll)));
  const difference = attacker.attack - defender.defense - (defender.defended ? 3 : 0);
  const multiplier = difference >= 0 ? 1 + Math.min(difference, 20) * 0.1 : 1 + Math.max(difference, -14) * 0.05;
  const rangePenalty = ranged && hexDistance(attacker.position, defender.position) > 5 ? 0.5 : 1;
  return Math.max(1, Math.floor(attacker.count * unitDamage * multiplier * rangePenalty));
}

export function applyDamage(stack, damage) {
  const totalHp = (stack.count - 1) * stack.maxHp + stack.currentHp;
  const remainingHp = Math.max(0, totalHp - damage);
  const oldCount = stack.count;
  stack.count = Math.ceil(remainingHp / stack.maxHp);
  stack.currentHp = remainingHp ? ((remainingHp - 1) % stack.maxHp) + 1 : 0;
  return oldCount - stack.count;
}

function hasAdjacentEnemy(battle, attacker) {
  return livingStacks(battle).some((stack) => stack.side !== attacker.side && hexDistance(stack.position, attacker.position) === 1);
}

function resolveStrike(battle, attacker, defender, options) {
  const damage = calculateDamage(attacker, defender, options);
  const casualties = applyDamage(defender, damage);
  battle.log.push({ type: options.retaliation ? "retaliation" : options.ranged ? "ranged" : "melee", attackerId: attacker.id, defenderId: defender.id, damage, casualties });
  return { damage, casualties };
}

function determineWinner(battle) {
  const sides = new Set(livingStacks(battle).map(({ side }) => side));
  if (sides.size <= 1) {
    battle.winner = sides.values().next().value ?? "draw";
    battle.queue = [];
    battle.activeId = null;
  }
  return battle.winner;
}

export function attackStack(battle, attackerId, defenderId, { roll = 0.5 } = {}) {
  const attacker = requireTurn(battle, attackerId);
  const defender = getStack(battle, defenderId);
  if (attacker.side === defender.side) throw new Error("Cannot attack an allied stack");
  const distance = hexDistance(attacker.position, defender.position);
  const ranged = attacker.ranged && attacker.shots > 0 && !hasAdjacentEnemy(battle, attacker);
  if (!ranged && distance !== 1) throw new Error("Melee attacks require adjacency");
  if (ranged) attacker.shots -= 1;
  const result = resolveStrike(battle, attacker, defender, { roll, ranged });

  if (!ranged && defender.count > 0 && defender.retaliations > 0) {
    defender.retaliations -= 1;
    result.retaliation = resolveStrike(battle, defender, attacker, { roll, retaliation: true });
  }
  determineWinner(battle);
  if (!battle.winner) advanceTurn(battle);
  return result;
}

export function waitStack(battle, id) {
  const stack = requireTurn(battle, id);
  if (battle.phase !== "initiative" || stack.waited) throw new Error("Stack cannot wait again");
  stack.waited = true;
  battle.log.push({ type: "wait", stackId: id });
  advanceTurn(battle);
  return battle;
}

export function defendStack(battle, id) {
  const stack = requireTurn(battle, id);
  stack.defended = true;
  battle.log.push({ type: "defend", stackId: id, defenseBonus: 3 });
  advanceTurn(battle);
  return battle;
}

export function battleOutcome(battle) {
  return { winner: battle.winner, survivors: livingStacks(battle).map(({ id, side, count, currentHp }) => ({ id, side, count, currentHp })) };
}
