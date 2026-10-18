# Captura y resolución

Extensión de Chrome Manifest V3 para capturar la pestaña actual, analizar el ejercicio con un modelo de visión de OpenRouter, mostrar/copiar la respuesta y guardar un historial local. Tesseract.js intenta extraer texto de la captura en inglés y español; el análisis principal envía la imagen al modelo.

## Instalación

1. Ejecuta `npm install` en esta carpeta para instalar Tesseract.js localmente.
2. Abre `chrome://extensions` en Chrome y activa **Modo de desarrollador**.
3. Pulsa **Cargar extensión sin empaquetar** y selecciona esta carpeta.
4. Abre el popup de la extensión, guarda una API Key de OpenRouter y vuelve a la pestaña que quieres analizar.
5. Pulsa el icono de la extensión para inyectar los controles en esa pestaña. Haz clic en la zona invisible del borde izquierdo para resolver y copiar, o en la derecha para pedir una respuesta breve.

La clave y las últimas 50 consultas se guardan en `chrome.storage.local`. El OCR descarga los datos de idioma desde `tessdata.projectnaptha.com` la primera vez que se usa y requiere conexión. La disponibilidad de modelos gratuitos puede cambiar; si el modelo configurado deja de estar disponible, cambia `MODEL` en `background.js` por un modelo de visión activo en OpenRouter. Algunas páginas protegidas de Chrome no permiten inyectar controles.