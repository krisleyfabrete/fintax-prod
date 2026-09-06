import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: false,
    args: ["--window-size=390,844", "--force-device-scale-factor=1"],
    executablePath: "C:/Users/Kaleby/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe",
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors: string[] = [];

  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "pageerror")
      errors.push(`${m.type()}: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`PAGEERROR: ${e.message}`));

  try {
    await page.goto("http://localhost:4042/auth", { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    await page.fill('input[placeholder="seu@email.com"]', "superadmin@fintax.com");
    await page.fill('input[placeholder="••••••••"]', "admin123456");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(4000);

    await page.screenshot({
      path: "C:/Users/Kaleby/AppData/Local/Temp/kilo/mobile-dashboard2.png",
      fullPage: true,
    });
    console.log("Dashboard errors:", errors.length ? errors.slice(0, 10) : "NONE");

    const dockNav = await page.$('div[class*="bg-gradient-to-b"][class*="from-white"]');
    console.log("Dock nav found:", !!dockNav);

    const moreBtn = await page.$('button[aria-label="Mais"]');
    console.log("More button found:", !!moreBtn);

    const fabBtn = await page.$('button[aria-label="IA"]');
    console.log("FAB IA button found:", !!fabBtn);

    const reportBtn = await page.$("text=Relatórios");
    console.log("Report button found:", !!reportBtn);

    const homeBtn = await page.$("text=Home");
    console.log("Home button found:", !!homeBtn);

    const transBtn = await page.$("text=Transações");
    console.log("Transactions button found:", !!transBtn);

    // Conta botoes do dock por aria-label
    const fabBtn2 = await page.$('button[aria-label="IA"]');
    console.log("FAB IA button aria found:", !!fabBtn2);

    // Conta os icon buttons da dock (brain = FAB central, mais icon)
    const brainIcon = await page.$$('svg');
    const menuIcon = await page.$('button[aria-label="Mais"]');
    console.log("Menu/Mais button found:", !!menuIcon);
    console.log("FAB IA found:", !!fabBtn2);

    // Count visible bottom area
    const bottomButtons = await page.$$('div[class*="flex"][class*="items-center"][class*="justify-center"]');
    console.log("Bottom dock button groups:", bottomButtons.length);

    const metaBtn = await page.$("text=Mais");
    console.log("More label found:", !!metaBtn);

    errors.length = 0;
    if (moreBtn) {
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: "C:/Users/Kaleby/AppData/Local/Temp/kilo/mobile-more-sheet2.png",
        fullPage: true,
      });
      console.log("More sheet errors:", errors.length ? errors.slice(0, 10) : "NONE");
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Fatal:", msg);
    console.log("Errors captured:", errors.slice(0, 10));
  } finally {
    await browser.close();
  }
}

main();
