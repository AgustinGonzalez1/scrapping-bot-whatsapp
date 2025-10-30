import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

const USE_STEALTH = process.env.USE_STEALTH !== "false"; // default true
if (USE_STEALTH) {
  puppeteerExtra.use(StealthPlugin());
}

const COOKIES_PATH = path.join(process.cwd(), "puppeteer_cookies.json");

let browser = null;
let page = null;

export async function initializeBrowser() {
  try {
    if (browser) {
      try {
        await browser.close();
      } catch (e) {
        // ignore
      }
    }

    const headlessEnv = process.env.HEADLESS;
    const headless = true;

    // Use puppeteer-extra launcher when stealth is enabled so plugins run
    const launcher = USE_STEALTH ? puppeteerExtra : puppeteer;

    browser = await launcher.launch({
      headless,
      defaultViewport: null,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--start-maximized",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    page = await browser.newPage();

    // Set a common desktop user-agent and accept-language to reduce bot detection
    await page.setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "accept-language": "es-ES,es;q=0.9,en;q=0.8",
    });

    // Evitar detección básica de webdriver (safe)
    await page.evaluateOnNewDocument(() => {
      try {
        Object.defineProperty(navigator, "webdriver", { get: () => false });
      } catch (e) {
        // ignore if not configurable
      }
    });

    // Try to load cookies if exist
    try {
      const raw = await fs.readFile(COOKIES_PATH, "utf8");
      const cookies = JSON.parse(raw);
      if (Array.isArray(cookies) && cookies.length > 0) {
        await page.setCookie(...cookies);
      }
    } catch (e) {
      // no cookies yet
    }

    return { browser, page };
  } catch (error) {
    console.error("Error inicializando browser:", error.message);
    throw error;
  }
}

export async function saveCookies() {
  try {
    if (!page) return;
    const cookies = await page.cookies();
    await fs.writeFile(COOKIES_PATH, JSON.stringify(cookies, null, 2));
  } catch (error) {
    console.error("Error guardando cookies:", error.message);
  }
}

export async function clearCookies() {
  try {
    if (!page) return;
    const cookies = await page.cookies();
    for (const c of cookies) {
      await page.deleteCookie({
        name: c.name,
        url: c.domain.startsWith(".")
          ? `https://${c.domain.slice(1)}`
          : `https://${c.domain}`,
      });
    }
    try {
      await fs.unlink(COOKIES_PATH);
    } catch (e) {
      // ignore
    }
  } catch (error) {
    console.error("Error limpiando cookies:", error.message);
  }
}

export async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
    }
  } catch (error) {
    console.error("Error cerrando browser:", error.message);
  }
}

export function getBrowser() {
  return browser;
}

export function getPage() {
  return page;
}
