import { createWorker } from './node_modules/tesseract.js/dist/tesseract.esm.min.js';

let ocrWorker;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;

  if (message?.type === 'PROCESS_IMAGE') {
    processImage(message.image).then(sendResponse).catch((error) => {
      sendResponse({ text: '', thumbnail: '', error: error.message });
    });
    return true;
  }

  if (message?.type === 'COPY_TEXT') {
    navigator.clipboard.writeText(message.text)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function processImage(image) {
  const thumbnail = await makeThumbnail(image);
  let text = '';

  try {
    ocrWorker ||= await createWorker('eng+spa', 1, {
      workerPath: chrome.runtime.getURL('node_modules/tesseract.js/dist/worker.min.js'),
      corePath: chrome.runtime.getURL('node_modules/tesseract.js-core'),
      langPath: 'https://tessdata.projectnaptha.com/4.0.0',
      logger: () => {}
    });
    const result = await ocrWorker.recognize(image);
    text = result.data.text || '';
  } catch (error) {
    console.warn('OCR no disponible:', error);
  }

  return { text, thumbnail };
}

async function makeThumbnail(image) {
  const bitmap = await createImageBitmap(await (await fetch(image)).blob());
  const scale = Math.min(1, 320 / bitmap.width);
  const canvas = new OffscreenCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
  const context = canvas.getContext('2d');
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.45 }).then(blobToDataUrl);
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}