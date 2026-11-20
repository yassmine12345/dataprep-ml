// Data Quality Center page
const e = React.createElement;
const { useState, useMemo } = React;

const DataQualityCenter = ({ 
  quality, 
  onAcceptIssue, 
  onRejectIssue, 
  onCustomIssue,
  acceptedIssues,
  loading,
}) => {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedIssue, setExpandedIssue] = useState(null);

  const issues = quality?.issues || [];
  const categories = [...new Set(issues.map(i => i.category))];
  const severities = ['critical', 'high', 'medium', 'low', 'info'];

  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      if (filterSeverity !== 'all' && issue.severity !== filterSeverity) return false;
      if (filterCategory !== 'all' && issue.category !== filterCategory) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        if (!issue.title.toLowerCase().includes(term) &&
            !issue.description.toLowerCase().includes(term) &&
            !issue.columns.some(c => c.toLowerCase().includes(term))) {
          return false;
        }
      }
      return true;
    });
  }, [issues, filterSeverity, filterCategory, searchTerm]);

  const severityCounts = useMemo(() => {
    return severities.reduce((acc, sev) => {
      acc[sev] = issues.filter(i => i.severity === sev).length;
      return acc;
    }, {});
  }, [issues]);

  const categoryCounts = useMemo(() => {
    return categories.reduce((acc, cat) => {
      acc[cat] = issues.filter(i => i.category === cat).length;
      return acc;
    }, {});
  }, [issues]);

  const getSeverityColor = (sev) => {
    const colors = {
      critical: 'var(--red-500)',
      high: 'var(--coral-500)',
      medium: 'var(--amber-500)',
      low: 'var(--cyan-500)',
      info: 'var(--indigo-500)',
    };
    return colors[sev] || 'var(--text-muted)';
  };

  const formatCategory = (cat) => cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

  if (loading) {
    return e('div', { className: 'd-flex align-items-center justify-content-center py-5' },
      e('div', { className: 'loading-spinner', style: { width: 32, height: 32 } })
    );
  }

  if (issues.length === 0) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon bg-green-100 text-green-600', key: 'icon' }, e(Icon, { name: 'checkCircle', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No Issues Detected'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Your dataset appears to be clean! No data quality issues were found.'),
    ]);
  }

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'Data Quality Center'),
        e('p', { className: 'text-muted' }, `${issues.length} issues detected across ${categories.length} categories`),
      ]),
      e('div', { className: 'd-flex gap-2' }, [
        e(Button, { variant: 'outline', leftIcon: 'download', onClick: () => {} }, 'Export Report'),
        e(Button, { variant: 'primary', leftIcon: 'check', onClick: () => {}, disabled: Object.keys(acceptedIssues).length === 0 }, `Accept All (${Object.keys(acceptedIssues).length})`),
      ]),
    ]),

    e('div', { key: 'summary', className: 'row g-3 mb-4' }, [
      e('div', { key: 'total', className: 'col-12 col-md-3' },
        e(Card, { padding: 'sm' }, [
          e('div', { className: 'd-flex align-items-center gap-3' }, [
            e('div', { className: 'bg-navy-100 text-navy-600 p-3 rounded-lg' }, e(Icon, { name: 'alertCircle', size: 24 })),
            e('div', null, [
              e('div', { className: 'stat-card-value' }, issues.length),
              e('div', { className: 'stat-card-label' }, 'Total Issues'),
            ]),
          ]),
        ])
      ),
      ...severities.map(sev => e('div', { key: sev, className: 'col-6 col-md-4 col-xl-2' },
        e(Card, { padding: 'sm' }, [
          e('div', { className: 'd-flex align-items-center gap-2' }, [
            e('div', { className: 'w-8 h-8 rounded-full d-flex align-items-center justify-content-center', style: { background: `${getSeverityColor(sev)}15` } },
              e(Icon, { name: 'circle', size: 12, style: { color: getSeverityColor(sev) } })
            ),
            e('div', null, [
              e('div', { className: 'fw-semibold', style: { color: getSeverityColor(sev) } }, severityCounts[sev] || 0),
              e('div', { className: 'text-muted small' }, sev.charAt(0).toUpperCase() + sev.slice(1)),
            ]),
          ]),
        ])
      )),
    ]),

    e(Card, { key: 'filters', padding: 'sm' }, [
      e('div', { className: 'd-flex flex-wrap gap-3 align-items-center' }, [
        e('div', { className: 'flex-1', style: { minWidth: 200 } },
          e('input', {
            type: 'search',
            className: 'form-input form-input-sm',
            placeholder: 'Search issues...',
            value: searchTerm,
            onChange: e => setSearchTerm(e.target.value),
          })
        ),
        e('div', { className: 'd-flex gap-2' }, [
          e('select', {
            className: 'form-select form-select-sm',
            style: { width: 'auto', minWidth: 140 },
            value: filterSeverity,
            onChange: e => setFilterSeverity(e.target.value),
          }, [
            e('option', { value: 'all' }, 'All Severities'),
            ...severities.map(sev => e('option', { key: sev, value: sev }, `${sev.charAt(0).toUpperCase() + sev.slice(1)} (${severityCounts[sev] || 0})`)),
          ]),
          e('select', {
            className: 'form-select form-select-sm',
            style: { width: 'auto', minWidth: 180 },
            value: filterCategory,
            onChange: e => setFilterCategory(e.target.value),
          }, [
            e('option', { value: 'all' }, 'All Categories'),
            ...categories.map(cat => e('option', { key: cat, value: cat }, `${formatCategory(cat)} (${categoryCounts[cat] || 0})`)),
          ]),
        ]),
        (filterSeverity !== 'all' || filterCategory !== 'all' || searchTerm) && e(Button, { variant: 'ghost', size: 'sm', onClick: () => { setFilterSeverity('all'); setFilterCategory('all'); setSearchTerm(''); } }, e(Icon, { name: 'x', size: 16 }), ' Clear'),
      ]),
    ]),

    e('div', { key: 'issues', className: 'issues-list' },
      filteredIssues.map((issue, index) => {
        const isAccepted = acceptedIssues[issue.id];
        const isExpanded = expandedIssue === issue.id;

        return e('div', {
          key: issue.id,
          className: ['issue-card', isAccepted && 'accepted', `severity-${issue.severity}`].filter(Boolean).join(' '),
        }, [
          e('div', { className: 'issue-header' }, [
            e('div', { className: 'issue-title-group' }, [
              e('span', { 
                className: 'issue-type-badge',
                style: { background: `${getSeverityColor(issue.severity)}15`, color: getSeverityColor(issue.severity) }
              }, formatCategory(issue.category)),
              e('span', { className: 'issue-title' }, issue.title),
            ]),
            e('div', { className: 'issue-severity' }, [
              e('span', { 
                className: 'badge',
                style: { background: `${getSeverityColor(issue.severity)}15`, color: getSeverityColor(issue.severity) }
              }, issue.severity.charAt(0).toUpperCase() + issue.severity.slice(1)),
            ]),
          ]),

          e('div', { className: 'issue-description' }, issue.description),

          e('div', { className: 'issue-meta' }, [
            e('span', { className: 'issue-meta-item' }, [
              e(Icon, { name: 'database', size: 12 }),
              e('span', null, `${issue.affected_count.toLocaleString()} rows (${issue.affected_percentage.toFixed(2)}%)`),
            ]),
            issue.columns.length > 0 && e('span', { className: 'issue-meta-item' }, [
              e(Icon, { name: 'columns', size: 12 }),
              e('span', null, issue.columns.join(', ')),
            ]),
          ]),

          e('div', { className: 'issue-actions' }, [
            isAccepted ? e('span', { className: 'badge badge-success' }, 'Accepted') : e('div', { className: 'd-flex gap-2' }, [
              e(Button, { variant: 'success', size: 'sm', onClick: () => onAcceptIssue(issue.id, issue), leftIcon: 'check' }, 'Accept'),
              e(Button, { variant: 'secondary', size: 'sm', onClick: () => onRejectIssue(issue.id), leftIcon: 'x' }, 'Reject'),
              e(Button, { variant: 'outline', size: 'sm', onClick: () => setExpandedIssue(isExpanded ? null : issue.id), leftIcon: isExpanded ? 'chevronUp' : 'chevronDown' }, isExpanded ? 'Hide Details' : 'Details'),
            ]),
            e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => setExpandedIssue(isExpanded ? null : issue.id), 'aria-label': isExpanded ? 'Collapse' : 'Expand' }, e(Icon, { name: isExpanded ? 'chevronUp' : 'chevronDown', size: 16 })),
          ]),

          isExpanded && e('div', { className: 'issue-details' }, [
            e('div', { className: 'issue-detail-section' }, [
              e('div', { className: 'issue-detail-title' }, 'Explanation'),
              e('div', { className: 'issue-detail-content' }, issue.explanation),
            ]),
            e('div', { className: 'issue-detail-section' }, [
              e('div', { className: 'issue-detail-title' }, 'Recommended Action'),
              e('div', { className: 'issue-detail-content fw-semibold' }, issue.recommendation.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())),
            ]),
            issue.alternative_actions && issue.alternative_actions.length > 0 && e('div', { className: 'issue-detail-section' }, [
              e('div', { className: 'issue-detail-title' }, 'Alternative Actions'),
              e('div', { className: 'd-flex flex-wrap gap-2 mt-2' },
                issue.alternative_actions.map((action, i) => e(Button, {
                  key: i,
                  variant: 'outline',
                  size: 'sm',
                  onClick: () => onCustomIssue(issue.id, action.action, issue),
                }, action.label))
              ),
            ]),
            issue.expected_impact && e('div', { className: 'issue-detail-section' }, [
              e('div', { className: 'issue-detail-title' }, 'Expected Impact'),
              e('div', { className: 'issue-detail-content' }, issue.expected_impact),
            ]),
            issue.example_values && issue.example_values.length > 0 && e('div', { className: 'issue-detail-section' }, [
              e('div', { className: 'issue-detail-title' }, 'Example Values'),
              e('div', { className: 'issue-example-values' },
                issue.example_values.slice(0, 10).map((val, i) => e('span', { key: i, className: 'issue-example-tag' }, String(val)))
              ),
            ]),
            issue.details && Object.keys(issue.details).length > 0 && e('div', { className: 'issue-detail-section' }, [
              e('div', { className: 'issue-detail-title' }, 'Additional Details'),
              e('pre', { className: 'bg-tertiary p-3 rounded small overflow-auto', style: { fontSize: '0.75rem' } }, JSON.stringify(issue.details, null, 2)),
            ]),
          ]),
        ]);
      })
    ),

    filteredIssues.length === 0 && issues.length > 0 && e('div', { key: 'no-results', className: 'text-center py-5 text-muted' }, [
      e(Icon, { name: 'search', size: 48, className: 'mb-3' }),
      e('h5', null, 'No issues match your filters'),
      e('p', null, 'Try adjusting your search or filter criteria'),
    ]),
  ]);
};

window.DataQualityCenter = DataQualityCenter;