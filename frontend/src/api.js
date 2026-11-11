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

window.api = api; window.uploadFile = uploadFile;