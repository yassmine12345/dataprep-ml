// Sidebar component
const e = React.createElement;
const { useState, useContext, createContext } = React;

const SidebarContext = createContext();

const SidebarProvider = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  
  return e(SidebarContext.Provider, { value: { collapsed, setCollapsed, mobileOpen, setMobileOpen } }, children);
};

const useSidebar = () => useContext(SidebarContext);

const navItems = [
  { section: 'Main', items: [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', badge: null },
    { key: 'explorer', label: 'Dataset Explorer', icon: 'spreadsheet', badge: null },
  ]},
  { section: 'Analysis', items: [
    { key: 'quality', label: 'Data Quality Center', icon: 'quality', badge: null },
    { key: 'advisor', label: 'Data Advisor', icon: 'advisor', badge: null },
  ]},
  { section: 'Processing', items: [
    { key: 'preprocessing', label: 'Preprocessing Studio', icon: 'preprocessing', badge: null },
    { key: 'balancing', label: 'Class Balancing', icon: 'balance', badge: null },
  ]},
  { section: 'Results', items: [
    { key: 'comparison', label: 'Before & After', icon: 'compare', badge: null },
    { key: 'history', label: 'History & Undo', icon: 'history', badge: null },
    { key: 'export', label: 'Export & Reports', icon: 'export', badge: null },
  ]},
];

const Sidebar = ({ activePage, onNavigate, className = '' }) => {
  const { collapsed, setCollapsed, mobileOpen, setMobileOpen } = useSidebar();

  const handleToggle = () => setCollapsed(!collapsed);

  return e('aside', { 
    className: ['sidebar', collapsed && 'collapsed', mobileOpen && 'open', className].filter(Boolean).join(' '),
    role: 'navigation',
    'aria-label': 'Main navigation',
  }, [
    e('div', { key: 'header', className: 'sidebar-header' }, [
      e('div', { key: 'logo', className: 'sidebar-logo' }, [
        e('div', { key: 'icon', className: 'sidebar-logo-icon' }, e(Icon, { name: 'database', size: 20 })),
        e('span', { key: 'text', className: 'sidebar-logo-text' }, 'DataPrep Pro'),
      ]),
      !collapsed && e('button', {
        key: 'toggle',
        className: 'sidebar-toggle-btn',
        onClick: handleToggle,
        'aria-label': collapsed ? 'Expand sidebar' : 'Collapse sidebar',
        'aria-expanded': !collapsed,
      }, e(Icon, { name: collapsed ? 'chevronRight' : 'chevronLeft', size: 18 })),
    ]),

    e('nav', { key: 'nav', className: 'sidebar-nav', 'aria-label': 'Main menu' }, 
      navItems.map((section, sectionIndex) => e('div', { key: `section-${sectionIndex}`, className: 'nav-section' }, [
        !collapsed && e('div', { key: 'title', className: 'nav-section-title' }, section.section),
        section.items.map((item, itemIndex) => e('button', {
          key: `item-${sectionIndex}-${itemIndex}`,
          className: ['nav-item', activePage === item.key && 'active'].filter(Boolean).join(' '),
          onClick: () => onNavigate(item.key),
          'aria-current': activePage === item.key ? 'page' : undefined,
        }, [
          e('span', { key: 'icon', className: 'nav-item-icon' }, e(Icon, { name: item.icon, size: 20 })),
          !collapsed && e('span', { key: 'text', className: 'nav-item-text' }, item.label),
          !collapsed && item.badge && e('span', { key: 'badge', className: 'nav-item-badge' }, item.badge),
        ])),
      ]))
    ),

    e('div', { key: 'footer', className: 'sidebar-footer' }, [
      !collapsed && e('button', { 
        className: 'sidebar-toggle', 
        onClick: handleToggle,
        'aria-label': collapsed ? 'Expand sidebar' : 'Collapse sidebar',
      }, [
        e(Icon, { name: collapsed ? 'chevronRight' : 'chevronLeft', size: 18 }),
        e('span', { className: 'sidebar-toggle-text' }, collapsed ? 'Expand' : 'Collapse'),
      ]),
      collapsed && e('button', { 
        className: 'sidebar-toggle', 
        onClick: handleToggle,
        'aria-label': 'Expand sidebar',
      }, e(Icon, { name: 'chevronRight', size: 18 })),
    ]),
  ]);
};

const SidebarToggle = () => {
  const { mobileOpen, setMobileOpen } = useSidebar();
  return e('button', {
    className: 'header-action-btn',
    onClick: () => setMobileOpen(!mobileOpen),
    'aria-label': 'Toggle menu',
    'aria-expanded': mobileOpen,
  }, e(Icon, { name: 'menu', size: 20 }));
};

window.Sidebar = Sidebar;
window.SidebarProvider = SidebarProvider;
window.SidebarToggle = SidebarToggle;