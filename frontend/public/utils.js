// Shared UI helpers
function fmt(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'N/A';
  if (typeof n === 'number') {
    if (Number.isInteger(n)) return n.toLocaleString();
    return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  }
  return String(n);
}

function pct(n) {
  if (n === null || n === undefined || Number.isNaN(n)) return 'N/A';
  return Number(n).toFixed(2) + '%';
}

function pill(text, variant) {
  const map = { danger: 'danger', warning: 'warning', info: 'info', success: 'success' };
  return '<span class="badge bg-' + (map[variant] || 'secondary') + '">' + text + '</span>';
}

function download(filename, content, type = 'text/csv') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvFromRows(rows, columns) {
  if (!rows || !rows.length) return '';
  const cols = columns || Object.keys(rows[0]);
  const header = cols.join(',');
  const body = rows.map(r => cols.map(c => {
    const v = r[c];
    if (v === null || v === undefined) return '';
    const s = String(v);
    return s.includes(',') || s.includes('"') ? '"' + s.replace(/"/g, '""') + '"' : s;
  }).join(',')).join('\n');
  return header + '\n' + body;
}

function formatTimestamp(ts) {
  return new Date(ts * 1000).toLocaleString();
}

function formatDiff(diff) {
  if (diff === 0) return '—';
  return diff > 0 ? '+' + diff.toLocaleString() : diff.toLocaleString();
}

function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

window.fmt = fmt;
window.pct = pct;
window.pill = pill;
window.download = download;
window.csvFromRows = csvFromRows;
window.formatTimestamp = formatTimestamp;
window.formatDiff = formatDiff;
window.debounce = debounce;
window.throttle = throttle;