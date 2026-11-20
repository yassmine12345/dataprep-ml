// API helpers
const API = '/api/v1';

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'HTTP ' + res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

async function uploadFile(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(API + '/upload', { method: 'POST', body: form });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'HTTP ' + res.status);
  }
  return res.json();
}

// New API functions
async function getDataQuality(datasetId) {
  return api('/dataset/' + datasetId + '/quality');
}

async function getExplorerData(datasetId, params = {}) {
  const query = new URLSearchParams(params).toString();
  return api('/dataset/' + datasetId + '/explorer?' + query);
}

async function getDataAdvisor(datasetId) {
  return api('/dataset/' + datasetId + '/advisor');
}

async function balanceClasses(datasetId, body) {
  return api('/dataset/' + datasetId + '/balance', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

async function undoOperation(datasetId) {
  return api('/dataset/' + datasetId + '/undo', { method: 'POST' });
}

async function getHistory(datasetId) {
  return api('/dataset/' + datasetId + '/history');
}

async function exportDataset(datasetId, body) {
  const res = await fetch(API + '/dataset/' + datasetId + '/export', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || 'HTTP ' + res.status);
  }
  return res.blob();
}

async function generateReport(datasetId) {
  return api('/dataset/' + datasetId + '/report');
}

async function previewOperation(datasetId, operation) {
  return api('/dataset/' + datasetId + '/preview', {
    method: 'POST',
    body: JSON.stringify({ operation }),
  });
}

window.api = api;
window.uploadFile = uploadFile;
window.getDataQuality = getDataQuality;
window.getExplorerData = getExplorerData;
window.getDataAdvisor = getDataAdvisor;
window.balanceClasses = balanceClasses;
window.undoOperation = undoOperation;
window.getHistory = getHistory;
window.exportDataset = exportDataset;
window.generateReport = generateReport;
window.previewOperation = previewOperation;