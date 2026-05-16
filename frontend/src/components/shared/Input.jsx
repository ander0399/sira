/**
 * Campo de texto reutilizable con label, error y soporte para select.
 */
export default function Input({
  label,
  error,
  type      = 'text',
  className = '',
  ...props
}) {
  const base = 'w-full px-4 py-2.5 rounded-lg border bg-white text-secondary placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/40 transition';
  const borderColor = error ? 'border-red-400' : 'border-gray-200';

  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-sm font-medium text-secondary">{label}</label>}
      <input
        type={type}
        className={`${base} ${borderColor} ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
