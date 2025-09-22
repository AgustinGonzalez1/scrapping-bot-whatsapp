# Scrapping Bot WhatsApp

Bot automatizado que revisa LinkedIn en busca de publicaciones recientes sobre vacantes de *desarrollador frontend* y envía la URL de cada hallazgo mediante la API de WhatsApp provista por UltraMsg (o un servicio compatible). El proceso se ejecuta de forma programada con `node-cron` y usa Puppeteer para iniciar sesión en LinkedIn, navegar por los resultados y filtrar las publicaciones relevantes.

## Requisitos previos

- Node.js 18 o superior (Puppeteer requiere versiones recientes de Node).
- npm 8 o superior (incluido con Node.js).
- Cuenta de LinkedIn con credenciales válidas para iniciar sesión.
- Instancia activa de la API de WhatsApp que expone los endpoints `/message/sendText` (por ejemplo, UltraMsg) y claves de autenticación válidas.

> **Nota:** Puppeteer descarga automáticamente una versión de Chromium. En entornos Linux es posible que necesites instalar dependencias adicionales del sistema (por ejemplo `libgtk-3-0`, `libnss3`, `libx11-xcb1`, `libxss1`, etc.). Consulta la [documentación oficial](https://pptr.dev/troubleshooting#chrome-headless-doesnt-launch-on-unix) si el navegador no inicia correctamente.

## Configuración del proyecto

1. Clona el repositorio y entra en la carpeta del proyecto:

   ```bash
   git clone <url-del-repositorio>
   cd scrapping-bot-whatsapp
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Crea un archivo `.env` en la raíz del proyecto con las variables necesarias:

   ```env
   API_URL=https://api.ejemplo.com
   API_KEY=tu-clave-api
   INSTANCE_NAME=nombre-de-tu-instancia
   NUMBER1=521234567890
   NUMBER2=529876543210
   EMAIL=tu-correo@ejemplo.com
   PASSWORD=tu-contraseña
   ```

   - `API_URL`: URL base de la API de WhatsApp.
   - `API_KEY`: clave o token de autenticación que espera la API (se envía en el encabezado `apikey`).
   - `INSTANCE_NAME`: identificador de la instancia configurada en el proveedor de WhatsApp.
   - `NUMBER1` y `NUMBER2`: números de teléfono a los que se enviarán los enlaces (incluye prefijo internacional).
   - `EMAIL` y `PASSWORD`: credenciales de LinkedIn para iniciar sesión desde Puppeteer.

4. (Opcional) Modifica la URL de búsqueda de LinkedIn en `index.js` para usar otras palabras clave, o ajusta los filtros dentro de la función `checkWhatsAppWeb` si quieres detectar distintos términos.

## Ejecución

Inicia el bot con:

```bash
node index.js
```

- El script abre una ventana de Chromium controlada por Puppeteer (modo no headless) e inicia sesión en LinkedIn la primera vez que se ejecuta.
- Cada minuto, `node-cron` recarga los resultados de búsqueda y revisa las publicaciones. Si detecta una publicación que contiene los términos configurados, extrae su `data-urn` y construye la URL pública del post.
- Las URLs nuevas se almacenan en memoria (`savedPosts`) para evitar envíos duplicados durante la sesión actual.
- Por cada publicación nueva encontrada, se realizan peticiones `POST` a la API de WhatsApp para los dos números configurados.

Para detener el bot presiona `Ctrl + C` en la terminal.

## Despliegue y automatización

- Si ejecutas el bot en un servidor remoto sin entorno gráfico, considera cambiar `headless: false` a `headless: true` en `index.js` y utilizar soluciones como `xvfb` si la autenticación de LinkedIn lo permite.
- Puedes usar un administrador de procesos (por ejemplo PM2 o systemd) para mantener el script corriendo en segundo plano.
- Mantén tus credenciales protegidas y evita subir el archivo `.env` al repositorio (agrega la ruta a `.gitignore` si aún no está).

## Mantenimiento

- Revisa periódicamente la búsqueda y los filtros para asegurarte de que las publicaciones relevantes sigan siendo detectadas.
- Considera persistir los `savedPosts` en una base de datos o archivo si necesitas evitar duplicados entre ejecuciones.
- Añade manejo de errores y reintentos adicionales si la API de WhatsApp o LinkedIn fallan temporalmente.

---

¡Listo! Con esto tendrás un bot básico que te avisa por WhatsApp cuando aparezcan nuevas oportunidades de frontend en LinkedIn.
