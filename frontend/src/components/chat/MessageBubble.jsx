/**
 * Burbuja de mensaje del chat.
 * Los mensajes del usuario van a la derecha (rojo UFPS).
 * Los mensajes de SIRA van a la izquierda (blanco con borde).
 *
 * Props:
 *   message    — { role, content, source?, createdAt }
 *   onDownload — función opcional; si se provee, muestra botón "Descargar"
 *                en mensajes del asistente. Solo para docentes y admin.
 */
export default function MessageBubble({ message, onDownload }) {
  const isUser = message.role === 'user';

  /* Renderiza markdown básico: **negrita**, *cursiva*. Escapa HTML antes para prevenir XSS. */
  const formatContent = (text) => {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className={`flex items-end gap-2 animate-slide-up ${isUser ? 'justify-end' : 'justify-start'}`}>
      {/* Avatar SIRA */}
      {!isUser && (
        <img
          src="/logo.jpeg"
          alt="SIRA"
          className="w-8 h-8 rounded-full object-cover flex-shrink-0 mb-1"
        />
      )}

      <div className={`max-w-[75%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-primary text-white rounded-br-sm'
              : 'bg-white text-secondary border border-gray-100 rounded-bl-sm'
          }`}
        >
          <p
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
          />
          <span className={`text-xs mt-1 block ${isUser ? 'text-white/60' : 'text-gray-400'}`}>
            {new Date(message.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
            {message.source === 'groq' && (
              <span className="ml-2 bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px]">IA</span>
            )}
          </span>
        </div>

        {/* Botón de descarga — solo en mensajes del asistente cuando onDownload está disponible */}
        {!isUser && onDownload && (
          <button
            onClick={() => onDownload(message.content)}
            className="mt-1 text-[11px] text-gray-400 hover:text-primary flex items-center gap-1 transition px-1"
            title="Descargar contenido como archivo de texto"
          >
            ↓ Descargar reporte
          </button>
        )}
      </div>
    </div>
  );
}
