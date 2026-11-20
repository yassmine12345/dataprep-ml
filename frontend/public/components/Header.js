// Header component
const e = React.createElement;
const { useState, useRef, useEffect } = React;

const Header = ({ 
  title, 
  subtitle, 
  breadcrumbs = [], 
  actions = [], 
  user = null,
  onSearch,
  searchPlaceholder = 'Search...',
  showSearch = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const searchRef = useRef(null);

  const handleSearch = (e) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const userMenuItems = user ? [
    { label: 'Profile', icon: 'user', onClick: () => {} },
    { label: 'Settings', icon: 'settings', onClick: () => {} },
    { divider: true },
    { label: 'Sign out', icon: 'logOut', variant: 'danger', onClick: () => {} },
  ] : [];

  return e('header', { className: 'header', role: 'banner' }, [
    e('div', { key: 'left', className: 'header-left' }, [
      e(SidebarToggle, { key: 'toggle' }),
      e('div', { key: 'title-group', className: 'd-flex flex-column' }, [
        title && e('h1', { key: 'title', className: 'page-title' }, title),
        (subtitle || breadcrumbs.length > 0) && e('nav', { key: 'breadcrumb', className: 'breadcrumb', 'aria-label': 'Breadcrumb' }, [
          breadcrumbs.map((crumb, i) => e('span', { key: i }, [
            i > 0 && e(Icon, { key: 'sep', name: 'chevronRight', size: 14, className: 'breadcrumb-separator' }),
            crumb.href ? e('a', { key: 'link', href: crumb.href, className: 'text-muted' }, crumb.label) :
            e('span', { key: 'current', className: i === breadcrumbs.length - 1 ? 'breadcrumb-current' : 'text-muted' }, crumb.label),
          ])),
          subtitle && !breadcrumbs.length && e('span', { key: 'subtitle', className: 'breadcrumb-current' }, subtitle),
        ]),
      ]),
    ]),

    e('div', { key: 'right', className: 'header-right' }, [
      showSearch && e('form', { key: 'search', className: 'search-form', onSubmit: handleSearch, style: { position: 'relative' } }, [
        e('input', {
          ref: searchRef,
          type: 'search',
          className: 'form-input',
          placeholder: searchPlaceholder,
          value: searchQuery,
          onChange: e => setSearchQuery(e.target.value),
          style: { width: 280, paddingRight: 40 },
          'aria-label': 'Search',
        }),
        e('button', { type: 'submit', className: 'header-action-btn', style: { position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', width: 32, height: 32 } },
          e(Icon, { name: 'search', size: 18 })
        ),
      ]),

      actions.map((action, i) => e(Button, { 
        key: `action-${i}`, 
        variant: action.variant || 'ghost', 
        size: 'icon',
        onClick: action.onClick,
        disabled: action.disabled,
        'aria-label': action.label,
      }, e(Icon, { name: action.icon, size: 20 }))),

      user && e('div', { key: 'user', className: 'dropdown user-menu' }, [
        e('button', { 
          className: 'user-avatar dropdown-trigger', 
          onClick: e => e.currentTarget.parentElement.classList.toggle('open'),
          'aria-label': 'User menu',
          'aria-expanded': 'false',
        }, user.initials || user.name?.charAt(0).toUpperCase() || 'U'),
        e('div', { className: 'dropdown-menu' }, userMenuItems.map((item, i) => 
          item.divider ? e('div', { key: `divider-${i}`, className: 'dropdown-divider' }) :
          e('button', { 
            key: i, 
            className: `dropdown-item ${item.variant || ''}`,
            onClick: item.onClick,
          }, [
            e(Icon, { name: item.icon, size: 16, className: 'me-2' }),
            item.label,
          ])
        )),
      ]),
    ]),
  ]);
};

window.Header = Header;