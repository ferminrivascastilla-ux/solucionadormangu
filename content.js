(() => {
  if (window.__captureResolverInstalled) return;
  window.__captureResolverInstalled = true;

  const left = document.createElement('button');
  left.className = 'capture-resolver-zone capture-resolver-left';
  left.type = 'button';
  left.setAttribute('aria-label', 'Capturar, resolver y copiar');
  left.title = 'Capturar, resolver y copiar';

  const right = document.createElement('button');
  right.className = 'capture-resolver-zone capture-resolver-right';
  right.type = 'button';
  right.setAttribute('aria-label', 'Captura de respuesta rápida');
  right.title = 'Captura de respuesta rápida';

  const status = document.createElement('div');
  status.className = 'capture-resolver-status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  document.documentElement.append(left, right, status);

  left.addEventListener('click', () => requestCapture('solve'));
  right.addEventListener('click', () => requestCapture('quick'));

  let hideTimer;
  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== 'CAPTURE_STATUS') return;
    clearTimeout(hideTimer);
    status.classList.add('capture-resolver-status-visible');

    if (message.status === 'LOADING') {
      status.textContent = '...';
      status.classList.add('capture-resolver-loading');
      return;
    }

    status.classList.remove('capture-resolver-loading');
    if (message.status === 'ERROR') {
      status.textContent = '🔺';
      status.title = 'No se pudo completar la captura';
      hideTimer = setTimeout(hideStatus, 1800);
    } else if (message.status === 'COPIED') {
      status.textContent = '⬛';
      status.title = 'Respuesta copiada';
      hideTimer = setTimeout(hideStatus, 400);
    } else {
      status.textContent = message.result || '';
      status.title = message.result || 'Respuesta rápida';
      hideTimer = setTimeout(hideStatus, 400);
    }
  });

  function requestCapture(mode) {
    status.textContent = '...';
    status.title = 'Procesando';
    status.classList.add('capture-resolver-status-visible', 'capture-resolver-loading');
    chrome.runtime.sendMessage({ type: 'CAPTURE_AND_SOLVE', mode }).catch(() => {
      status.classList.remove('capture-resolver-loading');
      status.textContent = '🔺';
      hideTimer = setTimeout(hideStatus, 1800);
    });
  }

  function hideStatus() {
    status.classList.remove('capture-resolver-status-visible', 'capture-resolver-loading');
    status.removeAttribute('title');
    status.textContent = '';
  }
})();