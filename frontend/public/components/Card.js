// Card component
const e = React.createElement;

const Card = ({ children, className = '', header, footer, hover = true, padding = 'default', ...props }) => {
  const cardClasses = ['card', hover ? '' : 'no-hover', className].filter(Boolean).join(' ');

  const paddingClasses = {
    none: '',
    default: 'card-body',
    sm: 'card-body p-3',
    lg: 'card-body p-5',
  };

  const bodyPadding = paddingClasses[padding] || paddingClasses.default;

  return e('div', { className: cardClasses, ...props }, [
    header && e('div', { key: 'header', className: 'card-header' },
      typeof header === 'string' ? e('h3', { className: 'card-title' }, header) : header
    ),
    e('div', { key: 'body', className: bodyPadding }, children),
    footer && e('div', { key: 'footer', className: 'card-footer' }, footer),
  ]);
};

const CardHeader = ({ children, className = '', action, title, subtitle }) => {
  return e('div', { className: ['card-header', className].filter(Boolean).join(' ') },
    e('div', { className: 'd-flex align-items-center justify-content-between flex-wrap gap-1' }, [
      e('div', { key: 'title-group', className: 'd-flex align-items-center gap-2' }, [
        typeof title === 'string' && e('h3', { key: 'title', className: 'card-title' }, title),
        subtitle && e('span', { key: 'subtitle', className: 'card-subtitle' }, subtitle),
        typeof children === 'string' && e('h3', { key: 'children-title', className: 'card-title' }, children),
        typeof children !== 'string' && children && e('div', { key: 'children' }, children),
      ]),
      action && e('div', { key: 'action' }, action),
    ])
  );
};

const CardBody = ({ children, className = '', padding = 'default' }) => {
  const paddingClasses = {
    none: '',
    default: 'card-body',
    sm: 'card-body p-3',
    lg: 'card-body p-5',
  };
  return e('div', { className: [paddingClasses[padding] || paddingClasses.default, className].filter(Boolean).join(' ') }, children);
};

const CardFooter = ({ children, className = '' }) => {
  return e('div', { className: ['card-footer', className].filter(Boolean).join(' ') }, children);
};

window.Card = Card;
window.CardHeader = CardHeader;
window.CardBody = CardBody;
window.CardFooter = CardFooter;