// Data Advisor page
const e = React.createElement;
const { useState, useEffect } = React;

const DataAdvisor = ({ 
  advisor, 
  dataset,
  onAction,
  loading,
}) => {
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [expandedSuggestion, setExpandedSuggestion] = useState(null);

  const suggestions = advisor?.suggestions || [];
  const categories = [...new Set(suggestions.map(s => s.category))];
  const priorities = ['critical', 'high', 'medium', 'low'];

  const filteredSuggestions = suggestions.filter(s => {
    if (filterPriority !== 'all' && s.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && s.category !== filterCategory) return false;
    return true;
  });

  const priorityCounts = priorities.reduce((acc, p) => {
    acc[p] = suggestions.filter(s => s.priority === p).length;
    return acc;
  }, {});

  const categoryCounts = categories.reduce((acc, c) => {
    acc[c] = suggestions.filter(s => s.category === c).length;
    return acc;
  }, {});

  const getPriorityColor = (p) => {
    const colors = {
      critical: 'var(--red-500)',
      high: 'var(--coral-500)',
      medium: 'var(--amber-500)',
      low: 'var(--cyan-500)',
    };
    return colors[p] || 'var(--text-muted)';
  };

  const getCategoryIcon = (cat) => {
    const icons = {
      missing_values: 'alertCircle',
      identifier: 'key',
      constant_columns: 'minusCircle',
      class_imbalance: 'balance',
      scaling: 'maximize',
      encoding: 'code',
      date_features: 'calendar',
      outliers: 'trendingUp',
    };
    return icons[cat] || 'info';
  };

  if (!dataset) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon', key: 'icon' }, e(Icon, { name: 'advisor', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No Dataset Loaded'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Upload a dataset to get smart recommendations'),
    ]);
  }

  if (suggestions.length === 0) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon bg-green-100 text-green-600', key: 'icon' }, e(Icon, { name: 'checkCircle', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'All Clear!'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'No immediate recommendations. Your dataset looks good for modeling!'),
    ]);
  }

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'Data Advisor'),
        e('p', { className: 'text-muted' }, `${suggestions.length} recommendations based on your dataset`),
      ]),
      e(Button, { variant: 'primary', leftIcon: 'refresh', onClick: () => {}, disabled: loading }, 'Refresh Analysis'),
    ]),

    e('div', { key: 'priority-summary', className: 'row g-3 mb-4' },
      priorities.map(p => e('div', { key: p, className: 'col-6 col-md-3' },
        e(Card, { padding: 'sm' }, [
          e('div', { className: 'd-flex align-items-center gap-2' }, [
            e('div', { className: 'w-8 h-8 rounded-full d-flex align-items-center justify-content-center', style: { background: `${getPriorityColor(p)}15` } },
              e(Icon, { name: 'circle', size: 12, style: { color: getPriorityColor(p) } })
            ),
            e('div', null, [
              e('div', { className: 'fw-semibold', style: { color: getPriorityColor(p) } }, priorityCounts[p] || 0),
              e('div', { className: 'text-muted small' }, p.charAt(0).toUpperCase() + p.slice(1) + ' Priority'),
            ]),
          ]),
        ])
      ))
    ),

    e(Card, { key: 'filters', padding: 'sm' }, [
      e('div', { className: 'd-flex flex-wrap gap-3 align-items-center' }, [
        e('select', {
          className: 'form-select form-select-sm',
          style: { width: 'auto', minWidth: 160 },
          value: filterPriority,
          onChange: e => setFilterPriority(e.target.value),
        }, [
          e('option', { value: 'all' }, 'All Priorities'),
          ...priorities.map(p => e('option', { key: p, value: p }, `${p.charAt(0).toUpperCase() + p.slice(1)} (${priorityCounts[p] || 0})`)),
        ]),
        e('select', {
          className: 'form-select form-select-sm',
          style: { width: 'auto', minWidth: 200 },
          value: filterCategory,
          onChange: e => setFilterCategory(e.target.value),
        }, [
          e('option', { value: 'all' }, 'All Categories'),
          ...categories.map(c => e('option', { key: c, value: c }, `${c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${categoryCounts[c] || 0})`)),
        ]),
        (filterPriority !== 'all' || filterCategory !== 'all') && e(Button, { variant: 'ghost', size: 'sm', onClick: () => { setFilterPriority('all'); setFilterCategory('all'); } }, e(Icon, { name: 'x', size: 16 }), ' Clear'),
      ]),
    ]),

    e('div', { key: 'suggestions', className: 'mt-4' },
      filteredSuggestions.map((suggestion, index) => {
        const isExpanded = expandedSuggestion === suggestion.id;
        const color = getPriorityColor(suggestion.priority);
        const icon = getCategoryIcon(suggestion.category);

        return e('div', { key: suggestion.id, className: 'suggestion-card card mb-3', style: { borderLeft: `4px solid ${color}` } }, [
          e('div', { className: 'card-body' }, [
            e('div', { className: 'd-flex justify-content-between align-items-start mb-2' }, [
              e('div', { className: 'd-flex align-items-center gap-2' }, [
                e('div', { className: ['suggestion-icon', `bg-${suggestion.priority === 'critical' ? 'red' : suggestion.priority === 'high' ? 'coral' : suggestion.priority === 'medium' ? 'amber' : 'cyan'}-100 text-${suggestion.priority === 'critical' ? 'red' : suggestion.priority === 'high' ? 'coral' : suggestion.priority === 'medium' ? 'amber' : 'cyan'}-600`].join(' ') }, e(Icon, { name: icon, size: 20 })),
                e('div', null, [
                  e('h5', { className: 'mb-1' }, suggestion.title),
                  e('span', { className: ['badge', `bg-${suggestion.priority === 'critical' ? 'red' : suggestion.priority === 'high' ? 'coral' : suggestion.priority === 'medium' ? 'amber' : 'cyan'}-100 text-${suggestion.priority === 'critical' ? 'red' : suggestion.priority === 'high' ? 'coral' : suggestion.priority === 'medium' ? 'amber' : 'cyan'}-600`].join(' ') }, suggestion.priority.charAt(0).toUpperCase() + suggestion.priority.slice(1)),
                ]),
              ]),
            ]),
            e('button', { className: 'btn btn-sm btn-ghost', onClick: () => setExpandedSuggestion(isExpanded ? null : suggestion.id) }, isExpanded ? e(Icon, { name: 'chevronUp', size: 16 }) : e(Icon, { name: 'chevronDown', size: 16 })),
          ]),
          e('p', { className: 'text-secondary mb-3' }, suggestion.description),
          e('div', { className: 'd-flex flex-wrap gap-2' }, [
            e(Button, { variant: 'primary', size: 'sm', leftIcon: 'play', onClick: () => onAction?.(suggestion.action, suggestion.columns, suggestion.details) }, 'Apply Recommendation'),
            e(Button, { variant: 'outline', size: 'sm', onClick: () => setExpandedSuggestion(isExpanded ? null : suggestion.id) }, isExpanded ? 'Hide Details' : 'Show Details'),
          ]),
          isExpanded && e('div', { className: 'mt-3 pt-3 border-top' }, [
            e('div', { className: 'row g-3' }, [
              e('div', { className: 'col-12 col-md-6' }, [
                e('h6', { className: 'text-muted small mb-1' }, 'Why This Matters'),
                e('p', { className: 'mb-0 small' }, suggestion.details?.why_it_matters || suggestion.description),
              ]),
              e('div', { className: 'col-12 col-md-6' }, [
                e('h6', { className: 'text-muted small mb-1' }, 'Suggested Action'),
                e('p', { className: 'mb-0 small' }, suggestion.action?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
              ]),
              suggestion.columns && suggestion.columns.length > 0 && e('div', { className: 'col-12' }, [
                e('h6', { className: 'text-muted small mb-1' }, 'Affected Columns'),
                e('div', { className: 'd-flex flex-wrap gap-1' },
                  suggestion.columns.map(col => e('span', { key: col, className: 'badge badge-secondary' }, col))
                ),
              ]),
              suggestion.details && Object.keys(suggestion.details).length > 0 && e('div', { className: 'col-12' }, [
                e('h6', { className: 'text-muted small mb-1' }, 'Details'),
                e('pre', { className: 'bg-tertiary p-3 rounded small overflow-auto', style: { fontSize: '0.75rem', maxHeight: 200 } }, JSON.stringify(suggestion.details, null, 2)),
              ]),
            ]),
          ]),
        ]);
      })
    ),

    filteredSuggestions.length === 0 && suggestions.length > 0 && e('div', { key: 'no-results', className: 'text-center py-5 text-muted' }, [
      e(Icon, { name: 'filter', size: 48, className: 'mb-3' }),
      e('h5', null, 'No recommendations match your filters'),
      e('p', null, 'Try adjusting your filter criteria'),
    ]),
  ]);
};

window.DataAdvisor = DataAdvisor;