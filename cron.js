import cron from "node-cron";
import { checkWhatsAppWeb } from "./desarrollador_fronted.js";
import { checkReactDeveloper } from "./desarrollador_react.js";
import {
  initializeBrowser,
  closeBrowser,
  getPage,
  getBrowser,
  saveCookies,
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

// debug artifacts removed

const initializeSession = async () => {
  try {
    console.log("Inicializando sesión...");

    // Inicializar browser y página
    await initializeBrowser();
    const page = getPage();

    if (!page) {
      throw new Error("No se pudo crear la página");
    }

    // Ir a la página principal de LinkedIn para verificar si ya hay sesión
    await page.goto(
      "https://www.linkedin.com/search/results/content/?keywords=desarrollador%20frontend&origin=FACETED_SEARCH&sid=.Wd&sortBy=%22date_posted%22",
      { waitUntil: "domcontentloaded" }
    );

    // Si no existe el formulario de login, asumimos que la cookie/sesión es válida
    const loginForm = await page.$("#username");
    if (!loginForm) {
      isInitialized = true;
      console.log("Sesión detectada por cookie. No es necesario iniciar sesión.");
      return true;
    }

    // Si llegamos acá, el formulario de login está presente: proceder a login
    const inputEmail = await page.waitForSelector("#username", { timeout: 15000 });
    await inputEmail.click({ clickCount: 3 });
    await inputEmail.type(process.env.EMAIL, { delay: 50 });

    await timeout(500);

    const inputPassword = await page.waitForSelector("#password", {
      timeout: 15000,
    });
    await inputPassword.click({ clickCount: 3 });
    await inputPassword.type(process.env.PASSWORD, { delay: 50 });

    await timeout(500);

    const btnLogin = await page.waitForSelector("button[type='submit']", {
      timeout: 15000,
    });
    await btnLogin.click();

    // Esperar navegación o cambio en el DOM que indique login
    try {
      await page.waitForNavigation({ timeout: 15000 });
    } catch (e) {
      // ignore timeout, comprobaremos manualmente
    }

    // Verificar si seguimos en login (posible verificación extra) buscando el input
    const stillLogin = await page.$("#username");
    if (stillLogin) {
      throw new Error(
        "No se pudo iniciar sesión: LinkedIn redirige al login o requiere verificación"
      );
    }

    // Guardar cookies para próximos runs
    try {
      await saveCookies();
    } catch (e) {}

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

// initializeSession();

cron.schedule("*/1 * * * *", async () => {
  try {
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
