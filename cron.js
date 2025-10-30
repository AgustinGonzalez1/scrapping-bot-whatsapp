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
import fs from "fs/promises";
import path from "path";
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

async function saveDebugArtifacts(page, tag) {
  try {
    const debugDir = path.join(process.cwd(), "debug");
    await fs.mkdir(debugDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const screenshotPath = path.join(debugDir, `${tag}-${timestamp}.png`);
    const htmlPath = path.join(debugDir, `${tag}-${timestamp}.html`);
    try {
      await page.screenshot({ path: screenshotPath, fullPage: true });
    } catch (e) {
      // ignore
    }
    try {
      const html = await page.content();
      await fs.writeFile(htmlPath, html, "utf8");
    } catch (e) {
      // ignore
    }
    console.log("Debug artifacts saved:", screenshotPath, htmlPath);
  } catch (e) {
    console.error("Error saving debug artifacts:", e.message);
  }
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

    // Ir a la página principal de LinkedIn para verificar si ya hay sesión
    const respFeed = await page.goto("https://www.linkedin.com/feed/", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Detectar rate limit 429
    if (
      respFeed &&
      typeof respFeed.status === "function" &&
      respFeed.status() === 429
    ) {
      await saveDebugArtifacts(page, "429_feed");
      console.error("LinkedIn devolvió 429 en /feed - aplicando backoff");
      try {
        await closeBrowser();
      } catch (e) {}
      return false;
    }

    // Si aparece el formulario de login, entonces no está logueado
    const loginForm = await page.$("#username");
    if (!loginForm) {
      // Probablemente ya estamos logueados
      isInitialized = true;
      try {
        await saveCookies();
      } catch (e) {}
      const inputPassword = await page.waitForSelector("#password", {
        timeout: 15000,
      });
      await inputPassword.click({ clickCount: 3 });
      await inputPassword.type(process.env.PASSWORD, { delay: 50 });

      await timeout(1000);

      const btnLogin = await page.waitForSelector("button[type='submit']", {
        timeout: 15000,
      });
      await btnLogin.click();
      await timeout(1000);
      console.log("Sesión detectada por cookie. Inicializado.");
      return true;
    }

    // No hay cookie válida, proceder a login normal
    const respLogin = await page.goto("https://www.linkedin.com/login", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // si LinkedIn responde 429 en /login también
    if (
      respLogin &&
      typeof respLogin.status === "function" &&
      respLogin.status() === 429
    ) {
      await saveDebugArtifacts(page, "429_login");
      console.error("LinkedIn devolvió 429 en /login - aplicando backoff");
      try {
        await closeBrowser();
      } catch (e) {}
      return false;
    }

    const inputEmail = await page.waitForSelector("#username", {
      timeout: 15000,
    });
    await inputEmail.click({ clickCount: 3 });
    await inputEmail.type(process.env.EMAIL, { delay: 50 });

    await timeout(500);
    console.log("Email ingresado");

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
    // Si seguimos en login o nos redirigieron a un checkpoint/captcha, guardar evidencia
    const currUrl = page.url();
    const isCheckpoint =
      currUrl.includes("/checkpoint/") || currUrl.includes("/captcha");
    if (stillLogin || isCheckpoint) {
      await saveDebugArtifacts(
        page,
        isCheckpoint ? "checkpoint" : "still_login"
      );
      throw new Error(
        "No se pudo iniciar sesión: LinkedIn redirige al login o requiere verificación/checkpoint"
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
