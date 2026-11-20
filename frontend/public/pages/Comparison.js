// Comparison page
const e = React.createElement;
const { useState, useMemo } = React;

const Comparison = ({ 
  comparison, 
  dataset,
  onExport,
}) => {
  const [activeTab, setActiveTab] = useState('overview');

  const original = comparison?.original || {};
  const cleaned = comparison?.cleaned || {};
  const operations = comparison?.operations || [];
  const log = comparison?.log || [];

  if (!dataset || !comparison) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon', key: 'icon' }, e(Icon, { name: 'compare', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No Comparison Available'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Apply preprocessing operations to see before/after comparison'),
    ]);
  }

  const statsComparison = [
    { label: 'Rows', original: original.rows, cleaned: cleaned.rows, diff: cleaned.rows - original.rows },
    { label: 'Columns', original: original.columns, cleaned: cleaned.columns, diff: cleaned.columns - original.columns },
    { label: 'Missing Values', original: original.missing_total, cleaned: cleaned.missing_total, diff: cleaned.missing_total - original.missing_total },
    { label: 'Duplicate Rows', original: original.duplicate_rows, cleaned: cleaned.duplicate_rows, diff: cleaned.duplicate_rows - original.duplicate_rows },
  ];

  const getDiffClass = (diff) => {
    if (diff === 0) return 'text-muted';
    if (diff > 0) return 'text-success';
    return 'text-danger';
  };

  const formatDiff = (diff) => {
    if (diff === 0) return '—';
    return diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString();
  };

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'Before & After Comparison'),
        e('p', { className: 'text-muted' }, `Comparing original vs processed dataset`),
      ]),
      e('div', { className: 'd-flex gap-2' }, [
        e(Button, { variant: 'outline', leftIcon: 'download', onClick: () => onExport('csv', 'original') }, 'Export Original'),
        e(Button, { variant: 'outline', leftIcon: 'download', onClick: () => onExport('csv', 'cleaned') }, 'Export Cleaned'),
        e(Button, { variant: 'primary', leftIcon: 'download', onClick: () => onExport('excel', 'both') }, 'Export Report'),
      ]),
    ]),

    e('div', { key: 'tabs', className: 'tabs mb-4' }, [
      e('button', { className: ['tab', activeTab === 'overview' && 'active'].filter(Boolean).join(' '), onClick: () => setActiveTab('overview') }, 'Overview'),
      e('button', { className: ['tab', activeTab === 'stats' && 'active'].filter(Boolean).join(' '), onClick: () => setActiveTab('stats') }, 'Statistics'),
      e('button', { className: ['tab', activeTab === 'operations' && 'active'].filter(Boolean).join(' '), onClick: () => setActiveTab('operations') }, 'Operations Log'),
      e('button', { className: ['tab', activeTab === 'preview' && 'active'].filter(Boolean).join(' '), onClick: () => setActiveTab('preview') }, 'Data Preview'),
    ]),

    activeTab === 'overview' && e('div', { key: 'overview', className: 'tab-content active' }, [
      e('div', { className: 'row g-4 mb-4' }, [
        e('div', { key: 'original-card', className: 'col-12 col-md-6' },
          e(Card, { header: e('div', { className: 'd-flex align-items-center gap-2' }, [e(Icon, { name: 'database', size: 18, className: 'text-muted' }), 'Original Dataset']) }, [
            e('div', { className: 'stats-grid' },
              statsComparison.map((stat, i) => e(StatCard, { 
                key: i, 
                value: stat.original.toLocaleString(), 
                label: stat.label,
                trend: stat.diff,
                trendLabel: formatDiff(stat.diff),
                icon: 'database',
                iconColor: 'secondary',
              }))
            ),
          ])
        ),
        e('div', { key: 'cleaned-card', className: 'col-12 col-md-6' },
          e(Card, { header: e('div', { className: 'd-flex align-items-center gap-2' }, [e(Icon, { name: 'checkCircle', size: 18, className: 'text-success' }), 'Cleaned Dataset']) }, [
            e('div', { className: 'stats-grid' },
              statsComparison.map((stat, i) => e(StatCard, { 
                key: i, 
                value: stat.cleaned.toLocaleString(), 
                label: stat.label,
                trend: -stat.diff,
                trendLabel: formatDiff(-stat.diff),
                icon: 'checkCircle',
                iconColor: 'success',
              }))
            ),
          ])
        ),
      ]),

      e('div', { key: 'diff', className: 'row g-4' }, [
        e('div', { key: 'summary', className: 'col-12' },
          e(Card, { header: 'Changes Summary' }, [
            e(Table, {
              data: statsComparison.map(s => ({
                metric: s.label,
                original: s.original.toLocaleString(),
                cleaned: s.cleaned.toLocaleString(),
                change: formatDiff(s.diff),
              })),
              columns: [
                { key: 'metric', label: 'Metric' },
                { key: 'original', label: 'Original' },
                { key: 'cleaned', label: 'Cleaned' },
                { key: 'change', label: 'Change' },
              ],
              pagination: false,
              renderCell: (value, col, row) => {
                if (col.key === 'change') {
                  return e('span', { className: getDiffClass(row.change.startsWith('+') ? 1 : row.change.startsWith('-') ? -1 : 0) }, value);
                }
                return value;
              },
            }),
          ])
        ),
      ]),
    ]),

    activeTab === 'stats' && e('div', { key: 'stats', className: 'tab-content active' }, [
      e('div', { className: 'row g-4' }, [
        e('div', { key: 'dtypes', className: 'col-12 col-lg-6' },
          e(Card, { header: 'Data Type Changes' }, [
            dataset && e(Table, {
              data: Object.entries(dataset.dtypes || {}).map(([col, dtype]) => ({
                column: col,
                original_type: dtype,
                cleaned_type: cleaned.preview?.[0]?.[col] !== undefined ? typeof cleaned.preview[0][col] : dtype,
              })),
              columns: [
                { key: 'column', label: 'Column' },
                { key: 'original_type', label: 'Original Type' },
                { key: 'cleaned_type', label: 'Cleaned Type' },
              ],
              pageSize: 20,
            }),
          ])
        ),
        e('div', { key: 'numeric-stats', className: 'col-12 col-lg-6' },
          e(Card, { header: 'Numeric Statistics Comparison' }, [
            e('p', { className: 'text-muted small mb-3' }, 'Detailed statistics comparison would be shown here'),
          ])
        ),
      ]),
    ]),

    activeTab === 'operations' && e('div', { key: 'operations', className: 'tab-content active' }, [
      e(Card, { header: 'Applied Operations Log' }, [
        log && log.length > 0 ? e('div', { style: { maxHeight: 500, overflow: 'auto' } },
          log.map((entry, i) => e('div', { key: i, className: 'log-entry p-3 border-bottom d-flex gap-3', style: { background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent' } }, [
            e('div', { className: 'badge badge-primary', style: { minWidth: 100 } }, entry.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
            e('div', { className: 'flex-1' }, [
              e('div', { className: 'fw-semibold' }, entry.feature || 'Dataset'),
              e('div', { className: 'text-muted small' }, Object.entries(entry).filter(([k]) => !['type', 'feature', 'status'].includes(k)).map(([k, v]) => `${k}: ${v}`).join(', ')),
            ]),
            e('span', { className: ['badge', entry.status === 'applied' ? 'badge-success' : entry.status === 'error' ? 'badge-danger' : 'badge-warning'].join(' ') }, entry.status),
          ]))
        ) : e('div', { className: 'empty-state py-5' }, [
          e(Icon, { name: 'clipboard', size: 48, className: 'text-muted mb-3' }),
          e('h5', null, 'No Operations Applied'),
          e('p', { className: 'text-muted' }, 'Apply preprocessing operations to see the log here'),
        ]),
      ]),
    ]),

    activeTab === 'preview' && e('div', { key: 'preview', className: 'tab-content active' }, [
      e('div', { className: 'row g-4' }, [
        e('div', { key: 'original-preview', className: 'col-12 col-lg-6' },
          e(Card, { header: 'Original Preview' }, [
            original.preview && e(Table, {
              data: original.preview,
              columns: Object.keys(original.preview[0] || {}).map(c => ({ key: c, label: c })),
              pageSize: 10,
              pagination: false,
            }),
          ])
        ),
        e('div', { key: 'cleaned-preview', className: 'col-12 col-lg-6' },
          e(Card, { header: 'Cleaned Preview' }, [
            cleaned.preview && e(Table, {
              data: cleaned.preview,
              columns: Object.keys(cleaned.preview[0] || {}).map(c => ({ key: c, label: c })),
              pageSize: 10,
              pagination: false,
            }),
          ])
        ),
      ]),
    ]),
  ]);
};

window.Comparison = Comparison;