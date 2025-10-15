import puppeteer from "puppeteer";

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  args: ["--start-maximized"],
});
export const page = await browser.newPage();
