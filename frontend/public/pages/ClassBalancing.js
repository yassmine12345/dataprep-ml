// Class Balancing page
const e = React.createElement;
const { useState, useEffect, useMemo } = React;

const ClassBalancing = ({ 
  dataset, 
  target, 
  task,
  classDistribution,
  onBalance,
  loading,
  onNavigate,
}) => {
  const [selectedMethod, setSelectedMethod] = useState('smote');
  const [params, setParams] = useState({});
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [samplingStrategy, setSamplingStrategy] = useState('auto');
  const [kNeighbors, setKNeighbors] = useState(5);
  const [randomState, setRandomState] = useState(42);

  const methods = [
    { 
      id: 'smote', 
      label: 'SMOTE', 
      description: 'Synthetic Minority Oversampling Technique - generates synthetic samples for minority classes',
      icon: 'plus',
      color: 'primary',
      params: [
        { name: 'sampling_strategy', label: 'Sampling Strategy', type: 'select', options: ['auto', 'minority', 'not majority', 'not minority', 'all'], default: 'auto' },
        { name: 'k_neighbors', label: 'K Neighbors', type: 'number', default: 5, min: 1 },
        { name: 'random_state', label: 'Random State', type: 'number', default: 42 },
      ],
      requiresNumeric: true,
      warning: 'SMOTE should only be applied to training data after train/test split to avoid data leakage.',
    },
    { 
      id: 'smotenc', 
      label: 'SMOTE-NC', 
      description: 'SMOTE for mixed numerical and categorical data',
      icon: 'database',
      color: 'violet',
      params: [
        { name: 'sampling_strategy', label: 'Sampling Strategy', type: 'select', options: ['auto', 'minority', 'not majority', 'not minority', 'all'], default: 'auto' },
        { name: 'k_neighbors', label: 'K Neighbors', type: 'number', default: 5, min: 1 },
        { name: 'random_state', label: 'Random State', type: 'number', default: 42 },
      ],
      requiresNumeric: true,
      requiresCategorical: true,
      warning: 'SMOTE-NC should only be applied to training data after train/test split to avoid data leakage.',
    },
    { 
      id: 'random_oversample', 
      label: 'Random Oversampling', 
      description: 'Randomly duplicate minority class samples',
      icon: 'copy',
      color: 'teal',
      params: [
        { name: 'sampling_strategy', label: 'Sampling Strategy', type: 'select', options: ['auto', 'minority', 'not majority', 'not minority', 'all'], default: 'auto' },
        { name: 'random_state', label: 'Random State', type: 'number', default: 42 },
      ],
      warning: 'Can lead to overfitting as exact samples are duplicated.',
    },
    { 
      id: 'random_undersample', 
      label: 'Random Undersampling', 
      description: 'Randomly remove majority class samples',
      icon: 'minus',
      color: 'coral',
      params: [
        { name: 'sampling_strategy', label: 'Sampling Strategy', type: 'select', options: ['auto', 'majority', 'not minority', 'not majority', 'all'], default: 'auto' },
        { name: 'random_state', label: 'Random State', type: 'number', default: 42 },
      ],
      warning: 'May lose important information from majority class.',
    },
  ];

  const selectedMethodDef = methods.find(m => m.id === selectedMethod);
  const numericCols = dataset?.column_names?.filter(c => ['number', 'integer', 'float'].includes(dataset.dtypes?.[c] || '')) || [];
  const categoricalCols = dataset?.column_names?.filter(c => !['number', 'integer', 'float'].includes(dataset.dtypes?.[c] || '')) || [];
  const canUseNumeric = numericCols.length > 0;
  const canUseCategorical = categoricalCols.length > 0;

  const isTargetValid = target && classDistribution && Object.keys(classDistribution).length >= 2;
  const imbalanceRatio = isTargetValid ? Math.max(...Object.values(classDistribution)) / Math.min(...Object.values(classDistribution)) : 0;

  const handleBalance = async () => {
    if (!selectedMethodDef || !target) return;
    await onBalance({
      method: selectedMethod,
      target,
      params: { ...params, random_state: randomState },
    });
  };

  const handlePreview = async () => {
    if (!selectedMethodDef || !target) return;
    setShowPreview(true);
    // In real implementation, call preview API
  };

  if (!dataset) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon', key: 'icon' }, e(Icon, { name: 'balance', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No Dataset Loaded'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Upload a dataset to use class balancing'),
    ]);
  }

  if (!target || task !== 'supervised') {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon bg-amber-100 text-amber-600', key: 'icon' }, e(Icon, { name: 'target', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'Target Column Required'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Please set a target column and select "Supervised" learning task in the configuration step.'),
      e(Button, { key: 'config', variant: 'primary', leftIcon: 'settings', onClick: () => onNavigate('dashboard') }, 'Go to Configuration'),
    ]);
  }

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'Class Balancing'),
        e('p', { className: 'text-muted' }, `Target: ${target} — ${Object.keys(classDistribution || {}).length} classes`),
      ]),
      e(Button, { variant: 'primary', leftIcon: 'play', onClick: handleBalance, disabled: !isTargetValid || loading, loading }, 'Apply Balancing'),
    ]),

    e('div', { key: 'distribution', className: 'row g-4 mb-4' }, [
      e('div', { key: 'current', className: 'col-12 col-lg-6' },
        e(Card, { header: 'Current Class Distribution' }, [
          classDistribution && e('div', { className: 'd-flex flex-wrap gap-2' },
            Object.entries(classDistribution).map(([cls, count]) => {
              const pct = (count / Object.values(classDistribution).reduce((a, b) => a + b, 0)) * 100;
              return e('div', { key: cls, className: 'd-flex align-items-center gap-3 p-3 border rounded-lg', style: { background: 'var(--bg-tertiary)', flex: 1, minWidth: 200 } }, [
                e('div', { className: 'fw-semibold', style: { minWidth: 80 } }, String(cls)),
                e('div', { className: 'flex-1', style: { height: 8, background: 'var(--border-light)', borderRadius: 'var(--radius-full)' } },
                  e('div', { className: 'bg-indigo-600 h-100 rounded-full', style: { width: `${pct}%` } })
                ),
                e('div', { className: 'text-muted small', style: { minWidth: 80 } }, `${count.toLocaleString()} (${pct.toFixed(1)}%)`),
              ]);
            })
          ),
          e('div', { className: 'mt-3 p-3 bg-tertiary rounded-lg' }, [
            e('div', { className: 'd-flex justify-content-between' }, [
              e('span', null, 'Imbalance Ratio'),
              e('span', { className: 'fw-semibold', style: { color: imbalanceRatio > 10 ? 'var(--red-600)' : imbalanceRatio > 3 ? 'var(--amber-600)' : 'var(--green-600)' } }, `${imbalanceRatio.toFixed(2)}:1`),
            ]),
            e('div', { className: 'text-muted small mt-1' }, imbalanceRatio > 10 ? 'Severe imbalance - balancing strongly recommended' : imbalanceRatio > 3 ? 'Moderate imbalance - balancing recommended' : 'Mild imbalance - balancing optional'),
          ]),
        ])
      ),

      e('div', { key: 'target-info', className: 'col-12 col-lg-6' },
        e(Card, { header: 'Target Column Info' }, [
          e('div', { className: 'row g-3' }, [
            e('div', { className: 'col-6' }, [
              e('div', { className: 'text-muted small' }, 'Classes'),
              e('div', { className: 'fw-semibold' }, Object.keys(classDistribution || {}).length),
            ]),
            e('div', { className: 'col-6' }, [
              e('div', { className: 'text-muted small' }, 'Total Samples'),
              e('div', { className: 'fw-semibold' }, Object.values(classDistribution || {}).reduce((a, b) => a + b, 0).toLocaleString()),
            ]),
            e('div', { className: 'col-6' }, [
              e('div', { className: 'text-muted small' }, 'Majority Class'),
              e('div', { className: 'fw-semibold' }, Object.entries(classDistribution || {}).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'),
            ]),
            e('div', { className: 'col-6' }, [
              e('div', { className: 'text-muted small' }, 'Minority Class'),
              e('div', { className: 'fw-semibold' }, Object.entries(classDistribution || {}).sort((a, b) => a[1] - b[1])[0]?.[0] || '—'),
            ]),
          ]),
          e('div', { className: 'mt-3 p-3 bg-tertiary rounded-lg' }, [
            e('h6', { className: 'mb-2' }, '⚠️ Important: Data Leakage Prevention'),
            e('p', { className: 'text-muted small mb-0' }, 'Class balancing (SMOTE, oversampling, undersampling) should ONLY be applied to the TRAINING SET after splitting your data. Applying to the entire dataset before train/test split causes data leakage and inflated performance metrics.'),
          ]),
        ])
      ),
    ]),

    e('div', { key: 'methods', className: 'row g-4' }, [
      e('div', { key: 'method-selector', className: 'col-12 col-lg-4' },
        e(Card, { header: 'Balancing Methods' }, [
          methods.map(method => {
            const disabled = (method.requiresNumeric && !canUseNumeric) || (method.requiresCategorical && !canUseCategorical);
            return e('button', {
              key: method.id,
              className: ['method-option d-flex align-items-start gap-3 p-3 border rounded-lg mb-2 w-100 text-start', selectedMethod === method.id && 'active'].filter(Boolean).join(' '),
              onClick: () => !disabled && setSelectedMethod(method.id),
              disabled,
            }, [
              e('div', { className: ['method-icon', `bg-${method.color}-100 text-${method.color}-600`].join(' ') }, e(Icon, { name: method.icon, size: 20 })),
              e('div', { className: 'flex-1' }, [
                e('div', { className: 'fw-semibold' }, method.label),
                e('div', { className: 'text-muted small' }, method.description),
                method.warning && e('div', { className: 'text-warning small mt-1' }, e(Icon, { name: 'alert', size: 12 }), ' ', method.warning),
              ]),
              selectedMethod === method.id && e(Icon, { name: 'checkCircle', size: 20, className: `text-${method.color}-600` }),
            ]);
          }),
        ])
      ),

      e('div', { key: 'method-config', className: 'col-12 col-lg-8' },
        selectedMethodDef && e(Card, { header: `${selectedMethodDef.label} Configuration` }, [
          e('div', { className: 'row g-3' },
            selectedMethodDef.params.map(param => e('div', { key: param.name, className: `col-12 col-md-${param.type === 'select' ? 6 : 4}` }, [
              e('label', { className: 'form-label' }, param.label),
              param.type === 'select' && e('select', {
                className: 'form-select',
                value: params[param.name] || param.default,
                onChange: e => setParams(prev => ({ ...prev, [param.name]: e.target.value })),
              }, param.options.map(opt => e('option', { key: opt, value: opt }, opt))),
              param.type === 'number' && e('input', {
                type: 'number',
                className: 'form-input',
                value: params[param.name] ?? param.default,
                onChange: e => setParams(prev => ({ ...prev, [param.name]: parseInt(e.target.value) || 0 })),
                min: param.min,
              }),
            ])),
          ),
          selectedMethodDef.warning && e('div', { className: 'alert alert-warning mt-3' }, [
            e(Icon, { name: 'alert', size: 16, className: 'me-2' }),
            e('strong', null, 'Warning: '), selectedMethodDef.warning,
          ]),
          e('div', { className: 'mt-3 d-flex gap-2' }, [
            e(Button, { variant: 'outline', leftIcon: 'eye', onClick: handlePreview, disabled: !isTargetValid }, 'Preview Result'),
            e(Button, { variant: 'primary', leftIcon: 'play', onClick: handleBalance, disabled: !isTargetValid || loading, loading }, 'Apply Balancing'),
          ]),
        ])
      ),
    ]),

    showPreview && previewData && e('div', { key: 'preview', className: 'mt-4' },
      e(Card, { header: 'Preview - Balanced Distribution' }, [
        e('div', { className: 'row g-3' }, [
          e('div', { className: 'col-12 col-md-6' },
            e(Card, { header: 'Before', padding: 'sm' }, [
              e('div', { className: 'd-flex flex-wrap gap-2' },
                Object.entries(classDistribution || {}).map(([cls, count]) => {
                  const pct = (count / Object.values(classDistribution || {}).reduce((a, b) => a + b, 0)) * 100;
                  return e('div', { key: cls, className: 'd-flex align-items-center gap-2 p-2 border rounded', style: { background: 'var(--bg-tertiary)' } }, [
                    e('span', { className: 'fw-semibold' }, String(cls)),
                    e('span', { className: 'text-muted small' }, `${count.toLocaleString()} (${pct.toFixed(1)}%)`),
                  ]);
                })
              ),
            ])
          ),
          e('div', { className: 'col-12 col-md-6' },
            e(Card, { header: 'After', padding: 'sm' }, [
              e('div', { className: 'd-flex flex-wrap gap-2' },
                Object.entries(previewData.class_distribution || {}).map(([cls, count]) => {
                  const pct = (count / Object.values(previewData.class_distribution || {}).reduce((a, b) => a + b, 0)) * 100;
                  return e('div', { key: cls, className: 'd-flex align-items-center gap-2 p-2 border rounded', style: { background: 'var(--bg-tertiary)' } }, [
                    e('span', { className: 'fw-semibold' }, String(cls)),
                    e('span', { className: 'text-muted small' }, `${count.toLocaleString()} (${pct.toFixed(1)}%)`),
                  ]);
                })
              ),
            ])
          ),
        ]),
      ])
    ),
  ]);
};

window.ClassBalancing = ClassBalancing;