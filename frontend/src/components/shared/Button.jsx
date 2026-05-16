/**
 * Botón reutilizable con variantes primary, secondary y ghost.
 */
import Spinner from './Spinner';

export default function Button({
  children,
  variant  = 'primary',
  size     = 'md',
  loading  = false,
  disabled = false,
  className = '',
  ...props
}) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary:   'bg-primary text-white hover:bg-primary-dark active:scale-95',
    secondary: 'bg-secondary text-white hover:bg-secondary-light active:scale-95',
    ghost:     'bg-transparent text-primary border border-primary hover:bg-primary/10 active:scale-95',
    danger:    'bg-red-600 text-white hover:bg-red-700 active:scale-95',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
