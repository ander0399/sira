/**
 * Indicador animado de "SIRA está escribiendo..." con tres puntos.
 */
export default function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 animate-slide-up">
      <img src="/logo.jpeg" alt="SIRA" className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-1" />
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
        <div className="flex gap-1 items-center h-4">
          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
          <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot" />
        </div>
      </div>
    </div>
  );
}
