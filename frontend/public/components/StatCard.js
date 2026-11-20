// StatCard component
const e = React.createElement;

const StatCard = ({ 
  value, 
  label, 
  trend, 
  trendLabel, 
  icon, 
  iconColor = 'primary', 
  className = '',
  onClick,
}) => {
  const iconColors = {
    primary: 'bg-indigo-100 text-indigo-600',
    success: 'bg-green-100 text-green-600',
    warning: 'bg-amber-100 text-amber-600',
    danger: 'bg-red-100 text-red-600',
    info: 'bg-cyan-100 text-cyan-600',
    violet: 'bg-violet-100 text-violet-600',
    teal: 'bg-teal-100 text-teal-600',
  };

  const trendClass = trend ? 
    (trend > 0 ? 'positive' : trend < 0 ? 'negative' : 'neutral') : '';

  return e('div', { 
    className: ['stat-card', className].filter(Boolean).join(' '),
    onClick: onClick,
    style: { cursor: onClick ? 'pointer' : 'default' },
  }, [
    icon && e('div', { key: 'icon', className: ['stat-card-icon', iconColors[iconColor] || iconColors.primary].join(' ') },
      e(Icon, { name: icon, size: 24 })
    ),
    e('div', { key: 'value', className: 'stat-card-value' }, value),
    e('div', { key: 'label', className: 'stat-card-label' }, label),
    trend !== undefined && e('div', { key: 'trend', className: ['stat-card-trend', trendClass].filter(Boolean).join(' ') }, [
      e(Icon, { name: trend > 0 ? 'chevronUp' : trend < 0 ? 'chevronDown' : 'minus', size: 12 }),
      e('span', null, trendLabel || (trend > 0 ? `+${trend}%` : trend < 0 ? `${trend}%` : 'No change')),
    ]),
  ]);
};

const StatCardGrid = ({ stats, columns = 4, gap = 1 }) => {
  return e('div', {
    className: 'stats-grid',
    style: {
      gridTemplateColumns: `repeat(auto-fit, minmax(200px, 1fr))`,
      gap: `${gap}rem`,
    }
  }, stats.map((stat, i) => e(StatCard, { key: i, ...stat })));
};

window.StatCard = StatCard;
window.StatCardGrid = StatCardGrid;