const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { chromium } = require("playwright");

const chrome = ["/usr/bin/google-chrome-stable", "/usr/bin/chromium"].find(fs.existsSync);
const evidence = path.join(os.tmpdir(), "heroes2-gauntlet", "battle-flow");
fs.mkdirSync(evidence, { recursive: true });

const key = ({ q, r }) => `${q},${r}`;
const distance = (a, b) => (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q - b.q + a.r - b.r)) / 2;
const directions = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];

function reachable(stack, battle) {
  const occupied = new Set(battle.engine.stacks.filter((other) => other.count > 0 && other.id !== stack.id).map((other) => key(other.position)));
  const queue = [{ ...stack.position, steps: 0 }];
  const found = new Map([[key(stack.position), queue[0]]]);
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    if (current.steps >= stack.speed) continue;
    for (const [dq, dr] of directions) {
      const next = { q: current.q + dq, r: current.r + dr, steps: current.steps + 1 };
      if (next.q < 0 || next.q >= battle.engine.board.width || next.r < 0 || next.r >= battle.engine.board.height) continue;
      if (occupied.has(key(next)) || found.has(key(next))) continue;
      found.set(key(next), next);
      queue.push(next);
    }
  }
  return [...found.values()];
}

(async () => {
  const browser = await chromium.launch(chrome ? { executablePath: chrome } : {});
  const page = await browser.newPage({ viewport: { width: 1365, height: 820 } });
  const errors = [];
  page.on("console", (message) => { if (message.type() === "error") errors.push(`console: ${message.text()}`); });
  page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
  const snapshot = () => page.evaluate(() => window.__heroes2Debug.snapshot());
  const waitForPlayer = () => page.waitForFunction(() => {
    const state = window.__heroes2Debug.snapshot();
    if (state.screen !== "battle" || state.battle.locked) return false;
    return state.battle.engine.stacks.find((stack) => stack.id === state.battle.engine.activeId)?.side === "player";
  }, null, { timeout: 10000 });
  const clickCell = async (cell) => {
    const state = await snapshot();
    const rendered = state.battle.cells.find(({ q, r }) => q === cell.q && r === cell.r);
    assert.ok(rendered, `rendered cell ${cell.q},${cell.r}`);
    const box = await page.locator("#game").boundingBox();
    await page.mouse.click(box.x + rendered.x * box.width / state.logicalSize.width, box.y + rendered.y * box.height / state.logicalSize.height);
  };

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  const initial = await snapshot();
  for (let step = 0; step < 5; step += 1) {
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(90);
  }
  await page.waitForFunction(() => window.__heroes2Debug.snapshot().screen === "battle");
  await page.screenshot({ path: path.join(evidence, "battle-before.png"), fullPage: true });

  await waitForPlayer();
  let state = await snapshot();
  const waitingId = state.battle.engine.activeId;
  await page.click("#waitBattle");
  state = await snapshot();
  assert.equal(state.battle.engine.stacks.find(({ id }) => id === waitingId).waited, true, "Wait affects the active stack");
  assert.equal(state.battle.engine.log.at(-1).type, "wait");

  await waitForPlayer();
  state = await snapshot();
  let active = state.battle.engine.stacks.find(({ id }) => id === state.battle.engine.activeId);
  let enemy = state.battle.engine.stacks.find((stack) => stack.side === "enemy" && stack.count > 0);
  assert.equal(active.ranged, true, "archer follows the waiting stack");
  const rangedPosition = { ...active.position };
  const rangedShots = active.shots;
  await clickCell(enemy.position);
  await page.waitForTimeout(80);
  state = await snapshot();
  const shooterAfter = state.battle.engine.stacks.find(({ id }) => id === active.id);
  assert.deepEqual(shooterAfter.position, rangedPosition, "ranged attack does not move the shooter");
  assert.equal(shooterAfter.shots, rangedShots - 1, "ranged attack spends ammunition");
  let rangedShotObserved = true;

  await waitForPlayer();
  state = await snapshot();
  active = state.battle.engine.stacks.find(({ id }) => id === state.battle.engine.activeId);
  enemy = state.battle.engine.stacks.find((stack) => stack.side === "enemy" && stack.count > 0);
  assert.ok(distance(active.position, enemy.position) > 1 && !active.ranged, "far-melee scenario is deterministic");
  const logLength = state.battle.engine.log.length;
  await clickCell(enemy.position);
  await page.waitForTimeout(80);
  state = await snapshot();
  assert.equal(state.battle.engine.log.length, logLength, "melee cannot attack from range");
  assert.match(state.battle.message, /adyacente/);
  const defendingId = state.battle.engine.activeId;
  await page.click("#defendBattle");
  state = await snapshot();
  assert.equal(state.battle.engine.stacks.find(({ id }) => id === defendingId).defended, true, "Defend affects the active stack");
  assert.equal(state.battle.engine.log.at(-1).type, "defend");

  for (let action = 0; action < 80; action += 1) {
    state = await snapshot();
    if (state.screen === "adventure") break;
    if (state.battle.engine.winner) { await page.waitForTimeout(900); continue; }
    if (state.battle.locked) { await page.waitForTimeout(120); continue; }
    active = state.battle.engine.stacks.find(({ id }) => id === state.battle.engine.activeId);
    if (!active || active.side === "enemy") { await page.waitForTimeout(160); continue; }
    enemy = state.battle.engine.stacks.find((stack) => stack.side === "enemy" && stack.count > 0);
    if (!enemy) { await page.waitForTimeout(600); continue; }
    const engaged = state.battle.engine.stacks.some((stack) => stack.side !== active.side && stack.count > 0 && distance(stack.position, active.position) === 1);
    if (active.ranged && active.shots > 0 && !engaged) {
      const beforePosition = { ...active.position };
      const beforeShots = active.shots;
      await clickCell(enemy.position);
      await page.waitForTimeout(80);
      const after = await snapshot();
      const shooter = after.battle?.engine.stacks.find(({ id }) => id === active.id);
      assert.deepEqual(shooter.position, beforePosition, "ranged attack does not move the shooter");
      assert.equal(shooter.shots, beforeShots - 1, "ranged attack spends ammunition");
      rangedShotObserved = true;
    } else if (distance(active.position, enemy.position) === 1) {
      await clickCell(enemy.position);
    } else {
      const destination = reachable(active, state.battle)
        .filter((cell) => cell.steps > 0)
        .sort((a, b) => distance(a, enemy.position) - distance(b, enemy.position) || b.steps - a.steps)[0];
      assert.ok(destination, "active stack has a movement destination");
      await clickCell(destination);
    }
    await page.waitForTimeout(120);
  }

  await page.waitForFunction(() => window.__heroes2Debug.snapshot().screen === "adventure", null, { timeout: 12000 });
  const finished = await snapshot();
  await page.screenshot({ path: path.join(evidence, "battle-after.png"), fullPage: true });
  assert.equal(rangedShotObserved, true);
  assert.equal(finished.objects.some(({ x, y, type }) => x === 9 && y === 6 && type === "neutral"), false, "defeated neutral is removed");
  assert.equal(finished.resources.gold, initial.resources.gold + 450, "victory reward persists");
  assert.ok(finished.army.some(({ count }) => count > 0), "survivors persist on the adventure map");
  assert.deepEqual(errors, [], "battle flow has zero browser errors");
  await browser.close();
  console.log(JSON.stringify({ winner: "player", rangedShotObserved, survivors: finished.army, evidence, errors }, null, 2));
})().catch((error) => { console.error(error); process.exit(1); });
