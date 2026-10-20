import { useState, useRef } from 'react';

export default function ChatInput({ onSend, disabled }) {
  const [text, setText]           = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview]     = useState(null);
  const fileRef                   = useRef(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if ((!trimmed && !imageFile) || disabled) return;
    onSend(trimmed || '📎 Imagen adjunta', imageFile);
    setText('');
    setImageFile(null);
    setPreview(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const removeImage = () => {
    setImageFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  return (
    <div className="flex flex-col gap-1 p-3 bg-white border-t border-gray-100">
      {/* Vista previa de imagen seleccionada */}
      {preview && (
        <div className="relative w-20 h-20 mb-1">
          <img src={preview} alt="adjunto" className="w-20 h-20 object-cover rounded-lg border border-gray-200" />
          <button
            onClick={removeImage}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600"
            aria-label="Quitar imagen"
          >
            ×
          </button>
        </div>
      )}

      <div className="flex items-end gap-2">
        {/* Botón adjuntar imagen */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={disabled}
          className="w-10 h-10 flex-shrink-0 text-gray-400 hover:text-primary disabled:opacity-40 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"
          aria-label="Adjuntar imagen"
          title="Adjuntar imagen (JPG, PNG, GIF, WebP — máx. 5 MB)"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />

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

        {/* Botón enviar */}
        <button
          onClick={handleSend}
          disabled={disabled || (!text.trim() && !imageFile)}
          className="w-10 h-10 flex-shrink-0 bg-primary hover:bg-primary-dark disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition active:scale-95"
          aria-label="Enviar mensaje"
        >
          <svg className="w-5 h-5 rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </button>
      </div>
    </div>
  );
}
