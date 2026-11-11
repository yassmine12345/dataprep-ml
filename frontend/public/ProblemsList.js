// ProblemsList component - shows detected anomalies with recommendations
function ProblemsList({ problems, onAccept, onReject, onCustom, acceptedIds }) {
  const [customFor, setCustomFor] = React.useState(null);

  if (!problems || !problems.length) {
    return React.createElement('div', { className: 'alert alert-success' },
      'No data-quality problems detected. The dataset looks clean.'
    );
  }

  const variantFor = (type) => {
    if (type === 'duplicate_rows' || type === 'missing_values' || type === 'outliers') return 'danger';
    if (type === 'inconsistent_categorical' || type === 'incorrect_type') return 'warning';
    if (type === 'constant_column' || type === 'low_cardinality') return 'info';
    return 'info';
  };

  const methodLabel = (m) => {
    const map = {
      drop_column: 'Drop column',
      drop_rows_missing: 'Drop rows with missing values',
      duplicate_removal: 'Remove duplicate rows',
      median_imputation: 'Median imputation',
      mean_imputation: 'Mean imputation',
      mode_imputation: 'Mode imputation',
      standardization: 'Standardization (z-score)',
      normalization: 'Min-Max normalization',
      one_hot_encoding: 'One-Hot Encoding',
      label_encoding: 'Label Encoding',
      clip_iqr: 'Clip outliers (IQR)',
      type_correction: 'Correct data type',
      categorical_cleaning: 'Clean categorical values',
      none: 'No action needed',
    };
    return map[m] || m;
  };

  const keyFor = (p, i) => p.type + ':' + p.feature + ':' + i;

  return React.createElement('div', null,
    problems.map((p, i) => {
      const key = keyFor(p, i);
      const accepted = acceptedIds && acceptedIds[key];
      const isCustom = customFor === key;
      const v = variantFor(p.type);

      return React.createElement('div', {
        key: key,
        className: 'problem-card card mb-2 ' + v,
        style: { borderLeft: '4px solid', opacity: accepted ? 0.7 : 1 }
      },
        React.createElement('div', { className: 'card-body' },
          React.createElement('div', { className: 'd-flex justify-content-between align-items-start' },
            React.createElement('div', null,
              React.createElement('div', null,
                React.createElement('span', { className: 'badge bg-' + v + ' me-2' }, p.type.replace(/_/g, ' ')),
                React.createElement('span', { className: 'fw-semibold' }, p.feature)
              ),
              React.createElement('div', { className: 'mt-1' }, p.description)
            ),
            accepted
              ? React.createElement('span', { className: 'badge bg-success' }, 'Accepted')
              : null
          ),
          React.createElement('div', { className: 'mt-2 small text-muted' },
            React.createElement('span', { className: 'me-3' }, 'Affected: ' + p.count + ' (' + p.percentage + '%)'),
            React.createElement('span', { className: 'fw-semibold text-dark' }, 'Recommended: ' + methodLabel(p.recommendation))
          ),
          !accepted ? React.createElement('div', { className: 'mt-2 d-flex gap-2 flex-wrap' },
            React.createElement('button', { className: 'btn btn-sm btn-success', onClick: () => onAccept(key, p) }, 'Accept'),
            React.createElement('button', { className: 'btn btn-sm btn-outline-secondary', onClick: () => onReject(key, p) }, 'Reject'),
            React.createElement('button', {
              className: 'btn btn-sm btn-outline-primary',
              onClick: () => setCustomFor(isCustom ? null : key)
            }, 'Choose another'),
            isCustom ? React.createElement('select', {
              className: 'form-select form-select-sm',
              style: { minWidth: 180 },
              onChange: (e) => onCustom(key, e.target.value, p),
              defaultValue: ''
            },
              React.createElement('option', { value: '' }, 'Select method...'),
              Object.entries({
                drop_column: 'Drop column',
                drop_rows_missing: 'Drop rows with missing values',
                duplicate_removal: 'Remove duplicate rows',
                median_imputation: 'Median imputation',
                mean_imputation: 'Mean imputation',
                mode_imputation: 'Mode imputation',
                standardization: 'Standardization (z-score)',
                normalization: 'Min-Max normalization',
                one_hot_encoding: 'One-Hot Encoding',
                label_encoding: 'Label Encoding',
                clip_iqr: 'Clip outliers (IQR)',
                type_correction: 'Correct data type',
                categorical_cleaning: 'Clean categorical values',
              }).map(([val, label]) => React.createElement('option', { key: val, value: val }, label))
            ) : null
          ) : null
        )
      );
    })
  );
}

window.ProblemsList = ProblemsList;