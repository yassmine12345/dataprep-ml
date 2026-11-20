// Dataset Explorer page
const e = React.createElement;
const { useState, useEffect, useCallback } = React;

const DatasetExplorer = ({ 
  dataset, 
  explorerData, 
  onExplore, 
  onExport,
  loading,
}) => {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortBy, setSortBy] = useState(null);
  const [sortDesc, setSortDesc] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [filterCol, setFilterCol] = useState('');
  const [filterVal, setFilterVal] = useState('');
  const [showColumnPicker, setShowColumnPicker] = useState(false);
  const [profilingData, setProfilingData] = useState({});

  const allColumns = dataset?.column_names || [];
  const availableColumns = allColumns;

  useEffect(() => {
    if (dataset) {
      fetchExplorerData();
    }
  }, [dataset, page, pageSize, sortBy, sortDesc, filterCol, filterVal, selectedColumns]);

  const fetchExplorerData = async () => {
    if (!dataset) return;
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      if (selectedColumns.length) params.append('columns', selectedColumns.join(','));
      if (sortBy) params.append('sort_by', sortBy);
      if (sortDesc) params.append('sort_desc', 'true');
      if (filterCol && filterVal) {
        params.append('filter_col', filterCol);
        params.append('filter_val', filterVal);
      }

      const res = await fetch(`/api/v1/dataset/${dataset.dataset_id}/explorer?${params}`);
      if (res.ok) {
        const data = await res.json();
        setProfilingData(data.profiling || {});
        // The data will be passed via props in the real implementation
      }
    } catch (err) {
      console.error('Explorer fetch error:', err);
    }
  };

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortBy(col);
      setSortDesc(false);
    }
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setPage(1);
  };

  const handleExport = (format = 'csv') => {
    onExport?.(format);
  };

  const toggleColumn = (col) => {
    setSelectedColumns(prev => prev.includes(col)
      ? prev.filter(c => c !== col)
      : [...prev, col]
    );
  };

  if (!dataset) {
    return e('div', { className: 'd-flex flex-column align-items-center justify-content-center', style: { minHeight: '50vh' } }, [
      e('div', { className: 'empty-state-icon', key: 'icon' }, e(Icon, { name: 'spreadsheet', size: 48 })),
      e('h3', { className: 'empty-state-title', key: 'title' }, 'No Dataset Loaded'),
      e('p', { className: 'empty-state-description', key: 'desc' }, 'Upload a dataset to explore its contents'),
    ]);
  }

  // Use passed explorerData or fallback to mock for now
  const data = explorerData?.data || [];
  const totalRows = explorerData?.total_rows || 0;
  const totalPages = explorerData?.total_pages || 1;
  const columns = explorerData?.columns || allColumns;

  return e('div', null, [
    e('div', { key: 'header', className: 'd-flex justify-content-between align-items-center mb-4 flex-wrap gap-2' }, [
      e('div', null, [
        e('h1', { className: 'mb-1' }, 'Dataset Explorer'),
        e('p', { className: 'text-muted' }, `${dataset.filename} — ${totalRows.toLocaleString()} rows × ${columns.length} columns`),
      ]),
      e('div', { className: 'd-flex gap-2' }, [
        e(Button, { variant: 'outline', leftIcon: 'download', onClick: () => handleExport('csv') }, 'Export CSV'),
        e(Button, { variant: 'outline', leftIcon: 'file', onClick: () => handleExport('excel') }, 'Export Excel'),
      ]),
    ]),

    e(Card, { key: 'toolbar', padding: 'sm' }, [
      e('div', { className: 'd-flex flex-wrap gap-3 align-items-center' }, [
        e('div', { className: 'flex-1', style: { minWidth: 200 } },
          e('select', {
            className: 'form-select form-select-sm',
            value: selectedColumns.length === 0 ? 'all' : 'custom',
            onChange: (e) => {
              if (e.target.value === 'all') setSelectedColumns([]);
              else setShowColumnPicker(true);
            },
          }, [
            e('option', { value: 'all' }, `All Columns (${allColumns.length})`),
            e('option', { value: 'custom' }, 'Select Columns...'),
          ])
        ),
        selectedColumns.length > 0 && e('div', { className: 'd-flex align-items-center gap-1 text-muted small' }, [
          e(Icon, { name: 'filter', size: 14 }),
          e('span', null, `${selectedColumns.length} columns selected`),
          e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => setSelectedColumns([]) }, e(Icon, { name: 'x', size: 14 })),
        ]),
        e('div', { className: 'dropdown' },
          e('button', { className: 'btn btn-secondary btn-sm', onClick: e => e.currentTarget.parentElement.classList.toggle('open') },
            e(Icon, { name: 'grid', size: 16 }), ' Columns'
          ),
          e('div', { className: 'dropdown-menu', style: { minWidth: 200, maxHeight: 300, overflow: 'auto' } },
            availableColumns.map(col => {
              const profiling = profilingData[col] || {};
              return e('label', { key: col, className: 'dropdown-item d-flex align-items-center gap-2', style: { padding: '0.5rem 0.75rem' } }, [
                e('input', {
                  type: 'checkbox',
                  className: 'form-check-input',
                  checked: selectedColumns.length === 0 || selectedColumns.includes(col),
                  onChange: () => toggleColumn(col),
                }),
                e('span', { className: 'flex-1 text-start' }, col),
                e('span', { className: 'badge badge-secondary' }, profiling.type || '—'),
              ]);
            }),
          )
        ),
        e('div', { className: 'flex-1', style: { minWidth: 200 } },
          e('input', {
            type: 'text',
            className: 'form-input form-input-sm',
            placeholder: 'Filter column...',
            value: filterCol,
            onChange: e => setFilterCol(e.target.value),
            list: 'filter-columns',
          })
        ),
        e('datalist', { id: 'filter-columns' }, availableColumns.map(c => e('option', { key: c, value: c }))),
        filterCol && e('div', { className: 'flex-1', style: { minWidth: 150 } },
          e('input', {
            type: 'text',
            className: 'form-input form-input-sm',
            placeholder: 'Filter value...',
            value: filterVal,
            onChange: e => setFilterVal(e.target.value),
          })
        ),
        filterCol && e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => { setFilterCol(''); setFilterVal(''); } }, e(Icon, { name: 'x', size: 16 })),
      ]),
    ]),

    e(Card, { key: 'table' }, [
      e(Table, {
        data,
        columns: columns.map(c => ({
          key: c,
          label: c,
          sortable: true,
        })),
        pageSize: pageSize,
        pagination: true,
        sortable: true,
        onRowClick: (row) => console.log('Row clicked:', row),
      }),
    ]),

    profilingData && Object.keys(profilingData).length > 0 && e('div', { key: 'profiling', className: 'mt-4' },
      e(Card, { header: 'Column Profiling' }, [
        e('div', { className: 'row g-3' },
          Object.entries(profilingData).map(([col, profile]) => e('div', { key: col, className: 'col-12 col-md-6 col-lg-4' }, [
            e('div', { className: 'card p-3 h-100' }, [
              e('div', { className: 'd-flex justify-content-between align-items-start mb-2' }, [
                e('h6', { className: 'mb-0' }, col),
                e('span', { className: ['badge', profile.type === 'numeric' ? 'badge-primary' : 'badge-secondary'].join(' ') }, profile.type || '—'),
              ]),
              e('div', { className: 'row g-2 text-muted small' }, [
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'fw-semibold' }, profile.count?.toLocaleString() || '—'),
                  e('div', null, 'Non-null'),
                ]),
                e('div', { className: 'col-6' }, [
                  e('div', { className: 'fw-semibold' }, profile.missing?.toLocaleString() || '0'),
                  e('div', null, 'Missing'),
                ]),
                profile.type === 'numeric' ? [
                  e('div', { className: 'col-6' }, [
                    e('div', { className: 'fw-semibold' }, profile.mean !== null && profile.mean !== undefined ? profile.mean.toFixed(2) : '—'),
                    e('div', null, 'Mean'),
                  ]),
                  e('div', { className: 'col-6' }, [
                    e('div', { className: 'fw-semibold' }, profile.std !== null && profile.std !== undefined ? profile.std.toFixed(2) : '—'),
                    e('div', null, 'Std Dev'),
                  ]),
                  e('div', { className: 'col-6' }, [
                    e('div', { className: 'fw-semibold' }, profile.min !== null && profile.min !== undefined ? profile.min.toFixed(2) : '—'),
                    e('div', null, 'Min'),
                  ]),
                  e('div', { className: 'col-6' }, [
                    e('div', { className: 'fw-semibold' }, profile.max !== null && profile.max !== undefined ? profile.max.toFixed(2) : '—'),
                    e('div', null, 'Max'),
                  ]),
                ] : [
                  e('div', { className: 'col-6' }, [
                    e('div', { className: 'fw-semibold' }, profile.unique?.toLocaleString() || '—'),
                    e('div', null, 'Unique'),
                  ]),
                  e('div', { className: 'col-6' }, [
                    e('div', { className: 'fw-semibold' }, profile.top_values ? Object.keys(profile.top_values).length : '—'),
                    e('div', null, 'Top Values'),
                  ]),
                ],
              ]),
            ]),
          ]))
        ),
      ])
    ),
  ]);
};

window.DatasetExplorer = DatasetExplorer;