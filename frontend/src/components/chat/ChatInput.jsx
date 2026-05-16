/**
 * Barra de entrada de texto del chat.
 * Envía con Enter (sin Shift) o con el botón.
 */
import { useState } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText] = useState('');

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex items-end gap-2 p-3 bg-white border-t border-gray-100">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Escribe tu pregunta académica..."
        disabled={disabled}
        rows={1}
        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-secondary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 transition max-h-32 disabled:opacity-50"
        style={{ overflowY: 'auto' }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !text.trim()}
        className="w-10 h-10 flex-shrink-0 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition active:scale-95"
        aria-label="Enviar mensaje"
      >
        {/* Ícono de enviar (flecha) */}
        <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      </button>
    </div>
  );
}
