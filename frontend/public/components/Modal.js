// Modal component
const e = React.createElement;
const { useEffect, useRef } = React;

const Modal = ({ isOpen, onClose, title, children, size = 'md', showClose = true, closeOnOverlay = true, className = '', footer }) => {
  const modalRef = useRef(null);
  const previousActiveElement = useRef(null);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      document.body.style.overflow = 'hidden';
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements && focusableElements.length > 0) {
          const first = focusableElements[0];
          const last = focusableElements[focusableElements.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'modal-sm',
    md: '',
    lg: 'modal-lg',
    xl: 'modal-xl',
    full: 'modal-full',
  };

  return e('div', {
    className: 'modal-overlay open',
    onClick: closeOnOverlay ? onClose : undefined,
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': title ? 'modal-title' : undefined,
  }, e('div', {
    ref: modalRef,
    className: ['modal', sizeClasses[size], className].filter(Boolean).join(' '),
    tabIndex: -1,
    onClick: e => e.stopPropagation(),
  }, [
    (title || showClose) && e('div', { key: 'header', className: 'modal-header' }, [
      title && e('h2', { key: 'title', id: 'modal-title', className: 'modal-title' }, title),
      showClose && e('button', {
        key: 'close',
        className: 'modal-close',
        onClick: onClose,
        'aria-label': 'Close modal',
      }, e(Icon, { name: 'x', size: 20 })),
    ]),
    e('div', { key: 'body', className: 'modal-body' }, children),
    footer && e('div', { key: 'footer', className: 'modal-footer' }, footer),
  ]));
};

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel', variant = 'danger', loading = false }) => {
  return e(Modal, {
    isOpen,
    onClose,
    title,
    size: 'sm',
    footer: e('div', { className: 'd-flex gap-2 justify-content-end' }, [
      e(Button, { key: 'cancel', variant: 'secondary', onClick: onClose, disabled: loading }, cancelText),
      e(Button, { key: 'confirm', variant, onClick: onConfirm, disabled: loading, loading }, confirmText),
    ]),
  }, e('p', { className: 'text-secondary' }, message));
};

const FormModal = ({ isOpen, onClose, title, children, onSubmit, submitText = 'Save', cancelText = 'Cancel', loading = false, size = 'md' }) => {
  return e(Modal, {
    isOpen,
    onClose,
    title,
    size,
    footer: e('div', { className: 'd-flex gap-2 justify-content-end' }, [
      e(Button, { key: 'cancel', variant: 'secondary', onClick: onClose, disabled: loading }, cancelText),
      e(Button, { key: 'submit', variant: 'primary', onClick: onSubmit, disabled: loading, loading }, submitText),
    ]),
  }, children);
};

window.Modal = Modal;
window.ConfirmModal = ConfirmModal;
window.FormModal = FormModal;