// Charts component using Chart.js
const e = React.createElement;
const { useRef, useEffect, useState } = React;

const Chart = ({ 
  type = 'bar', 
  data, 
  options = {}, 
  width, 
  height = 300, 
  className = '',
  onClick,
}) => {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!canvasRef.current || !window.Chart) return;
    if (!data || !data.labels || !data.labels.length) {
      setIsReady(true);
      return;
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }

    const defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'var(--navy-900)',
          titleColor: 'white',
          bodyColor: 'white',
          padding: 12,
          cornerRadius: 8,
          displayColors: false,
        },
      },
      interaction: {
        intersect: false,
        mode: 'index',
      },
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
      chartRef.current = new window.Chart(canvasRef.current, {
        type,
        data,
        options: mergedOptions,
      });
      setIsReady(true);
    } catch (err) {
      console.error('Chart.js error:', err);
      setIsReady(true);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [data, type, options]);

  useEffect(() => {
    if (chartRef.current && options) {
      chartRef.current.options = { ...chartRef.current.options, ...options };
      chartRef.current.update();
    }
  }, [options]);

  const handleClick = (event) => {
    if (!onClick || !chartRef.current) return;
    const points = chartRef.current.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);
    if (points.length) {
      onClick(points[0], chartRef.current.data);
    }
  };

  return e('div', { 
    className: ['chart-container', className].filter(Boolean).join(' '),
    style: { height, width: width || '100%' },
    onClick: handleClick,
  }, [
    !isReady && e('div', { className: 'd-flex align-items-center justify-content-center h-100' }, 
      e('div', { className: 'loading-spinner', style: { width: 32, height: 32 } })
    ),
    e('canvas', { ref: canvasRef, style: { display: isReady ? 'block' : 'none' } }),
    !data || !data.labels || !data.labels.length ? e('div', { className: 'd-flex align-items-center justify-content-center h-100 text-muted' }, 'No data available') : null,
  ]);
};

const BarChart = ({ data, labels, title, horizontal = false, color = 'rgba(99, 102, 241, 0.6)', height = 300, className = '' }) => {
  const chartData = {
    labels,
    datasets: [{
      label: title,
      data,
      backgroundColor: color,
      borderRadius: 4,
      borderSkipped: false,
    }],
  };

  const options = {
    indexAxis: horizontal ? 'y' : 'x',
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: 'var(--border-light)' }, border: { display: false }, beginAtZero: true },
    },
  };

  return e(Chart, { type: 'bar', data: chartData, options, height, className });
};

const LineChart = ({ data, labels, title, color = 'rgb(99, 102, 241)', height = 300, className = '', fill = true }) => {
  const chartData = {
    labels,
    datasets: [{
      label: title,
      data,
      borderColor: color,
      backgroundColor: fill ? color.replace('rgb', 'rgba').replace(')', ', 0.1)') : 'transparent',
      fill,
      tension: 0.3,
      pointRadius: 0,
      pointHoverRadius: 6,
      pointBackgroundColor: color,
    }],
  };

  const options = {
    scales: {
      x: { grid: { display: false }, border: { display: false } },
      y: { grid: { color: 'var(--border-light)' }, border: { display: false } },
    },
  };

  return e(Chart, { type: 'line', data: chartData, options, height, className });
};

const AreaChart = ({ data, labels, title, color = 'rgb(99, 102, 241)', height = 300, className = '' }) => {
  return e(LineChart, { data, labels, title, color, height, className, fill: true });
};

const PieChart = ({ data, labels, title, colors, height = 300, className = '' }) => {
  const defaultColors = [
    'rgba(99, 102, 241, 0.8)',
    'rgba(139, 92, 246, 0.8)',
    'rgba(20, 184, 166, 0.8)',
    'rgba(6, 182, 212, 0.8)',
    'rgba(245, 158, 11, 0.8)',
    'rgba(249, 115, 22, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(34, 197, 94, 0.8)',
  ];

  const chartData = {
    labels,
    datasets: [{
      label: title,
      data,
      backgroundColor: colors || defaultColors.slice(0, data.length),
      borderWidth: 2,
      borderColor: 'var(--bg-secondary)',
      hoverOffset: 8,
    }],
  };

  const options = {
    plugins: {
      legend: { 
        display: true, 
        position: 'bottom',
        labels: { padding: 16, usePointStyle: true, pointStyle: 'circle' }
      },
    },
    cutout: '60%',
  };

  return e(Chart, { type: 'doughnut', data: chartData, options, height, className });
};

const DonutChart = ({ data, labels, title, colors, height = 300, className = '' }) => {
  return e(PieChart, { data, labels, title, colors, height, className });
};

const CorrelationHeatmap = ({ matrix, columns, height = 400, className = '' }) => {
  if (!matrix || !columns || columns.length < 2) {
    return e('div', { className: ['chart-container', className].filter(Boolean).join(' '), style: { height } },
      e('p', { className: 'text-center text-muted h-100 d-flex align-items-center justify-content-center' }, 'Not enough numeric columns for correlation')
    );
  }

  return e('div', { className: ['chart-container', className].filter(Boolean).join(' '), style: { height, overflow: 'auto' } },
    e('table', { className: 'table table-sm table-bordered mb-0', style: { fontSize: '0.75rem', minWidth: columns.length * 80 } }, [
      e('thead', null,
        e('tr', null, [
          e('th', { key: '_', style: { position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1 } }, ''),
          columns.map(c => e('th', { key: c, style: { position: 'sticky', top: 0, background: 'var(--bg-tertiary)', minWidth: 70, textAlign: 'center' } }, c)),
        ])
      ),
      e('tbody', null,
        matrix.map((row, i) => e('tr', { key: columns[i] }, [
          e('th', { style: { position: 'sticky', left: 0, background: 'var(--bg-secondary)', zIndex: 1, textAlign: 'center', fontWeight: 600 } }, columns[i]),
          row.map((v, j) => e('td', { 
            key: j, 
            style: { 
              background: v === null || isNaN(v) ? 'var(--bg-tertiary)' : (v >= 0 
                ? `rgba(20, 184, 166, ${0.15 + Math.abs(v) * 0.7})` 
                : `rgba(239, 68, 68, ${0.15 + Math.abs(v) * 0.7})`),
              textAlign: 'center', 
              minWidth: 70,
              fontWeight: 500,
            } 
          }, v === null || isNaN(v) ? '—' : Number(v).toFixed(2)))
        ]))
      ),
    ])
  );
};

const DistributionChart = ({ data, labels, type = 'histogram', bins = 20, height = 300, className = '' }) => {
  // For histogram, we'd need to compute bins from raw data
  // This is a placeholder - in real implementation, compute bins on frontend or backend
  return e(BarChart, { data, labels, title: 'Distribution', color: 'rgba(99, 102, 241, 0.6)', height, className });
};

const ScatterPlot = ({ data, xKey, yKey, colorKey, height = 300, className = '' }) => {
  // data: array of { x, y, color? }
  const chartData = {
    datasets: [{
      label: 'Data Points',
      data: data.map(d => ({ x: d[xKey], y: d[yKey] })),
      backgroundColor: data.map(d => d[colorKey] ? `rgba(${d[colorKey].join(',')}, 0.6)` : 'rgba(99, 102, 241, 0.6)'),
      pointRadius: 4,
      pointHoverRadius: 6,
    }],
  };

  const options = {
    scales: {
      x: { type: 'linear', position: 'bottom', grid: { color: 'var(--border-light)' }, border: { display: false }, title: { display: true, text: xKey } },
      y: { grid: { color: 'var(--border-light)' }, border: { display: false }, title: { display: true, text: yKey } },
    },
  };

  return e(Chart, { type: 'scatter', data: chartData, options, height, className });
};

window.Chart = Chart;
window.BarChart = BarChart;
window.LineChart = LineChart;
window.AreaChart = AreaChart;
window.PieChart = PieChart;
window.DonutChart = DonutChart;
window.CorrelationHeatmap = CorrelationHeatmap;
window.DistributionChart = DistributionChart;
window.ScatterPlot = ScatterPlot;