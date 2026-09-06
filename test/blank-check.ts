import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];

  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "pageerror") {
      errors.push(`${m.type()}: ${m.text()}`);
    }
  });
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

  try {
    await page.goto("http://localhost:4042/", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    console.log("STATUS:", errors.length ? errors.slice(0, 20).join("\n") : "NO_ERRORS");
  } finally {
    await browser.close();
  }
}

main();
