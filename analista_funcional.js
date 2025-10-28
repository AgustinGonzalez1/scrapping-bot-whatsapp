import axios from "axios";
import { configDotenv } from "dotenv";
import { storage } from "./storage.js";

configDotenv();

async function sendUrlPost(url) {
  try {
    const response = await axios.post(
      `${process.env.API_URL}/message/sendText/${process.env.INSTANCE_NAME}`,
      {
        number: process.env.NUMBER2,
        text: `Nuevo post encontrado: ${url}`,
      },
      {
        headers: {
          apikey: process.env.API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Mensaje enviado:", response.data);
  } catch (error) {
    console.error("Error al enviar:", error.response?.data || error.message);
  }
}

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function checkAnalista(page) {
  // Cargar posts guardados
  await storage.loadPosts();

  await page.goto(
    "https://www.linkedin.com/search/results/content/?keywords=analista%20funcional&origin=GLOBAL_SEARCH_HEADER&sid=Y.y&sortBy=%22date_posted%22"
  );

  await page.evaluate(() => window.scrollTo(0, 500));
  await timeout(10000);

  const posts = await page.$$("ul[role='list'] li.artdeco-card");

  for (const [i, post] of posts.entries()) {
    const text = await post.evaluate((el) => el.innerText.toLowerCase());

    const article = await post.$("div[role='article']");
    if (article) {
      const urn = await article.evaluate((el) => el.getAttribute("data-urn"));
      if (urn && urn.includes("activity:")) {
        const isNew = await storage.addPost("analista", urn);
        if (isNew) {
          const postUrl = `https://www.linkedin.com/feed/update/${urn}`;
          sendUrlPost(postUrl);
          console.log(`Nuevo post encontrado: ${postUrl}`);
        }
      }
    }
  }

  const totalPosts = await storage.getPosts("analista");
  console.log(`Revisión completa. Posts guardados: ${totalPosts.length}`);
}
