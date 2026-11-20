// Preprocessing Studio page
const e = React.createElement;
const { useState, useEffect, useMemo } = React;

const PreprocessingStudio = ({ 
  dataset, 
  quality, 
  acceptedIssues, 
  onApplyOperations,
  onPreviewOperation,
  operations,
  loading,
}) => {
  const [selectedOperations, setSelectedOperations] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('recommended');
  const [searchTerm, setSearchTerm] = useState('');

  const issues = quality?.issues || [];
  const recommendedOps = useMemo(() => {
    return Object.entries(acceptedIssues).map(([id, op]) => ({
      id,
      ...op,
      issue: issues.find(i => i.id === id),
    }));
  }, [acceptedIssues, issues]);

  const allOperationTypes = [
    { type: 'drop_column', label: 'Drop Column', category: 'columns', description: 'Remove a column entirely', params: [] },
    { type: 'drop_rows_missing', label: 'Drop Rows with Missing Values', category: 'missing', description: 'Remove rows where selected column has missing values', params: [{ name: 'column', type: 'column', required: true }] },
    { type: 'median_imputation', label: 'Median Imputation', category: 'missing', description: 'Fill missing values with column median (numeric)', params: [] },
    { type: 'mean_imputation', label: 'Mean Imputation', category: 'missing', description: 'Fill missing values with column mean (numeric)', params: [] },
    { type: 'mode_imputation', label: 'Mode Imputation', category: 'missing', description: 'Fill missing values with most frequent value', params: [] },
    { type: 'constant_imputation', label: 'Constant Value Imputation', category: 'missing', description: 'Fill missing values with a specified constant', params: [{ name: 'fill_value', type: 'text', required: true }] },
    { type: 'knn_imputation', label: 'KNN Imputation', category: 'missing', description: 'Fill missing values using K-nearest neighbors', params: [{ name: 'n_neighbors', type: 'number', default: 5 }] },
    { type: 'iterative_imputation', label: 'Iterative Imputation (MICE)', category: 'missing', description: 'Multivariate imputation by chained equations', params: [{ name: 'max_iter', type: 'number', default: 10 }] },
    { type: 'one_hot_encoding', label: 'One-Hot Encoding', category: 'encoding', description: 'Create binary columns for each category', params: [{ name: 'drop_first', type: 'boolean' }, { name: 'max_categories', type: 'number', default: 50 }] },
    { type: 'label_encoding', label: 'Label Encoding', category: 'encoding', description: 'Convert categories to integer labels', params: [] },
    { type: 'ordinal_encoding', label: 'Ordinal Encoding', category: 'encoding', description: 'Encode categories with a defined order', params: [{ name: 'categories', type: 'json' }] },
    { type: 'target_encoding', label: 'Target Encoding', category: 'encoding', description: 'Encode categories with target mean (requires target)', params: [{ name: 'smoothing', type: 'number', default: 1 }] },
    { type: 'frequency_encoding', label: 'Frequency Encoding', category: 'encoding', description: 'Replace categories with their frequency', params: [] },
    { type: 'standardization', label: 'Standardization (Z-score)', category: 'scaling', description: 'Center to mean 0, scale to std 1', params: [] },
    { type: 'normalization', label: 'Min-Max Normalization', category: 'scaling', description: 'Scale to [0, 1] range', params: [] },
    { type: 'robust_scaling', label: 'Robust Scaling', category: 'scaling', description: 'Scale using median and IQR (outlier-resistant)', params: [] },
    { type: 'maxabs_scaling', label: 'MaxAbs Scaling', category: 'scaling', description: 'Scale by maximum absolute value', params: [] },
    { type: 'clip_iqr', label: 'Clip Outliers (IQR)', category: 'outliers', description: 'Cap values at 1.5×IQR boundaries', params: [{ name: 'factor', type: 'number', default: 1.5 }] },
    { type: 'clip_zscore', label: 'Clip Outliers (Z-score)', category: 'outliers', description: 'Cap values at specified Z-score threshold', params: [{ name: 'threshold', type: 'number', default: 3 }] },
    { type: 'remove_outliers', label: 'Remove Outlier Rows', category: 'outliers', description: 'Delete rows containing outliers', params: [{ name: 'method', type: 'select', options: ['iqr', 'zscore'] }, { name: 'factor', type: 'number', default: 1.5 }] },
    { type: 'log_transform', label: 'Log Transformation', category: 'transform', description: 'Apply log(x + shift) transformation', params: [{ name: 'shift', type: 'number', default: 1 }] },
    { type: 'sqrt_transform', label: 'Square Root Transformation', category: 'transform', description: 'Apply sqrt(x + shift) transformation', params: [{ name: 'shift', type: 'number', default: 0 }] },
    { type: 'boxcox_transform', label: 'Box-Cox Transformation', category: 'transform', description: 'Power transform for positive data', params: [] },
    { type: 'yeojohnson_transform', label: 'Yeo-Johnson Transformation', category: 'transform', description: 'Power transform for any numeric data', params: [] },
    { type: 'type_correction', label: 'Correct Data Type', category: 'type', description: 'Convert text columns to numeric', params: [{ name: 'strict', type: 'boolean' }] },
    { type: 'categorical_cleaning', label: 'Clean Categorical Values', category: 'cleaning', description: 'Strip whitespace and normalize case', params: [{ name: 'case', type: 'select', options: ['strip', 'lower', 'upper', 'title'] }] },
    { type: 'group_rare_categories', label: 'Group Rare Categories', category: 'cleaning', description: 'Combine low-frequency categories into "Other"', params: [{ name: 'threshold', type: 'number', default: 0.01 }, { name: 'other_label', type: 'text', default: 'Other' }] },
    { type: 'parse_dates', label: 'Parse Dates', category: 'dates', description: 'Convert text columns to datetime', params: [{ name: 'format', type: 'text' }] },
    { type: 'extract_date_features', label: 'Extract Date Features', category: 'dates', description: 'Create year, month, day, weekday columns', params: [{ name: 'components', type: 'multiselect', options: ['year', 'month', 'day', 'weekday', 'hour', 'quarter', 'is_weekend'] }] },
    { type: 'duplicate_removal', label: 'Remove Duplicate Rows', category: 'duplicates', description: 'Remove exact duplicate rows', params: [{ name: 'keep', type: 'select', options: ['first', 'last'] }] },
    { type: 'clip_lower_zero', label: 'Clip Negative to Zero', category: 'cleaning', description: 'Set negative values to 0 for non-negative columns', params: [] },
    { type: 'polynomial_features', label: 'Polynomial Features', category: 'features', description: 'Generate polynomial and interaction features', params: [{ name: 'degree', type: 'number', default: 2 }, { name: 'interaction_only', type: 'boolean' }] },
    { type: 'binning', label: 'Binning/Discretization', category: 'features', description: 'Convert numeric to categorical bins', params: [{ name: 'n_bins', type: 'number', default: 5 }, { name: 'strategy', type: 'select', options: ['uniform', 'quantile', 'kmeans'] }] },
  ];

  const categories = [...new Set(allOperationTypes.map(op => op.category))];

  const handleAddOperation = (opType) => {
    const opDef = allOperationTypes.find(o => o.type === opType);
    if (!opDef) return;

    const newOp = {
      id: `op_${Date.now()}`,
      type: opType,
      feature: opDef.params.some(p => p.type === 'column') ? '' : null,
      params: opDef.params.reduce((acc, p) => {
        acc[p.name] = p.default || (p.type === 'boolean' ? false : p.type === 'number' ? 0 : '');
        return acc;
      }, {}),
    };
    setSelectedOperations(prev => [...prev, newOp]);
  };

  const handleRemoveOperation = (id) => {
    setSelectedOperations(prev => prev.filter(op => op.id !== id));
  };

  const handleUpdateOperation = (id, updates) => {
    setSelectedOperations(prev => prev.map(op => op.id === id ? { ...op, ...updates } : op));
  };

  const handleApply = async () => {
    const ops = selectedOperations.map(op => ({
      type: op.type,
      feature: op.feature,
      params: op.params,
    }));
    await onApplyOperations(ops);
  };

  const handlePreview = async (op) => {
    setShowPreview(true);
    // In real implementation, call preview API
    // onPreviewOperation(op);
  };

  const getColumnsForType = (type) => {
    if (!dataset) return [];
    const numeric = dataset.column_names?.filter(c => ['number', 'integer', 'float'].includes(dataset.dtypes?.[c] || '')) || [];
    const categorical = dataset.column_names?.filter(c => !['number', 'integer', 'float'].includes(dataset.dtypes?.[c] || '')) || [];
    const all = dataset.column_names || [];
    
    if (['median_imputation', 'mean_imputation', 'standardization', 'normalization', 'robust_scaling', 'maxabs_scaling', 'clip_iqr', 'clip_zscore', 'log_transform', 'sqrt_transform', 'boxcox_transform', 'yeojohnson_transform'].includes(type)) {
      return numeric;
    }
    if (['one_hot_encoding', 'label_encoding', 'ordinal_encoding', 'target_encoding', 'frequency_encoding', 'categorical_cleaning', 'group_rare_categories'].includes(type)) {
      return categorical;
    }
    if (['parse_dates', 'extract_date_features'].includes(type)) {
      return all; // Could be text that parses to dates
    }
    return all;
  };

  if (!dataset) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon', key: 'icon' }, e(Icon, { name: 'preprocessing', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No Dataset Loaded'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Upload a dataset to start preprocessing'),
    ]);
  }

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'Preprocessing Studio'),
        e('p', { className: 'text-muted' }, 'Build and apply preprocessing pipelines'),
      ]),
      e('div', { className: 'd-flex gap-2' }, [
        e(Button, { variant: 'secondary', leftIcon: 'eye', onClick: () => setShowPreview(!showPreview) }, showPreview ? 'Hide Preview' : 'Show Preview'),
        e(Button, { variant: 'primary', leftIcon: 'play', onClick: handleApply, disabled: selectedOperations.length === 0 || loading, loading }, `Apply (${selectedOperations.length})`),
      ]),
    ]),

    e('div', { key: 'main', className: 'row g-4' }, [
      // Left panel - Available Operations
      e('div', { key: 'operations', className: 'col-12 col-lg-4' },
        e(Card, { header: 'Available Operations' }, [
          e('div', { className: 'mb-3' },
            e('input', {
              type: 'search',
              className: 'form-input form-input-sm',
              placeholder: 'Search operations...',
              onChange: e => setSearchTerm(e.target.value),
            })
          ),
          e('div', { className: 'd-flex gap-1 mb-3 flex-wrap' },
            ['all', ...categories].map(cat => e(Button, {
              key: cat,
              variant: activeTab === cat ? 'primary' : 'outline',
              size: 'sm',
              onClick: () => setActiveTab(cat),
            }, cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)))
          ),
          e('div', { style: { maxHeight: 500, overflow: 'auto' } },
            allOperationTypes
              .filter(op => activeTab === 'all' || op.category === activeTab)
              .filter(op => !searchTerm || op.label.toLowerCase().includes(searchTerm.toLowerCase()) || op.description.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(op => e('div', { key: op.type, className: 'operation-item p-3 border rounded-lg mb-2', style: { cursor: 'pointer', background: 'var(--bg-secondary)', transition: 'all var(--transition-fast)' } }, [
                e('div', { className: 'd-flex justify-content-between align-items-start' }, [
                  e('div', null, [
                    e('div', { className: 'fw-semibold' }, op.label),
                    e('div', { className: 'text-muted small' }, op.description),
                  ]),
                  e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => handleAddOperation(op.type) }, e(Icon, { name: 'plus', size: 16 })),
                ]),
              ]))
          ),
        ])
      ),

      // Right panel - Selected Operations & Preview
      e('div', { key: 'pipeline', className: 'col-12 col-lg-8' }, [
        e(Card, { header: e('div', { className: 'd-flex justify-content-between align-items-center' }, [
          e('h3', { className: 'card-title mb-0' }, `Pipeline (${selectedOperations.length} operations)`),
          selectedOperations.length > 0 && e(Button, { variant: 'ghost', size: 'sm', onClick: () => setSelectedOperations([]), leftIcon: 'trash' }, 'Clear All'),
        ]) }, [
          selectedOperations.length === 0 ? e('div', { className: 'empty-state py-5' }, [
            e(Icon, { name: 'layers', size: 48, className: 'text-muted mb-3' }),
            e('h5', null, 'No Operations Added'),
            e('p', { className: 'text-muted' }, 'Select operations from the left panel to build your preprocessing pipeline. Operations will be applied in order.'),
          ]) : e('div', { className: 'pipeline-list' },
            selectedOperations.map((op, index) => {
              const opDef = allOperationTypes.find(o => o.type === op.type);
              const columns = getColumnsForType(op.type);
              
              return e('div', { key: op.id, className: 'pipeline-step d-flex gap-3 p-3 border rounded-lg mb-2', style: { background: 'var(--bg-tertiary)' } }, [
                e('div', { className: 'pipeline-step-number fw-bold text-muted', style: { minWidth: 30 } }, `${index + 1}.`),
                e('div', { className: 'flex-1' }, [
                  e('div', { className: 'd-flex justify-content-between align-items-center mb-2' }, [
                    e('div', { className: 'd-flex align-items-center gap-2' }, [
                      e('span', { className: 'badge badge-primary' }, opDef?.label || op.type),
                      opDef?.category && e('span', { className: 'badge badge-secondary' }, opDef.category),
                    ]),
                    e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => handleRemoveOperation(op.id) }, e(Icon, { name: 'x', size: 14 })),
                  ]),
                  opDef?.params.length > 0 && e('div', { className: 'row g-2' },
                    opDef.params.map(param => e('div', { key: param.name, className: `col-12 col-md-${param.type === 'json' ? 12 : 6}` }, [
                      e('label', { className: 'form-label small' }, param.name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
                      param.type === 'column' && e('select', {
                        className: 'form-select form-select-sm',
                        value: op.params[param.name] || '',
                        onChange: e => handleUpdateOperation(op.id, { params: { ...op.params, [param.name]: e.target.value } }),
                      }, [
                        e('option', { value: '' }, 'Select column...'),
                        columns.map(c => e('option', { key: c, value: c }, c)),
                      ]),
                      param.type === 'select' && e('select', {
                        className: 'form-select form-select-sm',
                        value: op.params[param.name] || param.default || '',
                        onChange: e => handleUpdateOperation(op.id, { params: { ...op.params, [param.name]: e.target.value } }),
                      }, param.options.map(opt => e('option', { key: opt, value: opt }, opt))),
                      param.type === 'multiselect' && e('div', { className: 'dropdown' },
                        e('button', { className: 'btn btn-secondary btn-sm w-100 text-start', onClick: e => e.currentTarget.parentElement.classList.toggle('open') }, [
                          e('span', { className: 'flex-1' }, (op.params[param.name] || []).join(', ') || 'Select...'),
                          e(Icon, { name: 'chevronDown', size: 14 }),
                        ]),
                        e('div', { className: 'dropdown-menu w-100' },
                          param.options.map(opt => e('label', { key: opt, className: 'dropdown-item d-flex align-items-center gap-2' }, [
                            e('input', {
                              type: 'checkbox',
                              className: 'form-check-input',
                              checked: (op.params[param.name] || []).includes(opt),
                              onChange: e => handleUpdateOperation(op.id, {
                                params: {
                                  ...op.params,
                                  [param.name]: e.target.checked
                                    ? [...(op.params[param.name] || []), opt]
                                    : (op.params[param.name] || []).filter(o => o !== opt)
                                }
                              }),
                            }),
                            opt,
                          ]))
                        )
                      ),
                      param.type === 'boolean' && e('div', { className: 'form-check' }, [
                        e('input', {
                          type: 'checkbox',
                          className: 'form-check-input',
                          checked: op.params[param.name],
                          onChange: e => handleUpdateOperation(op.id, { params: { ...op.params, [param.name]: e.target.checked } }),
                        }),
                        e('label', { className: 'form-check-label' }, 'Enabled'),
                      ]),
                      (param.type === 'text' || param.type === 'number') && e('input', {
                        type: param.type,
                        className: 'form-input form-input-sm',
                        value: op.params[param.name] || '',
                        onChange: e => handleUpdateOperation(op.id, { params: { ...op.params, [param.name]: param.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value } }),
                        placeholder: param.default !== undefined ? `Default: ${param.default}` : '',
                      }),
                      param.type === 'json' && e('textarea', {
                        className: 'form-textarea form-textarea-sm',
                        value: JSON.stringify(op.params[param.name] || {}, null, 2),
                        onChange: e => {
                          try {
                            handleUpdateOperation(op.id, { params: { ...op.params, [param.name]: JSON.parse(e.target.value) } });
                          } catch (err) {
                            // Invalid JSON
                          }
                        },
                        placeholder: 'JSON configuration',
                        rows: 3,
                      }),
                    ])),
                  ),
                ]),
              ]);
            })
          ),
        ]),

        showPreview && e(Card, { key: 'preview', header: 'Preview', className: 'mt-4' }, [
          e('div', { className: 'alert alert-info' }, 'Preview shows the effect of the first operation on the first 100 rows.'),
          previewData ? e(Table, {
            data: previewData.preview || [],
            columns: (previewData.columns || []).map(c => ({ key: c, label: c })),
            pageSize: 10,
            pagination: false,
          }) : e('div', { className: 'text-center py-5 text-muted' }, 'Select an operation and click Preview to see the effect'),
        ]),
      ]),
    ]),
  ]);
};

window.PreprocessingStudio = PreprocessingStudio;