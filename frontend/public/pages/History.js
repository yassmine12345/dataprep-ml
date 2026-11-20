// History & Undo page
const e = React.createElement;
const { useState, useEffect } = React;

const History = ({ 
  history, 
  dataset,
  onUndo,
  onReset,
  loading,
}) => {
  const [expandedIndex, setExpandedIndex] = useState(null);

  if (!dataset) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon', key: 'icon' }, e(Icon, { name: 'history', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No Dataset Loaded'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Upload a dataset to see operation history'),
    ]);
  }

  const historyData = history || [];

  if (historyData.length === 0) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon', key: 'icon' }, e(Icon, { name: 'history', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No History Yet'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Apply preprocessing operations to build history'),
    ]);
  }

  const formatTimestamp = (ts) => {
    return new Date(ts * 1000).toLocaleString();
  };

  const formatDuration = (ms) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'History & Undo'),
        e('p', { className: 'text-muted' }, `${historyData.length} operation${historyData.length !== 1 ? 's' : ''} recorded`),
      ]),
      e('div', { className: 'd-flex gap-2' }, [
        e(Button, { variant: 'outline', leftIcon: 'download', onClick: () => {} }, 'Export History'),
        e(Button, { variant: 'danger', leftIcon: 'rotateCcw', onClick: () => onReset?.(), disabled: loading }, 'Reset to Original'),
      ]),
    ]),

    e(Card, { key: 'history-list' }, [
      e('div', { className: 'timeline' },
        historyData.map((entry, index) => {
          const isLast = index === historyData.length - 1;
          const opsSummary = entry.operations?.map(op => op.type).join(', ') || 'Unknown';
          const opsCount = entry.operations?.length || 0;
          const rowsDiff = entry.rows_after - entry.rows_before;
          const colsDiff = entry.columns_after - entry.columns_before;

          return e('div', { key: index, className: 'timeline-item', style: { position: 'relative', paddingLeft: 30, paddingBottom: 24 } }, [
            e('div', { className: 'timeline-marker', style: { position: 'absolute', left: 0, top: 4, width: 20, height: 20, borderRadius: '50%', background: isLast ? 'var(--indigo-600)' : 'var(--green-600)', border: '3px solid var(--bg-secondary)', zIndex: 1 } }),
            e('div', { className: 'timeline-line', style: { position: 'absolute', left: 9, top: 24, bottom: 0, width: 2, background: 'var(--border-light)' } }),
            e('div', { className: 'timeline-content p-3 border rounded-lg', style: { background: 'var(--bg-tertiary)', marginLeft: 20 } }, [
              e('div', { className: 'd-flex justify-content-between align-items-start mb-2' }, [
                e('div', { className: 'd-flex align-items-center gap-2' }, [
                  e('span', { className: 'badge badge-primary' }, `#${historyData.length - index}`),
                  e('span', { className: 'fw-semibold' }, opsSummary),
                ]),
                e('div', { className: 'text-muted small' }, formatTimestamp(entry.timestamp)),
              ]),
              e('div', { className: 'row g-3 mb-3' }, [
                e('div', { className: 'col-6 col-md-3' }, [
                  e('div', { className: 'text-muted small' }, 'Operations'),
                  e('div', { className: 'fw-semibold' }, opsCount),
                ]),
                e('div', { className: 'col-6 col-md-3' }, [
                  e('div', { className: 'text-muted small' }, 'Rows Change'),
                  e('div', { className: ['fw-semibold', rowsDiff > 0 ? 'text-success' : rowsDiff < 0 ? 'text-danger' : 'text-muted'].join(' ') }, formatDiff(rowsDiff)),
                ]),
                e('div', { className: 'col-6 col-md-3' }, [
                  e('div', { className: 'text-muted small' }, 'Columns Change'),
                  e('div', { className: ['fw-semibold', colsDiff > 0 ? 'text-success' : colsDiff < 0 ? 'text-danger' : 'text-muted'].join(' ') }, formatDiff(colsDiff)),
                ]),
                e('div', { className: 'col-6 col-md-3' }, [
                  e('div', { className: 'text-muted small' }, 'Status'),
                  e('div', { className: 'fw-semibold' }, isLast ? 'Current' : 'Applied'),
                ]),
              ]),
              e('button', {
                className: ['btn btn-sm', expandedIndex === index ? 'btn-secondary' : 'btn-outline'].join(' '),
                onClick: () => setExpandedIndex(expandedIndex === index ? null : index),
              }, expandedIndex === index ? 'Hide Details' : 'Show Details'),
              expandedIndex === index && e('div', { className: 'mt-3 p-3 bg-secondary rounded' }, [
                e('h6', { className: 'mb-2' }, 'Operations Detail'),
                entry.operations?.map((op, opIndex) => e('div', { key: opIndex, className: 'd-flex justify-content-between align-items-center p-2 mb-1 border rounded', style: { background: 'var(--bg-tertiary)' } }, [
                  e('div', { className: 'd-flex align-items-center gap-2' }, [
                    e('span', { className: 'badge badge-secondary' }, op.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
                    op.feature && e('span', { className: 'text-muted small' }, op.feature),
                  ]),
                  e('pre', { className: 'mb-0 small', style: { maxHeight: 200, overflow: 'auto' } }, JSON.stringify(op.params || {}, null, 2)),
                ])),
                entry.log?.map((logEntry, logIndex) => e('div', { key: logIndex, className: 'd-flex justify-content-between align-items-center p-2 mb-1 border rounded', style: { background: 'var(--bg-tertiary)' } }, [
                  e('div', { className: 'd-flex align-items-center gap-2' }, [
                    e('span', { className: 'badge badge-secondary' }, logEntry.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
                    logEntry.feature && e('span', { className: 'text-muted small' }, logEntry.feature),
                  ]),
                  e('span', { className: ['badge', logEntry.status === 'applied' ? 'badge-success' : logEntry.status === 'error' ? 'badge-danger' : 'badge-warning'].join(' ') }, logEntry.status),
                  logEntry.error && e('span', { className: 'text-danger small' }, logEntry.error),
                ])),
              ]),
              isLast && index > 0 && e('div', { className: 'mt-3' }, [
                e(Button, { variant: 'danger', leftIcon: 'rotateCcw', onClick: () => onUndo?.() }, 'Undo Last Operation'),
              ]),
            ]),
          ]);
        })
      ),
    ]),
  ]);
};

const formatDiff = (diff) => {
  if (diff === 0) return '—';
  return diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
};

window.History = History;