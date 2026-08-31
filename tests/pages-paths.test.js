import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

test("GitHub Pages navigation stays relative to the repository base", () => {
  const game = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const lab = fs.readFileSync(new URL("../asset-lab/index.html", import.meta.url), "utf8");
  assert.match(game, /href="\.\/asset-lab\/"/);
  assert.match(lab, /href="\.\.\/"/);
  assert.doesNotMatch(game, /href="\/asset-lab\/"/);
  assert.doesNotMatch(lab, /href="\/"/);
});
