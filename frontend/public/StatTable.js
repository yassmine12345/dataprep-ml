// StatTable component - renders a statistics table
function StatTable({ stats }) {
  if (!stats || !stats.length) {
    return React.createElement('p', { className: 'text-muted' }, 'No statistics available.');
  }
  const cols = Object.keys(stats[0]);
  return React.createElement('div', { style: { overflow: 'auto', maxHeight: 400 } },
    React.createElement('table', { className: 'table table-sm table-hover mb-0' },
      React.createElement('thead', null,
        React.createElement('tr', null,
          cols.map(c => React.createElement('th', { key: c }, c))
        )
      ),
      React.createElement('tbody', null,
        stats.map((r, i) => React.createElement('tr', { key: i },
          cols.map(c => {
            const v = r[c];
            let text = '';
            if (v === null || v === undefined) text = '';
            else if (typeof v === 'number') text = v.toLocaleString(undefined, { maximumFractionDigits: 4 });
            else text = String(v);
            return React.createElement('td', { key: c, style: { whiteSpace: 'nowrap' } }, text);
          })
        ))
      )
    )
  );
}

window.StatTable = StatTable;