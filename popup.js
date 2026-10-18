const keyInput = document.querySelector('#api-key');
const keyForm = document.querySelector('#key-form');
const saveStatus = document.querySelector('#save-status');
const tabStatus = document.querySelector('#tab-status');
const historyList = document.querySelector('#history-list');

initialize();

keyForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const key = keyInput.value.trim();
  if (!key) {
    saveStatus.textContent = 'Introduce una API Key válida.';
    return;
  }

  await chrome.storage.local.set({ openRouterApiKey: key });
  keyInput.value = '';
  saveStatus.textContent = 'API Key guardada en este navegador.';
});

document.querySelector('#clear-history').addEventListener('click', async () => {
  await chrome.storage.local.set({ history: [] });
  renderHistory([]);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.history) renderHistory(changes.history.newValue || []);
});

async function initialize() {
  const [{ openRouterApiKey, history = [] }, [tab]] = await Promise.all([
    chrome.storage.local.get(['openRouterApiKey', 'history']),
    chrome.tabs.query({ active: true, currentWindow: true })
  ]);

  if (openRouterApiKey) {
    keyInput.placeholder = 'API Key guardada';
    saveStatus.textContent = 'La clave ya está configurada.';
  }
  renderHistory(history);
  await injectControls(tab);
}

async function injectControls(tab) {
  if (!tab?.id) return;
  try {
    await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ['styles.css'] });
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
    tabStatus.textContent = 'Controles listos en esta pestaña.';
  } catch {
    tabStatus.textContent = 'Esta página no permite inyectar controles.';
  }
}

function renderHistory(history) {
  historyList.replaceChildren();
  if (!history.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-history';
    empty.textContent = 'Todavía no hay capturas.';
    historyList.append(empty);
    return;
  }

  for (const entry of history) {
    const item = document.createElement('li');
    item.className = 'history-entry';

    const image = document.createElement('img');
    image.src = entry.thumbnail;
    image.alt = 'Miniatura de la captura';

    const details = document.createElement('div');
    const time = document.createElement('time');
    time.dateTime = entry.createdAt;
    time.textContent = new Date(entry.createdAt).toLocaleString();

    const mode = document.createElement('span');
    mode.className = 'mode';
    mode.textContent = entry.mode === 'quick' ? 'Respuesta rápida' : 'Resolver y copiar';

    const answer = document.createElement('span');
    answer.className = 'answer';
    answer.textContent = entry.response;

    details.append(time, mode, answer);
    item.append(image, details);
    historyList.append(item);
  }
}