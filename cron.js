import cron from "node-cron";
import { checkWhatsAppWeb } from "./desarrollador_fronted.js";
import { checkReactDeveloper } from "./desarrollador_react.js";
import {
  initializeBrowser,
  closeBrowser,
  getPage,
  getBrowser,
} from "./page.config.js";
import { configDotenv } from "dotenv";
import { checkAnalista } from "./analista_funcional.js";

configDotenv();

let isInitialized = false;

// Manejadores de errores globales para evitar que el proceso se termine
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection detectada:", reason);
  console.error("En promise:", promise);
  console.log("🔄 El proceso continúa ejecutándose...");
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception detectada:", error.message);
  console.error("Stack trace:", error.stack);
  console.log("🔄 El proceso continúa ejecutándose...");
});

function timeout(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const initializeSession = async () => {
  try {
    console.log("Inicializando sesión...");

    // Inicializar browser y página
    await initializeBrowser();
    const page = getPage();

    if (!page) {
      throw new Error("No se pudo crear la página");
    }

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

    isInitialized = true;
    console.log("Sesión inicializada correctamente");
    return true;
  } catch (error) {
    console.error("Error inicializando sesión:", error.message);
    isInitialized = false;

    // Limpiar browser en caso de error
    try {
      await closeBrowser();
    } catch (closeError) {
      console.error(
        "Error cerrando browser después de fallo:",
        closeError.message
      );
    }

    return false;
  }
};

cron.schedule("*/3 * * * *", async () => {
  try {
    console.log("Ejecutando tarea programada...");
    console.log(
      `Estado de inicialización: ${
        isInitialized ? "INICIALIZADO" : "NO INICIALIZADO"
      }`
    );

    if (!isInitialized) {
      console.log("🔄 Reintentando inicialización...");
      const success = await initializeSession();
      if (!success) {
        console.log(
          "❌ No se pudo inicializar la sesión, reintentando en el próximo ciclo (3 minutos)"
        );
        return;
      }
    }

    try {
      const page = getPage();

      if (!page) {
        throw new Error("La página no está disponible");
      }

      // Ejecutar secuencialmente, no en paralelo
      await checkWhatsAppWeb(page);
      console.log("checkWhatsAppWeb completado");

      await timeout(5000); // Pausa entre checks

      await checkReactDeveloper(page);
      console.log("checkReactDeveloper completado");

      await timeout(5000); // Pausa entre checks

      await checkAnalista(page);
      console.log("checkAnalista completado");
    } catch (error) {
      console.error("Error en checks:", error.message);

      // Reiniciar completamente en caso de error
      try {
        await closeBrowser();
      } catch (closeError) {
        console.error("Error cerrando browser:", closeError.message);
      }

      isInitialized = false;
      console.log(
        "🔄 Sistema reiniciado por error. Se volverá a inicializar en el próximo ciclo (3 minutos)."
      );
    }
  } catch (criticalError) {
    console.error("🚨 ERROR CRÍTICO en cron:", criticalError.message);
    console.error("Stack trace:", criticalError.stack);

    // Forzar limpieza completa
    try {
      await closeBrowser();
    } catch (closeError) {
      console.error("Error en limpieza de emergencia:", closeError.message);
    }

    isInitialized = false;
    console.log(
      "💥 Error crítico manejado. El cron continuará funcionando y reintentará en 3 minutos."
    );
  }
});
