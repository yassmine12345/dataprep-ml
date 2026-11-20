// Dashboard page
const e = React.createElement;
const { useState, useEffect } = React;

const Dashboard = ({ 
  dataset, 
  eda, 
  quality, 
  recentOperations, 
  onNavigate,
  loading,
  target,
  task,
  onSaveConfig,
}) => {
  const [stats, setStats] = useState(null);
  const [showConfig, setShowConfig] = useState(false);
  const [configTarget, setConfigTarget] = useState(target || '');
  const [configTask, setConfigTask] = useState(task || 'supervised');

  useEffect(() => {
    if (eda && quality) {
      const qs = quality.quality_score;
      const qualityScore = (typeof qs === 'object' && qs !== null && 'score' in qs) ? qs.score : qs;
      setStats({
        rows: eda.n_rows,
        columns: eda.n_columns,
        missing: eda.missing_total,
        duplicates: eda.duplicate_rows,
        qualityScore: qualityScore ?? 0,
        numericCols: eda.numeric_columns?.length || 0,
        categoricalCols: eda.categorical_columns?.length || 0,
      });
    }
  }, [eda, quality]);

  if (!dataset) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { key: 'icon', className: 'empty-state-icon' }, e(Icon, { name: 'database', size: 48 })),
      e('h3', { key: 'title', className: 'empty-state-title' }, 'No Dataset Loaded'),
      e('p', { key: 'desc', className: 'empty-state-description' }, 'Upload a dataset to see the dashboard overview'),
      e(Button, { key: 'upload', variant: 'primary', onClick: () => onNavigate('upload'), leftIcon: 'upload' }, 'Upload Dataset'),
    ]);
  }

  // Show loading state while stats are being computed
  if (!stats) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { key: 'icon', className: 'loading-spinner', style: { width: 48, height: 48 } }),
      e('h3', { key: 'title', className: 'empty-state-title mt-3' }, 'Loading Dashboard...'),
      e('p', { key: 'desc', className: 'empty-state-description' }, 'Computing statistics from your dataset'),
    ]);
  }

  const statCards = stats ? [
    { value: stats.rows.toLocaleString(), label: 'Rows', icon: 'database', iconColor: 'primary' },
    { value: stats.columns.toLocaleString(), label: 'Columns', icon: 'spreadsheet', iconColor: 'violet' },
    { value: stats.missing.toLocaleString(), label: 'Missing Values', icon: 'alertCircle', iconColor: 'warning' },
    { value: stats.duplicates.toLocaleString(), label: 'Duplicate Rows', icon: 'copy', iconColor: 'info' },
    { value: stats.numericCols.toLocaleString(), label: 'Numeric Columns', icon: 'hash', iconColor: 'success' },
    { value: stats.categoricalCols.toLocaleString(), label: 'Categorical Columns', icon: 'tag', iconColor: 'coral' },
  ] : [];

  // Show configuration panel if target/task not set
  if (!target || !task) {
    const columns = dataset.column_names || [];
    return e('div', null, [
      e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
        e('div', null, [
          e('h1', { className: 'mb-1' }, 'Dashboard'),
          e('p', { className: 'text-muted' }, `Overview of ${dataset.filename}`),
        ]),
        e(Button, { variant: 'primary', leftIcon: 'refresh', onClick: () => window.location.reload() }, 'Refresh'),
      ]),

      e(Card, { key: 'config', header: 'Configure Learning Task & Target' }, [
        e('div', { className: 'row g-3' }, [
          e('div', { className: 'col-12 col-md-6' }, [
            e('label', { className: 'form-label' }, 'Learning Task'),
            e('select', {
              className: 'form-select',
              value: configTask,
              onChange: e => setConfigTask(e.target.value),
            }, [
              e('option', { value: 'supervised' }, 'Supervised'),
              e('option', { value: 'unsupervised' }, 'Unsupervised'),
            ]),
            e('div', { className: 'form-text' }, 'Select "Supervised" for classification/regression with a target column.'),
          ]),
          configTask === 'supervised' && e('div', { className: 'col-12 col-md-6' }, [
            e('label', { className: 'form-label' }, 'Target Column *'),
            e('select', {
              className: 'form-select',
              value: configTarget,
              onChange: e => setConfigTarget(e.target.value),
            }, [
              e('option', { value: '' }, 'Select a column...'),
              columns.map(col => e('option', { key: col, value: col }, col)),
            ]),
            e('div', { className: 'form-text' }, 'Choose the column to predict (required for supervised learning).'),
          ]),
        ]),
        e('div', { className: 'mt-3 d-flex gap-2' }, [
          e(Button, { 
            variant: 'primary', 
            leftIcon: 'save', 
            onClick: () => onSaveConfig(configTarget, configTask),
            disabled: configTask === 'supervised' && !configTarget || loading
          }, 'Save Configuration'),
          e(Button, { variant: 'secondary', onClick: () => setShowConfig(false) }, 'Cancel'),
        ]),
      ]),

      e(StatCardGrid, { key: 'stats', stats: statCards, columns: 6 }),
    ]);
  }

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'Dashboard'),
        e('p', { className: 'text-muted' }, `Overview of ${dataset.filename}`),
      ]),
      e(Button, { variant: 'primary', leftIcon: 'refresh', onClick: () => window.location.reload() }, 'Refresh'),
    ]),

    stats && e(QualityScore, { 
      key: 'quality', 
      score: stats.qualityScore, 
      grade: stats.qualityScore >= 90 ? 'A' : stats.qualityScore >= 80 ? 'B' : stats.qualityScore >= 70 ? 'C' : stats.qualityScore >= 60 ? 'D' : 'F',
      description: stats.qualityScore >= 90 ? 'Excellent - Data is clean and ready for modeling' :
                   stats.qualityScore >= 80 ? 'Good - Minor issues that should be addressed' :
                   stats.qualityScore >= 70 ? 'Fair - Several issues requiring attention' :
                   stats.qualityScore >= 60 ? 'Poor - Significant data quality problems' :
                   'Critical - Major data quality issues, extensive cleaning needed',
      size: 'lg',
    }),

    e(StatCardGrid, { key: 'stats', stats: statCards, columns: 6 }),

    stats && eda && e('div', { key: 'charts', className: 'row g-4 mt-4' }, [
      e('div', { key: 'types', className: 'col-12 col-lg-6' },
        e(Card, { header: 'Data Type Distribution' },
          e(PieChart, { 
            data: [stats.numericCols, stats.categoricalCols], 
            labels: ['Numeric', 'Categorical'],
            colors: ['rgba(99, 102, 241, 0.8)', 'rgba(139, 92, 246, 0.8)'],
            height: 280,
          })
        )
      ),
      e('div', { key: 'missing', className: 'col-12 col-lg-6' },
        e(Card, { header: 'Missing Values Overview' },
          e(BarChart, { 
            data: (eda.missing_values || []).map(r => r.missing),
            labels: (eda.missing_values || []).map(r => r.column),
            horizontal: true,
            color: 'rgba(245, 158, 11, 0.7)',
            height: 280,
          })
        )
      ),
    ]),

    quality && quality.issues_by_category && e('div', { key: 'issues', className: 'row g-4 mt-4' }, [
      e('div', { key: 'quality-issues', className: 'col-12' },
        e(Card, { header: 'Data Quality Issues by Category' },
          e(BarChart, { 
            data: Object.entries(quality.issues_by_category).map(([cat, issues]) => issues.length),
            labels: Object.keys(quality.issues_by_category).map(k => k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
            color: 'rgba(239, 68, 68, 0.7)',
            height: 280,
          })
        )
      ),
    ]),

    recentOperations && recentOperations.length > 0 && e('div', { key: 'recent', className: 'mt-4' },
      e(Card, { header: 'Recent Operations' },
        e(Table, {
          data: recentOperations.slice(0, 10),
          columns: [
            { key: 'timestamp', label: 'Time', width: 150 },
            { key: 'type', label: 'Operation' },
            { key: 'feature', label: 'Feature' },
            { key: 'status', label: 'Status' },
          ],
          pageSize: 10,
          pagination: false,
        })
      )
    ),
  ]);
};

window.Dashboard = Dashboard;