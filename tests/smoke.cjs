const http = require("http");

const url = "http://127.0.0.1:4173/";
http.get(url, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Expected 200 from ${url}, got ${res.statusCode}`);
    process.exit(1);
  }
  let body = "";
  res.setEncoding("utf8");
  res.on("data", (chunk) => {
    body += chunk;
  });
  res.on("end", () => {
    if (!body.includes("Heroes II Web Gauntlet")) {
      console.error("Smoke page did not include the game title.");
      process.exit(1);
    }
    console.log("Smoke OK");
  });
}).on("error", (error) => {
  console.error(error.message);
  process.exit(1);
});
