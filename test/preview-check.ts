import { chromium } from "playwright";
import { existsSync } from "fs";
import { join } from "path";

async function main() {
  const candidates = [
    "C:/Users/Kaleby/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
    "C:/Users/Kaleby/AppData/Local/ms-playwright/chromium-1091/chrome-win/chrome.exe",
  ];
  const exePath = candidates.find((p) => existsSync(p));
  console.log("Browser exe:", exePath || "NOT FOUND");

  const browser = await chromium.launch({
    headless: false,
    args: ["--window-size=390,844", "--force-device-scale-factor=1"],
    ...(exePath ? { executablePath: exePath } : {}),
  });

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];

  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "pageerror")
      errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

  try {
    await page.goto("http://localhost:4042/dock-preview", { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "C:/Users/Kaleby/AppData/Local/Temp/kilo/dock-preview-final.png", fullPage: true });
    console.log("DOCK ERRORS:", errors.length ? errors.slice(0, 10) : "NONE");
  } catch (e: unknown) {
    console.error("Fatal dock:", e instanceof Error ? e.message : String(e));
  }

  errors.length = 0;
  try {
    await page.goto("http://localhost:4042/sidebar-preview", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "C:/Users/Kaleby/AppData/Local/Temp/kilo/sidebar-preview-final.png", fullPage: true });
    console.log("SIDEBAR ERRORS:", errors.length ? errors.slice(0, 10) : "NONE");
  } catch (e: unknown) {
    console.error("Fatal sidebar:", e instanceof Error ? e.message : String(e));
  }

  await browser.close();
}

main();
