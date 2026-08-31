const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1365, height: 820 } });
  const messages = [];
  page.on("console", (msg) => messages.push(`${msg.type()}: ${msg.text()}`));
  page.on("pageerror", (err) => messages.push(`pageerror: ${err.message}`));
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.waitForTimeout(900);
  const stats = await page.evaluate(() => {
    const canvas = document.querySelector("#game");
    const ctx = canvas.getContext("2d");
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let nonBlank = 0;
    for (let i = 0; i < data.length; i += 40) {
      if (data[i] + data[i + 1] + data[i + 2] > 20) nonBlank += 1;
    }
    return {
      title: document.title,
      nonBlank,
      width: canvas.width,
      height: canvas.height,
    };
  });
  await page.screenshot({ path: "tmp/visual-adventure.png", fullPage: true });
  await page.click("#openCastle");
  await page.waitForTimeout(300);
  await page.screenshot({ path: "tmp/visual-castle.png", fullPage: true });
  await browser.close();
  console.log(JSON.stringify({ stats, messages }, null, 2));
  if (messages.some((m) => m.includes("pageerror"))) process.exit(1);
  if (stats.nonBlank < 1000) process.exit(1);
})();
