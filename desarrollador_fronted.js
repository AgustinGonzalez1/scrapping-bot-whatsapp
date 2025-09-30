import axios from "axios";
import cron from "node-cron";
import puppeteer from "puppeteer";
import { configDotenv } from "dotenv";

configDotenv();

async function sendUrlPost(url) {
  try {
    const response = await axios.post(
      `${process.env.API_URL}/message/sendText/${process.env.INSTANCE_NAME}`,
      {
        number: process.env.NUMBER1,
        text: `Nuevo post encontrado: ${url}`,
      },
      {
        headers: {
          apikey: process.env.API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    // const response1 = await axios.post(
    //   `${process.env.API_URL}/message/sendText/${process.env.INSTANCE_NAME}`,
    //   {
    //     number: process.env.NUMBER2,
    //     text: `Nuevo post encontrado: ${url}`,
    //   },
    //   {
    //     headers: {
    //       apikey: process.env.API_KEY,
    //       "Content-Type": "application/json",
    //     },
    //   }
    // );
    console.log("Mensaje enviado:", response.data);
  } catch (error) {
    console.error("Error al enviar:", error.response?.data || error.message);
  }
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const browser = await puppeteer.launch({
  headless: false,
  defaultViewport: null,
  args: ["--start-maximized"],
});
const page = await browser.newPage();

let firstTime = true;

let savedPosts = [];
export async function checkWhatsAppWeb() {
  if (firstTime) {
    await page.goto(
      "https://www.linkedin.com/search/results/content/?keywords=desarrollador%20frontend&origin=FACETED_SEARCH&sid=.Wd&sortBy=%22date_posted%22"
    );

    const inputEmail = await page.waitForSelector("#username");
    inputEmail.type(process.env.EMAIL);

    await timeout(1000);

    const inputPassword = await page.waitForSelector("#password");
    inputPassword.type(process.env.PASSWORD);

    await timeout(1000);

    const btnLogin = await page.waitForSelector(
      "[aria-label='Iniciar sesión']"
    );
    btnLogin.click();

    await page.waitForNavigation();

    firstTime = false;
  } else {
    await page.goto(
      "https://www.linkedin.com/search/results/content/?keywords=desarrollador%20frontend&origin=FACETED_SEARCH&sid=.Wd&sortBy=%22date_posted%22"
    );
  }

  await page.evaluate(() => window.scrollTo(0, 500));
  await timeout(10000);

  const posts = await page.$$("ul[role='list'] li.artdeco-card");

  for (const [i, post] of posts.entries()) {
    const text = await post.evaluate((el) => el.innerText.toLowerCase());

    if (
      (text.includes("ssr") || text.includes("desarrollador")) &&
      (text.includes("frontend") ||
        text.includes("front-end") ||
        text.includes("front end"))
    ) {
      const article = await post.$("div[role='article']");
      if (article) {
        const urn = await article.evaluate((el) => el.getAttribute("data-urn"));
        if (urn && urn.includes("activity:")) {
          if (!savedPosts.includes(urn)) {
            const postUrl = `https://www.linkedin.com/feed/update/${urn}`;
            sendUrlPost(postUrl);
            savedPosts.push(urn);
          }
        }
      }
    }
  }

  console.log("Revisión completa. Posts guardados:", savedPosts);
}