// QualityScore component
const e = React.createElement;

const QualityScore = ({ score, grade, description, size = 'lg', showDetails = true, className = '' }) => {
  const getScoreColor = (score) => {
    if (score >= 90) return 'var(--green-500)';
    if (score >= 80) return 'var(--cyan-500)';
    if (score >= 70) return 'var(--amber-500)';
    if (score >= 60) return 'var(--coral-500)';
    return 'var(--red-500)';
  };

  const color = getScoreColor(score);
  const circumference = 2 * Math.PI * 45; // r = 45
  const offset = circumference * (1 - score / 100);

  const sizeStyles = {
    sm: { size: 80, strokeWidth: 6, fontSize: '1.5rem', gradeSize: '1rem' },
    md: { size: 100, strokeWidth: 8, fontSize: '2rem', gradeSize: '1.25rem' },
    lg: { size: 140, strokeWidth: 10, fontSize: '2.5rem', gradeSize: '1.5rem' },
  };

  const s = sizeStyles[size] || sizeStyles.md;

  const gradeColors = {
    A: 'var(--green-600)',
    B: 'var(--cyan-600)',
    C: 'var(--amber-600)',
    D: 'var(--coral-600)',
    F: 'var(--red-600)',
  };

  return e('div', { className: ['quality-score', className].filter(Boolean).join(' ') }, [
    e('div', { key: 'circle', className: 'quality-score-circle', style: { width: s.size, height: s.size } }, [
      e('svg', { viewBox: '0 0 100 100' }, [
        e('defs', { key: 'defs' },
          e('linearGradient', { id: 'qualityGradient', x1: '0%', y1: '0%', x2: '100%', y2: '100%' }, [
            e('stop', { key: 'stop1', offset: '0%', stopColor: color }),
            e('stop', { key: 'stop2', offset: '100%', stopColor: color, stopOpacity: 0.6 }),
          ])
        ),
        e('circle', { 
          key: 'bg', 
          className: 'bg', 
          cx: 50, cy: 50, r: 45,
          strokeWidth: s.strokeWidth,
        }),
        e('circle', { 
          key: 'fg', 
          className: 'fg', 
          cx: 50, cy: 50, r: 45,
          strokeWidth: s.strokeWidth,
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          style: { transition: 'stroke-dashoffset 1s ease-out' },
        }),
      ]),
      e('div', { className: 'quality-score-inner', style: { fontSize: s.fontSize } }, [
        e('span', { className: 'quality-score-value' }, `${score}`),
        e('span', { className: 'quality-score-grade', style: { color: gradeColors[grade] || 'var(--text-primary)', fontSize: s.gradeSize } }, grade),
      ]),
    ]),
    showDetails && e('div', { key: 'info', className: 'quality-score-info' }, [
      e('div', { className: 'quality-score-label' }, 'Data Quality Score'),
      e('div', { className: 'quality-score-description' }, description),
    ]),
  ]);
};

const QualityScoreCompact = ({ score, grade, className = '' }) => {
  const getScoreColor = (score) => {
    if (score >= 90) return 'var(--green-600)';
    if (score >= 80) return 'var(--cyan-600)';
    if (score >= 70) return 'var(--amber-600)';
    if (score >= 60) return 'var(--coral-600)';
    return 'var(--red-600)';
  };

  const color = getScoreColor(score);

  return e('div', { className: ['quality-score-compact d-flex align-items-center gap-2', className].filter(Boolean).join(' ') }, [
    e('div', { 
      className: 'quality-score-bar',
      style: { width: 80, height: 8, background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }
    }, 
      e('div', { 
        className: 'quality-score-fill',
        style: { width: `${score}%`, height: '100%', background: color, borderRadius: 'var(--radius-full)', transition: 'width 1s ease-out' }
      })
    ),
    e('span', { className: 'fw-semibold', style: { color, fontSize: '1.125rem' } }, `${score}`),
    e('span', { 
      className: 'badge', 
      style: { background: `${color}15`, color }
    }, grade),
  ]);
};

window.QualityScore = QualityScore;
window.QualityScoreCompact = QualityScoreCompact;