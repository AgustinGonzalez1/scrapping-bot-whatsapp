import cron from "node-cron";
import { checkWhatsAppWeb } from "./desarrollador_fronted.js";
import { page } from "./page.config.js";
import { configDotenv } from "dotenv";
import { checkAnalista } from "./analista_funcional.js";

configDotenv();

let firstTime = true;

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const login = async () => {
  try {
    await page.goto(
      "https://www.linkedin.com/search/results/content/?keywords=desarrollador%20frontend&origin=FACETED_SEARCH&sid=.Wd&sortBy=%22date_posted%22"
    );

    const inputEmail = await page.waitForSelector("#username");
    await inputEmail.type(process.env.EMAIL);

    await timeout(1000);

    const inputPassword = await page.waitForSelector("#password");
    await inputPassword.type(process.env.PASSWORD);

    await timeout(1000);

    const btnLogin = await page.waitForSelector(
      "[aria-label='Iniciar sesión']"
    );
    await btnLogin.click();

    await page.waitForNavigation();

    firstTime = false;
    console.log("Login exitoso");
  } catch (error) {
    console.error("Error en login:", error.message);
  }
};

cron.schedule("*/3 * * * *", async () => {
  console.log("Ejecutando tarea programada...");

  if (firstTime) {
    await login();
  } else {
    try {
      // Ejecutar secuencialmente, no en paralelo
      await checkWhatsAppWeb(page);
      console.log("checkWhatsAppWeb completado");

      await timeout(5000); // Pausa entre checks

      await checkAnalista(page);
      console.log("checkAnalista completado");
    } catch (error) {
      console.error("Error en checks:", error.message);
    }
  }
});
