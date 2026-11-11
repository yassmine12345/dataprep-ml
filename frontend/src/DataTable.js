// DataTable component

function DataTable({ rows, columns, maxHeight }) {
  const cols = columns || (rows && rows.length ? Object.keys(rows[0]) : []);
  if (!rows || !rows.length) {
    return React.createElement('p', { className: 'text-muted' }, 'No data available.');
  }
  const handleExport = () => {
    const csv = window.csvFromRows(rows, cols);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'data.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return React.createElement('div', null,
    React.createElement('div', { className: 'd-flex justify-content-between align-items-center mb-2' },
      React.createElement('span', { className: 'text-muted small' }, rows.length + ' rows'),
      React.createElement('button', { className: 'btn btn-sm btn-outline-primary', onClick: handleExport }, 'Export CSV')
    ),
    React.createElement('div', { style: { maxHeight: maxHeight || 360, overflow: 'auto', border: '1px solid #e9ecef', borderRadius: 8 } },
      React.createElement('table', { className: 'table table-sm table-hover mb-0' },
        React.createElement('thead', { style: { position: 'sticky', top: 0, background: '#f1f3f7', zIndex: 1 } },
          React.createElement('tr', null,
            cols.map(c => React.createElement('th', { key: c, style: { whiteSpace: 'nowrap' } }, c))
          )
        ),
        React.createElement('tbody', null,
          rows.map((r, i) => React.createElement('tr', { key: i },
            cols.map(c => {
              const v = r[c];
              const text = v === null || v === undefined ? '' : String(v);
              return React.createElement('td', { key: c, style: { whiteSpace: 'nowrap', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' } }, text);
            })
          ))
        )
      )
    )
  );
}

window.DataTable = DataTable;