// Table component with sorting, pagination, column selection
const e = React.createElement;
const { useState, useMemo, useEffect } = React;

const Table = ({
  data = [],
  columns = [],
  sortable = true,
  pagination = true,
  pageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  searchable = true,
  selectable = false,
  onRowClick,
  onSelectionChange,
  emptyMessage = 'No data available',
  loading = false,
  striped = true,
  hover = true,
  bordered = true,
  compact = false,
  rowKey = 'id',
  renderCell,
  className = '',
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSizeState, setPageSizeState] = useState(pageSize);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(
    columns.filter(c => c.visible !== false).map(c => c.key)
  );

  // Handle search
  const filteredData = useMemo(() => {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const value = row[col.key];
        return value !== null && value !== undefined && String(value).toLowerCase().includes(term);
      })
    );
  }, [data, searchTerm, columns]);

  // Handle sorting
  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortable) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      const comparison = String(aVal).localeCompare(String(bVal), undefined, { numeric: true });
      return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortConfig, sortable]);

  // Pagination
  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSizeState;
    return sortedData.slice(start, start + pageSizeState);
  }, [sortedData, pagination, currentPage, pageSizeState]);

  const totalPages = Math.ceil(sortedData.length / pageSizeState) || 1;

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig.key]);

  const handleSort = (key) => {
    if (!sortable) return;
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleSelectRow = (row) => {
    const key = row[rowKey];
    const newSelected = new Set(selectedRows);
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    setSelectedRows(newSelected);
    onSelectionChange?.(Array.from(newSelected).map(k => data.find(r => r[rowKey] === k)).filter(Boolean));
  };

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set());
      onSelectionChange?.([]);
    } else {
      const newSelected = new Set(paginatedData.map(r => r[rowKey]));
      setSelectedRows(newSelected);
      onSelectionChange?.(paginatedData);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handlePageSizeChange = (size) => {
    setPageSizeState(size);
    setCurrentPage(1);
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const toggleColumn = (key) => {
    setVisibleColumns(prev => prev.includes(key)
      ? prev.filter(k => k !== key)
      : [...prev, key]
    );
  };

  if (loading) {
    return e('div', { className: 'table-container' },
      e('div', { className: 'd-flex align-items-center justify-content-center py-5' },
        e('div', { className: 'loading-spinner', style: { width: 32, height: 32 } })
      )
    );
  }

  const visibleColumnDefs = columns.filter(c => visibleColumns.includes(c.key));

  return e('div', { className: ['table-container', className].filter(Boolean).join(' ') }, [
    searchable && e('div', { key: 'toolbar', className: 'd-flex gap-2 mb-3 flex-wrap' }, [
      e('div', { key: 'search', className: 'flex-1', style: { maxWidth: 300 } },
        e('input', {
          type: 'text',
          className: 'form-input form-input-sm',
          placeholder: 'Search...',
          value: searchTerm,
          onChange: handleSearch,
        })
      ),
      e('div', { key: 'columns', className: 'dropdown' },
        e('button', { className: 'btn btn-secondary btn-sm', onClick: e => e.currentTarget.parentElement.classList.toggle('open') },
          e(Icon, { name: 'grid', size: 16 }), ' Columns'
        ),
        e('div', { className: 'dropdown-menu', style: { minWidth: 200 } },
          columns.map(col => e('label', { key: col.key, className: 'dropdown-item d-flex align-items-center gap-2', style: { padding: '0.5rem 0.75rem' } }, [
            e('input', {
              type: 'checkbox',
              className: 'form-check-input',
              checked: visibleColumns.includes(col.key),
              onChange: () => toggleColumn(col.key),
            }),
            col.label || col.key,
          ]))
        )
      ),
    ]),

    e('div', { className: 'table-responsive' },
      e('table', { className: ['table', striped && 'table-striped', hover && 'table-hover', bordered && 'table-bordered', compact && 'table-compact'].filter(Boolean).join(' ') }, [
        e('thead', null,
          e('tr', null, [
            selectable && e('th', { key: 'select', style: { width: 40 } },
              e('input', {
                type: 'checkbox',
                className: 'form-check-input',
                checked: selectedRows.size === paginatedData.length && paginatedData.length > 0,
                indeterminate: selectedRows.size > 0 && selectedRows.size < paginatedData.length,
                onChange: handleSelectAll,
              })
            ),
            visibleColumnDefs.map(col => e('th', {
              key: col.key,
              style: { width: col.width, cursor: sortable && col.sortable !== false ? 'pointer' : 'default', userSelect: 'none' },
              onClick: () => col.sortable !== false && handleSort(col.key),
            }, [
              col.label || col.key,
              sortable && col.sortable !== false && e(Icon, { name: sortConfig.key === col.key ? (sortConfig.direction === 'asc' ? 'chevronUp' : 'chevronDown') : 'sortAsc', size: 12, className: 'ms-1' }),
            ])),
          ])
        ),
        e('tbody', null,
          paginatedData.length === 0 ? e('tr', null,
            e('td', { colSpan: visibleColumnDefs.length + (selectable ? 1 : 0), className: 'text-center py-5 text-muted' }, emptyMessage)
          ) : paginatedData.map((row, index) => e('tr', {
            key: row[rowKey] || index,
            onClick: () => onRowClick?.(row),
            style: { cursor: onRowClick ? 'pointer' : 'default' },
            className: selectedRows.has(row[rowKey]) ? 'table-active' : '',
          }, [
            selectable && e('td', null,
              e('input', {
                type: 'checkbox',
                className: 'form-check-input',
                checked: selectedRows.has(row[rowKey]),
                onChange: () => handleSelectRow(row),
                onClick: e => e.stopPropagation(),
              })
            ),
            visibleColumnDefs.map(col => e('td', {
              key: col.key,
              style: { whiteSpace: 'nowrap', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' },
            }, renderCell ? renderCell(row[col.key], col, row) : (
              row[col.key] === null || row[col.key] === undefined ? e('span', { className: 'text-muted' }, '—') : String(row[col.key])
            ))),
          ]))
        ),
      ])
    ),

    pagination && totalPages > 1 && e('div', { key: 'pagination', className: 'd-flex align-items-center justify-content-between mt-3 flex-wrap gap-2' }, [
      e('div', { key: 'info', className: 'text-muted small' },
        `Showing ${(currentPage - 1) * pageSizeState + 1} to ${Math.min(currentPage * pageSizeState, sortedData.length)} of ${sortedData.length} rows`
      ),
      e('div', { key: 'page-size', className: 'd-flex align-items-center gap-2' }, [
        e('span', { className: 'text-muted small' }, 'Rows per page:'),
        e('select', {
          className: 'form-select form-select-sm',
          value: pageSizeState,
          onChange: e => handlePageSizeChange(parseInt(e.target.value)),
          style: { width: 'auto', paddingRight: '2rem' },
        }, pageSizeOptions.map(opt => e('option', { key: opt, value: opt }, opt)))
      ]),
      e('div', { key: 'controls', className: 'd-flex gap-1' }, [
        e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => handlePageChange(1), disabled: currentPage === 1, 'aria-label': 'First page' }, e(Icon, { name: 'chevronLeft', size: 16 })),
        e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => handlePageChange(currentPage - 1), disabled: currentPage === 1, 'aria-label': 'Previous page' }, e(Icon, { name: 'chevronLeft', size: 16 })),
        Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
          let pageNum;
          if (totalPages <= 5) pageNum = i + 1;
          else if (currentPage <= 3) pageNum = i + 1;
          else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
          else pageNum = currentPage - 2 + i;
          return e(Button, {
            key: pageNum,
            variant: currentPage === pageNum ? 'primary' : 'ghost',
            size: 'sm',
            onClick: () => handlePageChange(pageNum),
          }, pageNum);
        }),
        e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => handlePageChange(currentPage + 1), disabled: currentPage === totalPages, 'aria-label': 'Next page' }, e(Icon, { name: 'chevronRight', size: 16 })),
        e(Button, { variant: 'ghost', size: 'sm', icon: true, onClick: () => handlePageChange(totalPages), disabled: currentPage === totalPages, 'aria-label': 'Last page' }, e(Icon, { name: 'chevronRight', size: 16 })),
      ]),
    ]),
  ]);
};

window.Table = Table;