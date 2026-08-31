import { ASSETS } from "./asset-manifest.js";
import { CREATURE_CATALOG } from "./assets/animation-catalog.js";
import {
  attackStack,
  battleOutcome,
  createBattle,
  defendStack,
  hexDistance,
  moveStack,
  reachableForStack,
  waitStack,
} from "./battle/index.js";

const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const portrait = document.querySelector("#portrait");
const pctx = portrait.getContext("2d");
const resourcesEl = document.querySelector("#resources");
const armyEl = document.querySelector("#army");
const logEl = document.querySelector("#log");
const badgeEl = document.querySelector("#screenBadge");
const objectiveEl = document.querySelector("#objective");

const TILE = 48;
const SRC_TILE = 32;
const WORLD_W = 28;
const WORLD_H = 20;
const DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

const terrainTiles = {
  water: [[0, 0], [32, 0], [64, 0], [96, 0]],
  grass: [[0, 96], [32, 96], [64, 128], [160, 128], [256, 160], [352, 160]],
  road: [[64, 64], [96, 96], [128, 160], [224, 192], [352, 96]],
  snow: [[0, 224], [64, 224], [160, 256], [288, 256], [384, 224]],
  swamp: [[0, 320], [64, 320], [160, 352], [288, 352], [384, 352]],
  lava: [[0, 384], [64, 384], [160, 416], [288, 416], [384, 416]],
  desert: [[0, 512], [64, 512], [160, 544], [256, 544], [384, 544]],
  dirt: [[0, 640], [64, 640], [160, 672], [288, 672], [384, 672]],
  waste: [[0, 736], [64, 736], [160, 768], [256, 768], [384, 800]],
};

const creatureStats = {
  peasant: { name: "Peasants", hp: 1, dmg: 1, sprite: "peasant", cost: 20, speed: 3 },
  archer: { name: "Archers", hp: 2, dmg: 2, sprite: "archer", cost: 80, ranged: true, speed: 4, shots: 12 },
  paladin: { name: "Paladins", hp: 10, dmg: 7, sprite: "paladin", cost: 500, speed: 5 },
  skeleton: { name: "Skeletons", hp: 3, dmg: 2, sprite: "skeleton", speed: 4 },
  goblin: { name: "Goblins", hp: 2, dmg: 2, sprite: "goblin", speed: 3 },
  dragon: { name: "Red Dragons", hp: 25, dmg: 14, sprite: "dragon", speed: 7 },
};

const BATTLE_BOARD = Object.freeze({ width: 9, height: 7, blocked: [] });
const BATTLE_ACTION_TICKS = 32;

const resourceDefs = {
  gold: ["G", "Oro"],
  wood: ["W", "Madera"],
  ore: ["O", "Piedra"],
  gems: ["J", "Gemas"],
};

// Runtime crops from the overworld sheet already shipped on main. These replace
// provisional geometry without introducing derived image files.
const overworldObjectCrops = Object.freeze({
  ore: Object.freeze({ x: 256, y: 128, width: 32, height: 32 }),
});

let images = {};
let logicalW = 960;
let logicalH = 640;
let mouse = { x: 0, y: 0 };
let anim = 0;

const state = {
  screen: "adventure",
  day: 1,
  movement: 18,
  resources: { gold: 2500, wood: 8, ore: 8, gems: 2 },
  mines: { gold: 0, wood: 0, ore: 0, gems: 0 },
  hero: { x: 4, y: 6, attack: 3, defense: 2, power: 1, portrait: 0 },
  army: [
    { type: "peasant", count: 24 },
    { type: "archer", count: 12 },
    { type: "paladin", count: 2 },
  ],
  objects: [],
  castle: { x: 4, y: 6, dwellings: { peasant: 18, archer: 8, paladin: 2 } },
  path: [],
  battle: null,
  uiZones: [],
  log: [],
};

function addLog(text, kind = "") {
  state.log.unshift({ text, kind });
  state.log = state.log.slice(0, 10);
  logEl.innerHTML = state.log
    .map((line) => `<p>${line.kind ? `<strong>${line.kind}</strong> ` : ""}${line.text}</p>`)
    .join("");
}

function pick(list, x, y) {
  return list[Math.abs((x * 37 + y * 17 + x * y * 3) % list.length)];
}

function generateWorld() {
  const world = [];
  for (let y = 0; y < WORLD_H; y += 1) {
    const row = [];
    for (let x = 0; x < WORLD_W; x += 1) {
      let terrain = "grass";
      if (y < 2 || x > 24) terrain = "water";
      if (x > 18 && y < 7) terrain = "snow";
      if (x > 18 && y > 13) terrain = "desert";
      if (x < 6 && y > 14) terrain = "waste";
      if (x > 10 && x < 18 && y > 11) terrain = "swamp";
      if (x > 8 && x < 15 && y > 2 && y < 5) terrain = "dirt";
      const road = (y === 6 && x > 3 && x < 22) || (x === 16 && y > 5 && y < 16);
      if (road) terrain = "road";
      row.push({ terrain, tile: pick(terrainTiles[terrain], x, y), passable: terrain !== "water" });
    }
    world.push(row);
  }
  return world;
}

let world = generateWorld();

function seedObjects() {
  state.objects = [
    { type: "mine", res: "gold", x: 15, y: 5, owner: false },
    { type: "mine", res: "wood", x: 10, y: 9, owner: false },
    { type: "mine", res: "ore", x: 21, y: 14, owner: false },
    { type: "mine", res: "gems", x: 6, y: 16, owner: false },
    { type: "resource", res: "gold", amount: 700, x: 7, y: 7 },
    { type: "resource", res: "wood", amount: 4, x: 12, y: 5 },
    { type: "resource", res: "ore", amount: 5, x: 17, y: 9 },
    { type: "resource", res: "gems", amount: 2, x: 23, y: 16 },
    { type: "chest", x: 13, y: 13, amount: 1100 },
    { type: "artifact", x: 20, y: 4 },
    { type: "neutral", x: 9, y: 6, enemy: "goblin", count: 18, reward: 450 },
    { type: "neutral", x: 16, y: 10, enemy: "skeleton", count: 22, reward: 650 },
    { type: "neutral", x: 22, y: 15, enemy: "dragon", count: 1, reward: 1800 },
  ];
}

function resetGame() {
  world = generateWorld();
  seedObjects();
  state.screen = "adventure";
  state.day = 1;
  state.movement = 18;
  state.resources = { gold: 2500, wood: 8, ore: 8, gems: 2 };
  state.mines = { gold: 0, wood: 0, ore: 0, gems: 0 };
  state.hero = { x: 4, y: 6, attack: 3, defense: 2, power: 1, portrait: 0 };
  state.army = [
    { type: "peasant", count: 24 },
    { type: "archer", count: 12 },
    { type: "paladin", count: 2 },
  ];
  state.castle.dwellings = { peasant: 18, archer: 8, paladin: 2 };
  state.path = [];
  state.battle = null;
  state.log = [];
  addLog("El estandarte se alza sobre el valle. Explora y junta fuerzas.", "Dia 1");
  updateUI();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    img.src = src;
  });
}

async function preload() {
  const entries = [
    ["overworld", ASSETS.sheets.overworld],
    ["portraits", ASSETS.sheets.portraits],
    ["artifacts", ASSETS.sheets.artifacts],
    ["spells", ASSETS.sheets.spells],
    ["townBg", ASSETS.town.background],
    ["castle", ASSETS.town.castle.src],
    ["dwellingArcher", ASSETS.town.dwellings[0].src],
    ["dwellingSwords", ASSETS.town.dwellings[1].src],
    ["dwellingPaladin", ASSETS.town.dwellings[2].src],
    ...Object.entries(ASSETS.units).map(([key, data]) => [key, data.src]),
  ];
  images = Object.fromEntries(await Promise.all(entries.map(async ([key, src]) => [key, await loadImage(src)])));
}

function resize() {
  const rect = canvas.parentElement.getBoundingClientRect();
  logicalW = Math.max(640, Math.floor(rect.width));
  logicalH = Math.max(420, Math.floor(rect.height));
  canvas.width = Math.floor(logicalW * DPR);
  canvas.height = Math.floor(logicalH * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function updateUI() {
  resourcesEl.innerHTML = Object.entries(resourceDefs)
    .map(([key, [icon, label]]) => `<div class="resource"><span>${icon}</span>${state.resources[key]}<br><small>${label}</small></div>`)
    .join("") + `<div class="resource"><span>D</span>${state.day}<br><small>Dia</small></div>`;

  armyEl.innerHTML = state.army
    .filter((slot) => slot.count > 0)
    .map((slot, i) => {
      const def = creatureStats[slot.type];
      return `<div class="army-row"><canvas width="42" height="42" data-army="${i}"></canvas><div><strong>${def.name}</strong><small>${def.ranged ? "Rango" : "Melee"}</small></div><b>${slot.count}</b></div>`;
    })
    .join("");

  for (const mini of armyEl.querySelectorAll("canvas")) {
    const slot = state.army[Number(mini.dataset.army)];
    const c = mini.getContext("2d");
    c.imageSmoothingEnabled = false;
    c.clearRect(0, 0, 42, 42);
    drawUnitFrame(c, creatureStats[slot.type].sprite, 0, 21, 38, 0.48, false);
  }
}

function drawPortrait() {
  pctx.imageSmoothingEnabled = false;
  pctx.clearRect(0, 0, 101, 93);
  pctx.drawImage(images.portraits, 10, 10, 101, 93, 0, 0, 101, 93);
}

function drawUnitFrame(target, key, frame, x, y, scale = 1, flip = false) {
  const meta = ASSETS.units[key];
  const img = images[key];
  if (!img || !meta) return;
  const f = Math.floor(frame) % meta.frames;
  const dw = meta.frameW * scale;
  const dh = meta.frameH * scale;
  target.save();
  if (flip) {
    target.translate(x + dw / 2, y - dh);
    target.scale(-1, 1);
    target.drawImage(img, f * meta.frameW, 0, meta.frameW, meta.frameH, -dw / 2, 0, dw, dh);
  } else {
    target.drawImage(img, f * meta.frameW, 0, meta.frameW, meta.frameH, x - dw / 2, y - dh, dw, dh);
  }
  target.restore();
}

function drawTile(x, y, sx, sy) {
  ctx.drawImage(images.overworld, sx, sy, SRC_TILE, SRC_TILE, x, y, TILE, TILE);
}

function camera() {
  const cols = Math.ceil(logicalW / TILE);
  const rows = Math.ceil(logicalH / TILE);
  return {
    x: Math.max(0, Math.min(WORLD_W - cols, state.hero.x - Math.floor(cols / 2))),
    y: Math.max(0, Math.min(WORLD_H - rows, state.hero.y - Math.floor(rows / 2))),
  };
}

function worldToScreen(x, y, cam = camera()) {
  return { x: (x - cam.x) * TILE, y: (y - cam.y) * TILE };
}

function objectAt(x, y) {
  return state.objects.find((obj) => obj.x === x && obj.y === y);
}

function drawAdventure() {
  badgeEl.textContent = "Aventura";
  objectiveEl.textContent = `Movimiento ${state.movement} | captura minas y vence guardianes`;
  const cam = camera();
  const cols = Math.ceil(logicalW / TILE) + 1;
  const rows = Math.ceil(logicalH / TILE) + 1;
  ctx.fillStyle = "#071118";
  ctx.fillRect(0, 0, logicalW, logicalH);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const wx = cam.x + x;
      const wy = cam.y + y;
      if (!world[wy] || !world[wy][wx]) continue;
      const tile = world[wy][wx].tile;
      drawTile(x * TILE, y * TILE, tile[0], tile[1]);
      ctx.strokeStyle = "rgba(20, 13, 5, 0.22)";
      ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
    }
  }

  drawCastle(cam);
  drawAdventurePath(cam);
  state.objects.forEach((obj) => drawObject(obj, cam));
  drawHero(cam);
  drawMiniMap();
}

function drawCastle(cam) {
  const pos = worldToScreen(state.castle.x, state.castle.y, cam);
  ctx.drawImage(images.castle, pos.x - 18, pos.y - 58, 110, 74);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(pos.x + 8, pos.y + 34, 62, 8);
}

function drawObject(obj, cam) {
  const pos = worldToScreen(obj.x, obj.y, cam);
  const cx = pos.x + TILE / 2;
  const cy = pos.y + TILE / 2;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 3;
  if (obj.type === "neutral") {
    drawUnitFrame(ctx, creatureStats[obj.enemy].sprite, Math.floor(anim / 12), cx, pos.y + 52, obj.enemy === "dragon" ? 0.52 : 0.72, true);
    drawBadge(cx + 16, pos.y + 39, obj.count);
  } else if (obj.type === "mine") {
    drawMine(cx, cy, obj.res, obj.owner);
  } else if (obj.type === "resource") {
    drawResourcePile(cx, cy, obj.res);
  } else if (obj.type === "chest") {
    drawChest(cx, cy);
  } else if (obj.type === "artifact") {
    ctx.drawImage(images.artifacts, 15, 12, 44, 44, cx - 18, cy - 24, 36, 36);
  }
  ctx.restore();
}

function drawHero(cam) {
  const pos = worldToScreen(state.hero.x, state.hero.y, cam);
  const frame = Math.floor(anim / 8) % ASSETS.units.heroMap.frames;
  drawUnitFrame(ctx, "heroMap", frame, pos.x + TILE / 2, pos.y + 50, 1.25, false);
  ctx.strokeStyle = "#ffe46f";
  ctx.lineWidth = 2;
  ctx.strokeRect(pos.x + 5, pos.y + 5, TILE - 10, TILE - 10);
}

function drawMine(x, y, res, owner) {
  ctx.fillStyle = owner ? "#e4c157" : "#5a2d1a";
  ctx.beginPath();
  ctx.moveTo(x - 18, y + 15);
  ctx.lineTo(x - 9, y - 12);
  ctx.lineTo(x + 10, y - 19);
  ctx.lineTo(x + 21, y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#201005";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = res === "gems" ? "#6de1ff" : res === "gold" ? "#ffdf4e" : res === "wood" ? "#62a541" : "#b7b7b7";
  ctx.fillRect(x - 5, y - 2, 10, 10);
}

function drawResourcePile(x, y, res) {
  const crop = overworldObjectCrops[res];
  if (crop) {
    ctx.drawImage(images.overworld, crop.x, crop.y, crop.width, crop.height, x - 22, y - 24, 44, 44);
    return;
  }
  ctx.fillStyle = res === "gold" ? "#f6cf42" : res === "wood" ? "#85501f" : res === "ore" ? "#aaa59a" : "#39d3ff";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(x - 11 + i * 7, y + 7 - (i % 2) * 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1508";
    ctx.stroke();
  }
}

function drawAdventurePath(cam) {
  if (!state.path.length) return;
  let x = state.hero.x;
  let y = state.hero.y;
  state.path.forEach(([dx, dy], index) => {
    x += dx;
    y += dy;
    const point = worldToScreen(x, y, cam);
    const cx = point.x + TILE / 2;
    const cy = point.y + TILE / 2;
    ctx.fillStyle = index === state.path.length - 1 ? "rgba(255, 230, 92, 0.72)" : "rgba(255, 247, 181, 0.52)";
    ctx.beginPath();
    ctx.arc(cx, cy, index === state.path.length - 1 ? 11 : 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#4b270c";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function drawChest(x, y) {
  ctx.fillStyle = "#8f4e1d";
  ctx.fillRect(x - 17, y - 7, 34, 23);
  ctx.fillStyle = "#d8b13e";
  ctx.fillRect(x - 17, y - 12, 34, 9);
  ctx.strokeStyle = "#1c0d05";
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 17, y - 12, 34, 28);
}

function drawBadge(x, y, value) {
  ctx.fillStyle = "#261307";
  ctx.fillRect(x - 13, y - 10, 26, 18);
  ctx.strokeStyle = "#ffe084";
  ctx.strokeRect(x - 13.5, y - 10.5, 27, 19);
  ctx.fillStyle = "#fff0b5";
  ctx.font = "bold 12px Arial";
  ctx.textAlign = "center";
  ctx.fillText(value, x, y + 4);
}

function drawMiniMap() {
  const w = 150;
  const h = 100;
  const x0 = logicalW - w - 14;
  const y0 = logicalH - h - 14;
  ctx.fillStyle = "rgba(20, 12, 5, 0.78)";
  ctx.fillRect(x0 - 5, y0 - 5, w + 10, h + 10);
  for (let y = 0; y < WORLD_H; y += 1) {
    for (let x = 0; x < WORLD_W; x += 1) {
      const t = world[y][x].terrain;
      ctx.fillStyle = { water: "#1a58a2", grass: "#2d7b31", road: "#c8a56c", snow: "#d8dce2", swamp: "#275743", lava: "#802215", desert: "#c29b3a", dirt: "#76502f", waste: "#81451b" }[t];
      ctx.fillRect(x0 + x * (w / WORLD_W), y0 + y * (h / WORLD_H), Math.ceil(w / WORLD_W), Math.ceil(h / WORLD_H));
    }
  }
  ctx.fillStyle = "#fff064";
  ctx.fillRect(x0 + state.hero.x * (w / WORLD_W), y0 + state.hero.y * (h / WORLD_H), 5, 5);
}

function passable(x, y) {
  return world[y] && world[y][x] && world[y][x].passable;
}

function tryMove(dx, dy) {
  if (state.screen !== "adventure" || state.movement <= 0) return;
  const nx = state.hero.x + dx;
  const ny = state.hero.y + dy;
  if (!passable(nx, ny)) {
    addLog("El terreno bloquea el paso.");
    return;
  }
  state.hero.x = nx;
  state.hero.y = ny;
  state.movement -= 1;
  resolveTile();
  updateUI();
}

function findPath(sx, sy, tx, ty) {
  const q = [{ x: sx, y: sy, path: [] }];
  const seen = new Set([`${sx},${sy}`]);
  for (let i = 0; i < q.length; i += 1) {
    const cur = q[i];
    if (cur.x === tx && cur.y === ty) return cur.path;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!seen.has(key) && passable(nx, ny)) {
        seen.add(key);
        q.push({ x: nx, y: ny, path: [...cur.path, [dx, dy]] });
      }
    }
  }
  return [];
}

function resolveTile() {
  if (state.hero.x === state.castle.x && state.hero.y === state.castle.y) {
    addLog("Has vuelto al castillo. Puedes reclutar tropas.");
    return;
  }
  const obj = objectAt(state.hero.x, state.hero.y);
  if (!obj) return;
  if (obj.type === "resource") {
    state.resources[obj.res] += obj.amount;
    addLog(`Recogiste ${obj.amount} de ${resourceDefs[obj.res][1]}.`);
    state.objects = state.objects.filter((item) => item !== obj);
  } else if (obj.type === "mine") {
    obj.owner = true;
    state.mines[obj.res] += 1;
    addLog(`La mina de ${resourceDefs[obj.res][1]} ahora trabaja para ti.`, "Mina");
  } else if (obj.type === "chest") {
    state.resources.gold += obj.amount;
    state.hero.attack += 1;
    addLog(`El cofre tenia ${obj.amount} de oro y una leccion de guerra. Ataque +1.`, "Tesoro");
    state.objects = state.objects.filter((item) => item !== obj);
  } else if (obj.type === "artifact") {
    state.hero.defense += 1;
    addLog("Encontraste una reliquia oxidada. Defensa +1.", "Artefacto");
    state.objects = state.objects.filter((item) => item !== obj);
  } else if (obj.type === "neutral") {
    startBattle(obj);
  }
}

function endTurn() {
  state.day += 1;
  state.movement = 18;
  state.resources.gold += 500 + state.mines.gold * 750;
  state.resources.wood += state.mines.wood * 2;
  state.resources.ore += state.mines.ore * 2;
  state.resources.gems += state.mines.gems;
  if (state.day % 7 === 1) {
    state.castle.dwellings.peasant += 18;
    state.castle.dwellings.archer += 8;
    state.castle.dwellings.paladin += 2;
    addLog("Nueva semana: las moradas vuelven a llenarse.", "Semana");
  } else {
    addLog("Amanece un nuevo dia. Las minas entregan su produccion.", `Dia ${state.day}`);
  }
  updateUI();
}

function stackFromArmy(slot, index) {
  const def = creatureStats[slot.type];
  return {
    id: `p-${index}`,
    armyIndex: index,
    side: "player",
    type: slot.type,
    count: slot.count,
    maxHp: def.hp,
    currentHp: def.hp,
    attack: state.hero.attack,
    defense: state.hero.defense,
    damage: { min: def.dmg, max: def.dmg },
    speed: def.speed,
    ranged: Boolean(def.ranged),
    shots: def.shots ?? 0,
    position: { q: 1, r: 1 + index * 2 },
  };
}

function startBattle(obj) {
  const players = state.army
    .map(stackFromArmy)
    .filter((stack) => stack.count > 0)
    .slice(0, 3);
  const enemyDef = creatureStats[obj.enemy];
  const enemy = {
    id: "e-0",
    side: "enemy",
    type: obj.enemy,
    count: obj.count,
    maxHp: enemyDef.hp,
    currentHp: enemyDef.hp,
    attack: 2,
    defense: 2,
    damage: { min: enemyDef.dmg, max: enemyDef.dmg },
    speed: enemyDef.speed,
    ranged: Boolean(enemyDef.ranged),
    shots: enemyDef.shots ?? 0,
    position: { q: 7, r: 3 },
  };
  const engine = createBattle([...players, enemy], BATTLE_BOARD);
  state.screen = "battle";
  state.battle = {
    source: obj,
    engine,
    message: "Selecciona una celda resaltada o un enemigo.",
    visual: { animations: {}, movement: null, locked: false, finishAt: null },
    cells: [],
  };
  for (const stack of engine.stacks) setStackAnimation(stack.id, "idle");
  addLog(`Te enfrentas a ${obj.count} ${enemyDef.name}.`, "Batalla");
  updateUI();
  scheduleComputerTurn();
}

function setStackAnimation(id, name, duration = BATTLE_ACTION_TICKS) {
  const b = state.battle;
  if (!b) return;
  b.visual.animations[id] = { name, startedAt: anim, duration };
}

function stackAnimation(stack) {
  const visual = state.battle?.visual.animations[stack.id];
  if (stack.count <= 0) return { name: "death", startedAt: visual?.startedAt ?? anim - BATTLE_ACTION_TICKS, duration: Infinity };
  if (!visual) return { name: "idle", startedAt: anim, duration: Infinity };
  if (visual.name !== "idle" && anim - visual.startedAt >= visual.duration) {
    setStackAnimation(stack.id, "idle", Infinity);
    return state.battle.visual.animations[stack.id];
  }
  return visual;
}

function battleGeometry() {
  const cellW = Math.min(82, logicalW / 10);
  const cellH = Math.min(70, logicalH / 8);
  return {
    cellW,
    cellH,
    ox: (logicalW - cellW * 9.5) / 2,
    oy: (logicalH - cellH * 7) / 2,
  };
}

function battleCellCenter(hex, geometry = battleGeometry()) {
  return {
    x: geometry.ox + hex.q * geometry.cellW + geometry.cellW / 2 + (hex.r % 2) * geometry.cellW / 2,
    y: geometry.oy + hex.r * geometry.cellH + geometry.cellH / 2,
  };
}

function currentStackPosition(stack) {
  const movement = state.battle?.visual.movement;
  if (!movement || movement.id !== stack.id) return battleCellCenter(stack.position);
  const progress = Math.min(1, (anim - movement.startedAt) / movement.duration);
  const eased = 1 - (1 - progress) ** 2;
  const from = battleCellCenter(movement.from);
  const to = battleCellCenter(movement.to);
  if (progress >= 1) {
    state.battle.visual.movement = null;
    state.battle.visual.locked = false;
    setStackAnimation(stack.id, "idle", Infinity);
    scheduleComputerTurn();
    return to;
  }
  return { x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased };
}

function drawBattle() {
  const b = state.battle;
  badgeEl.textContent = `Batalla · Ronda ${b.engine.round}`;
  objectiveEl.textContent = b.message;
  ctx.fillStyle = "#1d3c28";
  ctx.fillRect(0, 0, logicalW, logicalH);
  for (let y = 0; y < logicalH; y += TILE) {
    for (let x = 0; x < logicalW; x += TILE) {
      const src = pick(terrainTiles.grass, x / TILE, y / TILE);
      ctx.drawImage(images.overworld, src[0], src[1], SRC_TILE, SRC_TILE, x, y, TILE, TILE);
    }
  }

  const geometry = battleGeometry();
  const active = b.engine.stacks.find((stack) => stack.id === b.engine.activeId);
  const reachable = active && active.side === "player" && !b.visual.locked
    ? new Set(reachableForStack(b.engine, active.id).map(({ q, r }) => `${q},${r}`))
    : new Set();
  b.cells = [];
  for (let r = 0; r < BATTLE_BOARD.height; r += 1) {
    for (let q = 0; q < BATTLE_BOARD.width; q += 1) {
      const hex = { q, r };
      const center = battleCellCenter(hex, geometry);
      b.cells.push({ ...hex, ...center });
      if (reachable.has(`${q},${r}`) && (q !== active.position.q || r !== active.position.r)) {
        ctx.fillStyle = "rgba(85, 190, 91, 0.3)";
        fillHex(center.x, center.y, geometry.cellW * 0.46, geometry.cellH * 0.42);
      }
      ctx.strokeStyle = active?.position.q === q && active?.position.r === r ? "#fff18a" : "rgba(255, 232, 153, 0.42)";
      ctx.lineWidth = active?.position.q === q && active?.position.r === r ? 4 : 2;
      drawHex(center.x, center.y, geometry.cellW * 0.46, geometry.cellH * 0.42);
    }
  }

  for (const stack of b.engine.stacks) {
    const point = currentStackPosition(stack);
    drawBattleUnit(stack, point.x, point.y, stack.side === "enemy", stack.id === b.engine.activeId);
  }

  drawInitiativeBar(b);
  ctx.fillStyle = "rgba(38, 19, 7, 0.9)";
  ctx.fillRect(20, logicalH - 64, logicalW - 40, 44);
  ctx.strokeStyle = "#f3ce67";
  ctx.strokeRect(20.5, logicalH - 64.5, logicalW - 41, 45);
  ctx.fillStyle = "#ffe9a4";
  ctx.font = "bold 17px Georgia";
  ctx.textAlign = "left";
  ctx.fillText(b.message, 36, logicalH - 36);
  processBattleTimeline();
}

function hexPath(x, y, rx, ry) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const angle = Math.PI / 6 + (Math.PI * 2 * i) / 6;
    const px = x + Math.cos(angle) * rx;
    const py = y + Math.sin(angle) * ry;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawHex(x, y, rx, ry) {
  hexPath(x, y, rx, ry);
  ctx.stroke();
}

function fillHex(x, y, rx, ry) {
  hexPath(x, y, rx, ry);
  ctx.fill();
}

function semanticFrame(stack, animationState) {
  const catalog = CREATURE_CATALOG[stack.type];
  const clip = catalog?.animations[animationState.name] ?? catalog?.animations.idle;
  if (!clip) return 0;
  const elapsedMs = Math.max(0, anim - animationState.startedAt) * 16;
  const total = clip.duration.reduce((sum, duration) => sum + duration, 0);
  const time = clip.loop ? elapsedMs % total : Math.min(elapsedMs, total - 1);
  let cursor = 0;
  for (let i = 0; i < clip.order.length; i += 1) {
    cursor += clip.duration[i];
    if (time < cursor) return clip.order[i];
  }
  return clip.order.at(-1);
}

function drawBattleUnit(stack, x, y, flip, active) {
  const def = creatureStats[stack.type];
  const animationState = stackAnimation(stack);
  const frame = semanticFrame(stack, animationState);
  const scale = stack.type === "dragon" ? 0.82 : 0.9;
  ctx.globalAlpha = stack.count <= 0 ? 0.72 : 1;
  ctx.fillStyle = active ? "rgba(255,235,112,0.55)" : "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, stack.type === "dragon" ? 50 : 34, active ? 16 : 12, 0, 0, Math.PI * 2);
  ctx.fill();
  drawUnitFrame(ctx, def.sprite, frame, x, y + 8, scale, flip);
  ctx.globalAlpha = 1;
  if (stack.count > 0) {
    drawBadge(x + 32, y - 14, stack.count);
    const totalHp = (stack.count - 1) * stack.maxHp + stack.currentHp;
    const hpRatio = Math.max(0, Math.min(1, totalHp / Math.max(stack.maxHp, stack.count * stack.maxHp)));
    ctx.fillStyle = "#260b07";
    ctx.fillRect(x - 36, y + 22, 72, 7);
    ctx.fillStyle = hpRatio > 0.45 ? "#48c458" : "#d5462f";
    ctx.fillRect(x - 35, y + 23, 70 * hpRatio, 5);
    if (stack.ranged) {
      ctx.fillStyle = "#fff0b5";
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`🏹 ${stack.shots}`, x, y + 42);
    }
  }
}

function drawInitiativeBar(battle) {
  const labels = battle.engine.queue
    .map((id) => battle.engine.stacks.find((stack) => stack.id === id))
    .filter(Boolean);
  ctx.fillStyle = "rgba(28, 13, 5, 0.88)";
  ctx.fillRect(18, 14, Math.min(logicalW - 36, 126 + labels.length * 88), 42);
  ctx.fillStyle = "#f6d77b";
  ctx.font = "bold 13px Georgia";
  ctx.textAlign = "left";
  ctx.fillText("Orden:", 30, 40);
  labels.forEach((stack, index) => {
    ctx.fillStyle = index === 0 ? "#fff18a" : stack.side === "player" ? "#9dd7ff" : "#ff9c87";
    ctx.fillText(`${creatureStats[stack.type].name} ${stack.count}`, 86 + index * 88, 40);
  });
}

function nearestBattleCell(x, y) {
  return state.battle.cells.reduce((best, cell) => {
    const distance = Math.hypot(x - cell.x, y - cell.y);
    return !best || distance < best.distance ? { cell, distance } : best;
  }, null);
}

function battleAttack(attacker, defender) {
  const b = state.battle;
  const previousDefenderCount = defender.count;
  const previousAttackerCount = attacker.count;
  try {
    const result = attackStack(b.engine, attacker.id, defender.id, { roll: 0.5 });
    const ranged = b.engine.log.at(-(result.retaliation ? 2 : 1))?.type === "ranged";
    setStackAnimation(attacker.id, ranged ? "ranged" : "attack");
    setStackAnimation(defender.id, defender.count <= 0 ? "death" : "hit");
    if (result.retaliation) setStackAnimation(attacker.id, attacker.count <= 0 ? "death" : "hit");
    const losses = previousDefenderCount - defender.count;
    const retaliationLosses = previousAttackerCount - attacker.count;
    b.message = `${creatureStats[attacker.type].name}: ${result.damage} daño, ${losses} bajas${result.retaliation ? ` · represalia: ${retaliationLosses}` : ""}.`;
    b.visual.locked = true;
    setTimeout(() => {
      if (!state.battle) return;
      state.battle.visual.locked = false;
      scheduleComputerTurn();
    }, 520);
    if (b.engine.winner) {
      const dead = b.engine.stacks.filter((stack) => stack.count <= 0);
      const deathTicks = Math.max(...dead.map((stack) => {
        const clip = CREATURE_CATALOG[stack.type]?.animations.death;
        return clip ? Math.ceil(clip.duration.reduce((sum, duration) => sum + duration, 0) / 16) : BATTLE_ACTION_TICKS;
      }), BATTLE_ACTION_TICKS);
      b.visual.finishAt = anim + deathTicks + 12;
    }
    updateUI();
  } catch (error) {
    b.message = error.message === "Melee attacks require adjacency"
      ? "La unidad melee debe moverse a una celda adyacente antes de atacar."
      : error.message;
  }
}

function battleMove(stack, destination) {
  const b = state.battle;
  const from = { ...stack.position };
  try {
    moveStack(b.engine, stack.id, destination);
    b.visual.movement = { id: stack.id, from, to: { ...destination }, startedAt: anim, duration: 28 };
    b.visual.locked = true;
    setStackAnimation(stack.id, "move", 28);
    b.message = `${creatureStats[stack.type].name} avanzan ${hexDistance(from, destination)} celdas.`;
  } catch (error) {
    b.message = error.message;
  }
}

function handleBattleClick(x, y) {
  const b = state.battle;
  if (!b || b.visual.locked || b.engine.winner) return;
  const active = b.engine.stacks.find((stack) => stack.id === b.engine.activeId);
  if (!active || active.side !== "player") return;
  const nearest = nearestBattleCell(x, y);
  if (!nearest || nearest.distance > 50) return;
  const target = b.engine.stacks.find((stack) => stack.count > 0 && stack.position.q === nearest.cell.q && stack.position.r === nearest.cell.r);
  if (target?.side === "enemy") battleAttack(active, target);
  else if (!target) battleMove(active, nearest.cell);
}

function scheduleComputerTurn() {
  const b = state.battle;
  if (!b || b.visual.locked || b.engine.winner) return;
  const active = b.engine.stacks.find((stack) => stack.id === b.engine.activeId);
  if (!active || active.side !== "enemy") return;
  b.visual.locked = true;
  b.message = `${creatureStats[active.type].name} están decidiendo…`;
  setTimeout(() => runComputerTurn(active.id), 420);
}

function runComputerTurn(id) {
  const b = state.battle;
  if (!b || b.engine.activeId !== id || b.engine.winner) return;
  b.visual.locked = false;
  const active = b.engine.stacks.find((stack) => stack.id === id);
  const enemies = b.engine.stacks.filter((stack) => stack.side === "player" && stack.count > 0);
  const target = enemies.sort((a, c) => hexDistance(active.position, a.position) - hexDistance(active.position, c.position))[0];
  if (!target) return;
  const distance = hexDistance(active.position, target.position);
  if ((active.ranged && active.shots > 0) || distance === 1) {
    battleAttack(active, target);
    return;
  }
  const options = reachableForStack(b.engine, active.id)
    .filter((hex) => hex.distance > 0)
    .sort((a, c) => hexDistance(a, target.position) - hexDistance(c, target.position));
  if (options.length) battleMove(active, options[0]);
  else {
    defendStack(b.engine, active.id);
    setStackAnimation(active.id, "idle");
    b.message = `${creatureStats[active.type].name} defienden.`;
    scheduleComputerTurn();
  }
}

function syncArmyFromTacticalBattle() {
  const b = state.battle;
  if (!b) return;
  const outcome = battleOutcome(b.engine);
  for (const participant of b.engine.stacks.filter((stack) => stack.side === "player")) {
    if (state.army[participant.armyIndex]) state.army[participant.armyIndex].count = 0;
  }
  for (const survivor of outcome.survivors.filter((stack) => stack.side === "player")) {
    const source = b.engine.stacks.find((stack) => stack.id === survivor.id);
    if (source && state.army[source.armyIndex]) state.army[source.armyIndex].count = survivor.count;
  }
  updateUI();
}

function processBattleTimeline() {
  const b = state.battle;
  if (!b?.visual.finishAt || anim < b.visual.finishAt) return;
  const winner = b.engine.winner;
  const source = b.source;
  syncArmyFromTacticalBattle();
  if (winner === "player") {
    state.resources.gold += source.reward;
    state.objects = state.objects.filter((object) => object !== source);
    addLog(`Victoria táctica. Botín: ${source.reward} de oro.`, "Victoria");
    state.screen = "adventure";
    state.battle = null;
  } else {
    b.visual.finishAt = null;
    b.message = "Derrota. No quedan tropas capaces de combatir.";
    addLog("El ejército fue derrotado.", "Derrota");
  }
  updateUI();
}

function drawCastleScreen() {
  badgeEl.textContent = "Castillo";
  objectiveEl.textContent = "Recluta tropas y vuelve al mapa";
  state.uiZones = [];
  ctx.fillStyle = "#1d2330";
  ctx.fillRect(0, 0, logicalW, logicalH);
  const bgH = Math.min(logicalH, logicalW * 0.39);
  ctx.drawImage(images.townBg, 0, 0, images.townBg.width, images.townBg.height, 0, 0, logicalW, bgH);
  ctx.drawImage(images.castle, logicalW * 0.1, bgH - 125, 250, 150);
  ctx.drawImage(images.dwellingArcher, logicalW * 0.52, bgH - 112, 110, 88);
  ctx.drawImage(images.dwellingSwords, logicalW * 0.66, bgH - 115, 115, 90);
  ctx.drawImage(images.dwellingPaladin, logicalW * 0.78, bgH - 144, 150, 118);

  ctx.fillStyle = "rgba(36, 17, 7, 0.9)";
  ctx.fillRect(28, bgH + 24, logicalW - 56, logicalH - bgH - 48);
  ctx.strokeStyle = "#f3d276";
  ctx.lineWidth = 3;
  ctx.strokeRect(29.5, bgH + 25.5, logicalW - 59, logicalH - bgH - 51);

  ctx.fillStyle = "#fff0b5";
  ctx.font = "bold 30px Georgia";
  ctx.textAlign = "left";
  ctx.fillText("Knight Castle", 52, bgH + 66);
  ctx.font = "16px Georgia";
  ctx.fillText("Click en una morada para reclutar. Los refuerzos vuelven cada semana.", 52, bgH + 94);

  const cards = [
    ["peasant", "Milicia", "Baratos, fragiles, buenos para llenar filas."],
    ["archer", "Arqueros", "Ataque a distancia y buen dano temprano."],
    ["paladin", "Paladines", "Elite pesada. Pocos, caros, decisivos."],
  ];
  cards.forEach(([type, title, desc], i) => {
    const x = 52 + i * 245;
    const y = bgH + 128;
    drawRecruitCard(type, title, desc, x, y, 220, 155);
  });

  drawButton("Volver al mapa", logicalW - 210, logicalH - 72, 160, 42, "back");
}

function drawRecruitCard(type, title, desc, x, y, w, h) {
  const def = creatureStats[type];
  ctx.fillStyle = "#d7b462";
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#2a1508";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  drawUnitFrame(ctx, def.sprite, Math.floor(anim / 14), x + 52, y + 102, type === "paladin" ? 0.68 : 0.78, false);
  ctx.fillStyle = "#241207";
  ctx.font = "bold 18px Georgia";
  ctx.fillText(title, x + 94, y + 33);
  ctx.font = "13px Arial";
  wrapText(desc, x + 94, y + 55, w - 108, 17);
  ctx.font = "bold 14px Georgia";
  ctx.fillText(`Disp. ${state.castle.dwellings[type]} | ${def.cost} oro`, x + 94, y + 120);
  drawButton("Reclutar", x + 94, y + h - 34, 104, 26, `recruit:${type}`);
}

function drawButton(label, x, y, w, h, action) {
  ctx.fillStyle = "#ecd486";
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "#8a5420";
  ctx.fillRect(x + 3, y + h - 9, w - 6, 6);
  ctx.strokeStyle = "#1d0d05";
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = "#211006";
  ctx.font = "bold 14px Georgia";
  ctx.textAlign = "center";
  ctx.fillText(label, x + w / 2, y + h / 2 + 5);
  state.uiZones.push({ x, y, w, h, action });
  ctx.textAlign = "left";
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  for (const word of words) {
    const test = `${line}${word} `;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y);
      line = `${word} `;
      y += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, y);
}

function recruit(type) {
  const def = creatureStats[type];
  if (state.castle.dwellings[type] <= 0) {
    addLog("Esa morada esta vacia.");
    return;
  }
  if (state.resources.gold < def.cost) {
    addLog("No alcanza el oro.");
    return;
  }
  state.resources.gold -= def.cost;
  state.castle.dwellings[type] -= 1;
  const slot = state.army.find((item) => item.type === type);
  if (slot) slot.count += 1;
  else state.army.push({ type, count: 1 });
  addLog(`Reclutaste 1 ${def.name}.`);
  updateUI();
}

function handleCanvasClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (logicalW / rect.width);
  const y = (event.clientY - rect.top) * (logicalH / rect.height);
  mouse = { x, y };

  if (state.screen === "battle") {
    handleBattleClick(x, y);
    return;
  }

  if (state.screen === "castle") {
    const zone = state.uiZones.find((z) => x >= z.x && y >= z.y && x <= z.x + z.w && y <= z.y + z.h);
    if (!zone) return;
    if (zone.action === "back") state.screen = "adventure";
    if (zone.action.startsWith("recruit:")) recruit(zone.action.split(":")[1]);
    return;
  }

  const cam = camera();
  const tx = Math.floor(x / TILE) + cam.x;
  const ty = Math.floor(y / TILE) + cam.y;
  if (tx === state.castle.x && ty === state.castle.y && Math.abs(tx - state.hero.x) + Math.abs(ty - state.hero.y) <= 1) {
    state.hero.x = tx;
    state.hero.y = ty;
    state.screen = "castle";
    addLog("Entraste al castillo.");
    return;
  }
  const path = findPath(state.hero.x, state.hero.y, tx, ty);
  if (!path.length) return;
  state.path = path.slice(0, state.movement);
}

function processPath() {
  if (state.screen !== "adventure" || !state.path.length || anim % 8 !== 0) return;
  const [dx, dy] = state.path.shift();
  tryMove(dx, dy);
}

function openCastle() {
  state.screen = "castle";
}

function waitBattle() {
  const b = state.battle;
  const active = b?.engine.stacks.find((stack) => stack.id === b.engine.activeId);
  if (state.screen !== "battle" || b.visual.locked || active?.side !== "player") return;
  try {
    waitStack(b.engine, active.id);
    b.message = `${creatureStats[active.type].name} esperan y actuarán al final de la ronda.`;
    scheduleComputerTurn();
  } catch (error) {
    b.message = error.message;
  }
}

function defendBattle() {
  const b = state.battle;
  const active = b?.engine.stacks.find((stack) => stack.id === b.engine.activeId);
  if (state.screen !== "battle" || b.visual.locked || active?.side !== "player") return;
  try {
    defendStack(b.engine, active.id);
    setStackAnimation(active.id, "idle");
    b.message = `${creatureStats[active.type].name} defienden: Defensa +3 hasta la próxima ronda.`;
    scheduleComputerTurn();
  } catch (error) {
    b.message = error.message;
  }
}

function loop() {
  anim += 1;
  ctx.imageSmoothingEnabled = false;
  processPath();
  if (state.screen === "battle") drawBattle();
  else if (state.screen === "castle") drawCastleScreen();
  else drawAdventure();
  requestAnimationFrame(loop);
}

document.querySelector("#endTurn").addEventListener("click", endTurn);
document.querySelector("#openCastle").addEventListener("click", openCastle);
document.querySelector("#waitBattle").addEventListener("click", waitBattle);
document.querySelector("#defendBattle").addEventListener("click", defendBattle);
document.querySelector("#resetGame").addEventListener("click", resetGame);
canvas.addEventListener("click", handleCanvasClick);
canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  mouse = {
    x: (event.clientX - rect.left) * (logicalW / rect.width),
    y: (event.clientY - rect.top) * (logicalH / rect.height),
  };
});
window.addEventListener("keydown", (event) => {
  const keys = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
  };
  const move = keys[event.key];
  if (move) {
    event.preventDefault();
    tryMove(move[0], move[1]);
  }
  if (event.key === "Escape" && state.screen !== "adventure") state.screen = "adventure";
});
window.addEventListener("resize", resize);

window.__heroes2Debug = Object.freeze({
  snapshot() {
    const battle = state.battle;
    return structuredClone({
      screen: state.screen,
      hero: state.hero,
      army: state.army,
      resources: state.resources,
      objects: state.objects,
      logicalSize: { width: logicalW, height: logicalH },
      battle: battle ? {
        message: battle.message,
        cells: battle.cells,
        engine: battle.engine,
        animations: battle.visual.animations,
        locked: battle.visual.locked,
      } : null,
    });
  },
});

seedObjects();
preload()
  .then(() => {
    resize();
    drawPortrait();
    addLog("El valle de Enroth despierta. El castillo necesita oro y tropas.", "Inicio");
    updateUI();
    loop();
  })
  .catch((error) => {
    document.body.innerHTML = `<pre style="padding:24px;color:#ffd98a;background:#1c1007;white-space:pre-wrap">${error.message}</pre>`;
  });
