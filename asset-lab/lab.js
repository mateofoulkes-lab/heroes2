import { CREATURE_CATALOG, validateCatalog } from "../src/assets/animation-catalog.js";

const $ = (id) => document.getElementById(id);
const controls = { unit: $("unit"), state: $("state"), scale: $("scale"), flip: $("flip") };
let frame = 0, playing = true, elapsed = 0, previousTime = performance.now(), image;

Object.values(CREATURE_CATALOG).forEach((entry) => controls.unit.add(new Option(entry.label, entry.id)));
function entry() { return CREATURE_CATALOG[controls.unit.value]; }
function clip() { return entry().animations[controls.state.value]; }
function loadUnit() {
  controls.state.replaceChildren(...Object.keys(entry().animations).map((state) => new Option(state, state)));
  frame = 0; image = new Image(); image.src = entry().spritesheet; $("sheet").src = entry().spritesheet;
  image.onload = () => { renderFrames(); draw(); };
  renderMetadata();
}
function renderMetadata() {
  const item = entry(), state = clip();
  $("metadata").innerHTML = `<dt>Estado</dt><dd>${controls.state.value}</dd><dt>Frames</dt><dd>${state.frames.length}</dd><dt>Loop</dt><dd>${state.loop}</dd><dt>Anchor</dt><dd>${state.anchor.x}, ${state.anchor.y}</dd><dt>Impacto</dt><dd>${state.impactPoint.x}, ${state.impactPoint.y}</dd><dt>Faltantes</dt><dd>${item.missingStates.join(", ")}</dd><dt>Procedencia</dt><dd><a href="${item.provenance.url}">${item.provenance.label}</a></dd><dt>Confianza</dt><dd>${state.confidence}</dd>`;
}
function paint(canvas, background = false) {
  const rect = clip().frames[frame], scale = Number(controls.scale.value), ctx = canvas.getContext("2d");
  canvas.width = rect.width * scale; canvas.height = rect.height * scale; ctx.imageSmoothingEnabled = false;
  ctx.save(); if (controls.flip.checked) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
  ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height); ctx.restore();
  if (background) { const a = clip().anchor; ctx.strokeStyle="#ff3b30"; ctx.beginPath(); ctx.moveTo(a.x*canvas.width-6,a.y*canvas.height);ctx.lineTo(a.x*canvas.width+6,a.y*canvas.height);ctx.moveTo(a.x*canvas.width,a.y*canvas.height-6);ctx.lineTo(a.x*canvas.width,a.y*canvas.height+6);ctx.stroke(); }
}
function draw() { ["light","dark","battle"].forEach((id) => paint($(id), true)); }
function renderFrames() {
  $("frames").replaceChildren(...clip().frames.map((rect, index) => { const canvas=document.createElement("canvas");canvas.width=rect.width;canvas.height=rect.height;const ctx=canvas.getContext("2d");ctx.imageSmoothingEnabled=false;ctx.drawImage(image,rect.x,rect.y,rect.width,rect.height,0,0,rect.width,rect.height);canvas.title=`frame ${index}`;return canvas; }));
}
controls.unit.onchange=loadUnit; controls.state.onchange=()=>{frame=0;renderFrames();renderMetadata();draw()}; controls.scale.onchange=draw;controls.flip.onchange=draw;
$("previous").onclick=()=>{playing=false;frame=(frame-1+clip().frames.length)%clip().frames.length;draw()}; $("next").onclick=()=>{playing=false;frame=(frame+1)%clip().frames.length;draw()};
$("play").onclick=()=>{playing=!playing;$("play").textContent=playing?"Pausa":"Reproducir"};
function tick(now){if(playing&&image?.complete){elapsed+=now-previousTime;if(elapsed>=clip().duration[frame]){elapsed=0;frame=(frame+1)%clip().frames.length;draw()}}previousTime=now;requestAnimationFrame(tick)}
const errors=validateCatalog();if(errors.length)document.body.prepend(`Catálogo inválido: ${errors.join("; ")}`);loadUnit();requestAnimationFrame(tick);
