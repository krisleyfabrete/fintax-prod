import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  try {
    await page.goto("http://localhost:4042/auth", { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);

    await page.fill('input[placeholder="seu@email.com"]', "superadmin@fintax.com");
    await page.fill('input[placeholder="••••••••"]', "admin123456");
    await page.click('button[type="submit"]');
    
    await page.waitForURL("**/dashboard", { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    console.log("URL:", page.url());

    const dock = await page.$('div[class*="fixed"][class*="bottom-0"]');
    console.log("Dock found:", !!dock);

    const html = await page.content();
    console.log("Has IA button:", html.includes('aria-label="IA"'));

    const buttons = await page.$$('button');
    console.log("Buttons:", await Promise.all(buttons.map(async (b) => await b.getAttribute('aria-label'))));

    const iaBtn = await page.$('button[aria-label="IA"]');
    if (iaBtn) {
      await iaBtn.click();
      await page.waitForTimeout(2000);
      console.log("URL after click:", page.url());
    } else {
      console.log("IA button not found");
    }
  } finally {
    await browser.close();
  }
}

main();
