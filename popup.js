const keyInput = document.querySelector('#api-key');
const keyForm = document.querySelector('#key-form');
const saveStatus = document.querySelector('#save-status');
const tabStatus = document.querySelector('#tab-status');
const historyList = document.querySelector('#history-list');
const opacitySlider = document.querySelector('#buttons-opacity');
const opacityValue = document.querySelector('#opacity-value');
let activeTab;

initialize();

opacitySlider.addEventListener('input', async () => {
  const buttonsOpacity = Number(opacitySlider.value);
  opacityValue.value = `${buttonsOpacity}%`;
  await chrome.storage.local.set({ buttonsOpacity });

  if (activeTab?.id) {
    chrome.tabs.sendMessage(activeTab.id, {
      type: 'UPDATE_BUTTONS_OPACITY',
      opacity: buttonsOpacity
    }).catch(() => {});
  }
});

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
  const [{ openRouterApiKey, history = [], buttonsOpacity = 0 }, [tab]] = await Promise.all([
    chrome.storage.local.get(['openRouterApiKey', 'history', 'buttonsOpacity']),
    chrome.tabs.query({ active: true, currentWindow: true })
  ]);
  activeTab = tab;
  const opacity = Math.min(50, Math.max(0, Number(buttonsOpacity) || 0));
  opacitySlider.value = String(opacity);
  opacityValue.value = `${opacity}%`;

  if (openRouterApiKey) {
    keyInput.placeholder = 'API Key guardada';
    saveStatus.textContent = 'La clave ya está configurada.';
  }
  renderHistory(history);
  tabStatus.textContent = tab?.id
    ? 'Controles disponibles en esta pestaña.'
    : 'No hay una pestaña activa disponible.';
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