const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-4-26b-a4b-it:free';
const HISTORY_LIMIT = 50;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'CAPTURE_AND_SOLVE') return false;

  const tabId = sender.tab?.id;
  if (typeof tabId !== 'number') {
    sendResponse({ ok: false, error: 'No se pudo identificar la pestaña.' });
    return false;
  }

  processCapture(tabId, sender.tab.windowId, message.mode)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => {
      notifyTab(tabId, { type: 'CAPTURE_STATUS', status: 'ERROR' });
      sendResponse({ ok: false, error: error.message || 'Error inesperado.' });
    });

  return true;
});

async function processCapture(tabId, windowId, mode) {
  notifyTab(tabId, { type: 'CAPTURE_STATUS', status: 'LOADING' });

  const { openRouterApiKey } = await chrome.storage.local.get('openRouterApiKey');
  if (!openRouterApiKey) throw new Error('Configura tu API Key de OpenRouter en el popup.');

  const screenshot = await chrome.tabs.captureVisibleTab(windowId, { format: 'jpeg', quality: 82 });
  await ensureOffscreenDocument();
  const imageProcessing = sendToOffscreen({ type: 'PROCESS_IMAGE', image: screenshot })
    .catch(() => ({ text: '', thumbnail: '' }));
  const analysis = await requestAnalysis(openRouterApiKey, screenshot, mode);

  if (mode === 'solve') {
    const clipboardResult = await sendToOffscreen({ type: 'COPY_TEXT', text: analysis });
    if (!clipboardResult?.ok) throw new Error('No se pudo copiar la respuesta al portapapeles.');
  }

  notifyTab(tabId, {
    type: 'CAPTURE_STATUS',
    status: mode === 'quick' ? 'RESULT' : 'COPIED',
    result: analysis
  });

  const processed = await imageProcessing;
  const record = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    mode,
    prompt: getPrompt(mode),
    response: analysis,
    thumbnail: processed.thumbnail,
    ocrText: processed.text.slice(0, 2000)
  };

  const { history = [] } = await chrome.storage.local.get('history');
  await chrome.storage.local.set({ history: [record, ...history].slice(0, HISTORY_LIMIT) });

  return analysis;
}

async function requestAnalysis(apiKey, screenshot, mode) {
  const body = {
    model: MODEL,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: getPrompt(mode) },
        { type: 'image_url', image_url: { url: screenshot } }
      ]
    }]
  };

  const response = await fetch(API_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': chrome.runtime.getURL(''),
      'X-Title': 'Captura y resolución'
    },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenRouter respondió con HTTP ${response.status}.`);
  }

  const answer = data.choices?.[0]?.message?.content;
  const text = typeof answer === 'string'
    ? answer.trim()
    : answer?.filter((part) => part.type === 'text').map((part) => part.text).join('\n').trim();
  if (!text) throw new Error('El modelo no devolvió una respuesta de texto.');
  return text;
}

function getPrompt(mode) {
  return mode === 'quick'
    ? 'Devuelve ÚNICAMENTE la letra u opción correcta (ejemplo: A, B, C, D o 1, 2, 3, 4) sin ninguna palabra adicional'
    : 'Resuelve este ejercicio de forma concisa y directa';
}

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen.html',
    reasons: ['CLIPBOARD'],
    justification: 'Ejecutar OCR y escribir la respuesta en el portapapeles.'
  });
}

function sendToOffscreen(message) {
  return chrome.runtime.sendMessage(message);
}

function notifyTab(tabId, message) {
  chrome.tabs.sendMessage(tabId, message).catch(() => {});
}