// Dropdown component
const e = React.createElement;
const { useState, useRef, useEffect } = React;

const Dropdown = ({ trigger, items, align = 'right', className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item, onClose = true) => {
    if (item.onClick) {
      item.onClick(item);
    }
    if (onClose) {
      setIsOpen(false);
    }
  };

  return e('div', { ref: dropdownRef, className: ['dropdown', className, isOpen ? 'open' : ''].filter(Boolean).join(' ') },
    e('div', {
      className: 'dropdown-trigger',
      onClick: (e) => {
        e.stopPropagation();
        setIsOpen(!isOpen);
      },
    }, trigger),
    e('div', { className: ['dropdown-menu', align === 'left' ? 'dropdown-menu-left' : ''].filter(Boolean).join(' ') }, 
      items.map((item, index) => {
        if (item.divider) {
          return e('div', { key: `divider-${index}`, className: 'dropdown-divider' });
        }
        return e('button', {
          key: item.key || index,
          className: ['dropdown-item', item.className, item.disabled ? 'disabled' : ''].filter(Boolean).join(' '),
          onClick: () => !item.disabled && handleItemClick(item, item.closeOnClick !== false),
          disabled: item.disabled,
        }, [
          item.icon && e(Icon, { key: 'icon', name: item.icon, size: 16, className: 'me-2' }),
          item.label,
          item.shortcut && e('span', { key: 'shortcut', className: 'ms-auto text-muted small' }, item.shortcut),
        ]);
      })
    )
  );
};

const DropdownItem = ({ label, onClick, icon, divider = false, disabled = false, shortcut, closeOnClick = true }) => ({
  label,
  onClick,
  icon,
  divider,
  disabled,
  shortcut,
  closeOnClick,
});

window.Dropdown = Dropdown;
window.DropdownItem = DropdownItem;