import puppeteer from "puppeteer";

let browser = null;
let page = null;

export async function initializeBrowser() {
  try {
    if (browser) {
      await browser.close();
    }
    
    browser = await puppeteer.launch({
      headless: true,
      defaultViewport: null,
      args: ["--start-maximized"],
    });
    
    page = await browser.newPage();
    console.log("Browser inicializado correctamente");
    return { browser, page };
  } catch (error) {
    console.error("Error inicializando browser:", error.message);
    throw error;
  }
}

export async function closeBrowser() {
  try {
    if (browser) {
      await browser.close();
      browser = null;
      page = null;
      console.log("Browser cerrado correctamente");
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
