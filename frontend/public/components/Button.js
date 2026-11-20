// Button component
const e = React.createElement;
const { forwardRef, useState } = React;

const Button = forwardRef((props, ref) => {
  const {
    children,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    leftIcon,
    rightIcon,
    className = '',
    onClick,
    type = 'button',
    ...rest
  } = props;

  const [isPressed, setIsPressed] = useState(false);

  const baseClasses = 'btn';
  const variantClasses = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    outline: 'btn-outline',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
    success: 'btn-success',
  };
  const sizeClasses = {
    sm: 'btn-sm',
    md: '',
    lg: 'btn-lg',
    icon: 'btn-icon',
  };

  const classNames = [
    baseClasses,
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || '',
    fullWidth ? 'w-full' : '',
    className,
  ].filter(Boolean).join(' ');

  const handleClick = (e) => {
    if (!disabled && !loading && onClick) {
      onClick(e);
    }
  };

  const handleMouseDown = () => !disabled && !loading && setIsPressed(true);
  const handleMouseUp = () => setIsPressed(false);
  const handleMouseLeave = () => setIsPressed(false);

  return e('button', {
    ref,
    type,
    className: classNames,
    disabled: disabled || loading,
    onClick: handleClick,
    onMouseDown: handleMouseDown,
    onMouseUp: handleMouseUp,
    onMouseLeave: handleMouseLeave,
    ...rest
  }, [
    loading && e('span', { key: 'spinner', className: 'loading-spinner' }),
    !loading && leftIcon && e(Icon, { key: 'left-icon', name: leftIcon, size: size === 'sm' ? 14 : size === 'lg' ? 22 : 18 }),
    e('span', { key: 'children', className: loading ? 'opacity-50' : '' }, children),
    !loading && rightIcon && e(Icon, { key: 'right-icon', name: rightIcon, size: size === 'sm' ? 14 : size === 'lg' ? 22 : 18 }),
  ]);
});

Button.displayName = 'Button';

window.Button = Button;