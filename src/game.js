import { ASSETS } from "./asset-manifest.js";

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
  peasant: { name: "Peasants", hp: 1, dmg: 1, sprite: "peasant", cost: 20 },
  archer: { name: "Archers", hp: 2, dmg: 2, sprite: "archer", cost: 80, ranged: true },
  paladin: { name: "Paladins", hp: 10, dmg: 7, sprite: "paladin", cost: 500 },
  skeleton: { name: "Skeletons", hp: 3, dmg: 2, sprite: "skeleton" },
  goblin: { name: "Goblins", hp: 2, dmg: 2, sprite: "goblin" },
  dragon: { name: "Red Dragons", hp: 25, dmg: 14, sprite: "dragon" },
};

const resourceDefs = {
  gold: ["G", "Oro"],
  wood: ["W", "Madera"],
  ore: ["O", "Piedra"],
  gems: ["J", "Gemas"],
};

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
  ctx.fillStyle = res === "gold" ? "#f6cf42" : res === "wood" ? "#85501f" : res === "ore" ? "#aaa59a" : "#39d3ff";
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(x - 11 + i * 7, y + 7 - (i % 2) * 5, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1508";
    ctx.stroke();
  }
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

function startBattle(obj) {
  state.screen = "battle";
  state.battle = {
    source: obj,
    player: state.army.filter((slot) => slot.count > 0).map((slot, i) => ({ ...slot, side: "player", index: i, hpLeft: slot.count * creatureStats[slot.type].hp })),
    enemy: [{ type: obj.enemy, count: obj.count, side: "enemy", hpLeft: obj.count * creatureStats[obj.enemy].hp }],
    turn: "player",
    selected: 0,
    message: "Elige un enemigo para atacar.",
    flash: 0,
  };
  addLog(`Te enfrentas a ${obj.count} ${creatureStats[obj.enemy].name}.`, "Batalla");
  updateUI();
}

function drawBattle() {
  badgeEl.textContent = "Batalla";
  objectiveEl.textContent = state.battle.message;
  const b = state.battle;
  ctx.fillStyle = "#1d3c28";
  ctx.fillRect(0, 0, logicalW, logicalH);
  for (let y = 0; y < logicalH; y += TILE) {
    for (let x = 0; x < logicalW; x += TILE) {
      const src = pick(terrainTiles.grass, x / TILE, y / TILE);
      ctx.drawImage(images.overworld, src[0], src[1], SRC_TILE, SRC_TILE, x, y, TILE, TILE);
    }
  }

  const cellW = Math.min(82, logicalW / 10);
  const cellH = Math.min(70, logicalH / 8);
  const ox = (logicalW - cellW * 9) / 2;
  const oy = (logicalH - cellH * 7) / 2;
  ctx.strokeStyle = "rgba(255, 232, 153, 0.35)";
  ctx.lineWidth = 2;
  for (let y = 0; y < 7; y += 1) {
    for (let x = 0; x < 9; x += 1) {
      drawHex(ox + x * cellW + cellW / 2, oy + y * cellH + cellH / 2, cellW * 0.46, cellH * 0.42);
    }
  }

  b.player.forEach((unit, i) => {
    unit.bx = ox + cellW * 1.2;
    unit.by = oy + cellH * (1.5 + i * 1.5);
    drawBattleUnit(unit, unit.bx, unit.by, false);
  });
  b.enemy.forEach((unit, i) => {
    unit.bx = ox + cellW * 7.6;
    unit.by = oy + cellH * (2.8 + i * 1.3);
    drawBattleUnit(unit, unit.bx, unit.by, true);
  });

  ctx.fillStyle = "rgba(38, 19, 7, 0.86)";
  ctx.fillRect(20, logicalH - 64, logicalW - 40, 44);
  ctx.strokeStyle = "#f3ce67";
  ctx.strokeRect(20.5, logicalH - 64.5, logicalW - 41, 45);
  ctx.fillStyle = "#ffe9a4";
  ctx.font = "bold 18px Georgia";
  ctx.textAlign = "left";
  ctx.fillText(b.message, 36, logicalH - 36);
}

function drawHex(x, y, rx, ry) {
  ctx.beginPath();
  for (let i = 0; i < 6; i += 1) {
    const a = Math.PI / 6 + (Math.PI * 2 * i) / 6;
    const px = x + Math.cos(a) * rx;
    const py = y + Math.sin(a) * ry;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawBattleUnit(unit, x, y, flip) {
  const def = creatureStats[unit.type];
  const frame = Math.floor(anim / 10);
  const scale = unit.type === "dragon" ? 0.82 : 0.9;
  ctx.fillStyle = "rgba(0,0,0,0.38)";
  ctx.beginPath();
  ctx.ellipse(x, y + 8, unit.type === "dragon" ? 50 : 34, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  drawUnitFrame(ctx, def.sprite, frame, x, y + 8, scale, flip);
  drawBadge(x + 32, y - 14, unit.count);
  const hpMax = unit.count * def.hp;
  const hpRatio = Math.max(0, unit.hpLeft / hpMax);
  ctx.fillStyle = "#260b07";
  ctx.fillRect(x - 36, y + 22, 72, 7);
  ctx.fillStyle = hpRatio > 0.45 ? "#48c458" : "#d5462f";
  ctx.fillRect(x - 35, y + 23, 70 * hpRatio, 5);
}

function playerAttack(enemyIndex = 0) {
  const b = state.battle;
  if (!b || b.turn !== "player") return;
  const attacker = b.player.find((unit) => unit.count > 0);
  const target = b.enemy[enemyIndex];
  if (!attacker || !target) return;
  applyDamage(attacker, target, state.hero.attack);
  b.message = `${creatureStats[attacker.type].name} atacan a ${creatureStats[target.type].name}.`;
  if (target.count <= 0) {
    winBattle();
    return;
  }
  b.turn = "enemy";
  setTimeout(enemyTurn, 650);
}

function enemyTurn() {
  const b = state.battle;
  if (!b || b.turn !== "enemy") return;
  const attacker = b.enemy.find((unit) => unit.count > 0);
  const target = b.player.find((unit) => unit.count > 0);
  if (!attacker || !target) return;
  applyDamage(attacker, target, -state.hero.defense);
  b.message = `${creatureStats[attacker.type].name} contraatacan.`;
  syncArmyFromBattle();
  if (!b.player.some((unit) => unit.count > 0)) {
    b.message = "Tu ejercito fue derrotado. Reinicia para probar otra ruta.";
    addLog("Derrota en combate. Necesitas mas tropas.", "Derrota");
    return;
  }
  b.turn = "player";
}

function applyDamage(attacker, target, modifier) {
  const a = creatureStats[attacker.type];
  const t = creatureStats[target.type];
  const raw = Math.max(1, attacker.count * a.dmg + modifier);
  const damage = Math.max(1, Math.round(raw * (0.85 + ((anim % 7) / 20))));
  target.hpLeft = Math.max(0, target.hpLeft - damage);
  target.count = Math.ceil(target.hpLeft / t.hp);
}

function syncArmyFromBattle() {
  const b = state.battle;
  for (const battleSlot of b.player) {
    const armySlot = state.army[battleSlot.index];
    if (armySlot) armySlot.count = Math.max(0, battleSlot.count);
  }
  updateUI();
}

function winBattle() {
  const b = state.battle;
  syncArmyFromBattle();
  state.resources.gold += b.source.reward;
  state.objects = state.objects.filter((obj) => obj !== b.source);
  addLog(`Victoria. Botin: ${b.source.reward} de oro.`, "Victoria");
  state.battle = null;
  state.screen = "adventure";
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
    for (let i = 0; i < state.battle.enemy.length; i += 1) {
      const e = state.battle.enemy[i];
      if (Math.hypot(x - e.bx, y - e.by) < 70) playerAttack(i);
    }
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
  if (state.screen !== "adventure" || !state.path.length || anim % 5 !== 0) return;
  const [dx, dy] = state.path.shift();
  tryMove(dx, dy);
}

function openCastle() {
  state.screen = "castle";
}

function waitBattle() {
  if (state.screen === "battle" && state.battle?.turn === "player") {
    state.battle.turn = "enemy";
    state.battle.message = "Tus tropas esperan una apertura.";
    setTimeout(enemyTurn, 450);
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
