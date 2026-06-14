/**
 * Página del chat de ChatSIRA.
 * Interfaz conversacional completa con historial, indicador de escritura
 * y botón de nueva sesión.
 */
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { sendMessage, startNewSession } from '../store/slices/chatSlice';
import MessageBubble   from '../components/chat/MessageBubble';
import TypingIndicator from '../components/chat/TypingIndicator';
import ChatInput       from '../components/chat/ChatInput';
import Button          from '../components/shared/Button';

/* Mensaje de bienvenida que aparece al abrir el chat por primera vez */
const WELCOME_MESSAGE = {
  role:      'assistant',
  content:   '¡Hola! 👋 Soy **SIRA**, tu asistente académico de Ingeniería de Sistemas en la UFPS.\n\nPuedo ayudarte con:\n• Orientación sobre tus materias de programación\n• Estrategias de estudio personalizadas\n• Recursos educativos recomendados\n• Planificación de tu semestre\n\n¿En qué puedo orientarte hoy?',
  createdAt: new Date().toISOString(),
};

export default function Chat() {
  const dispatch  = useDispatch();
  const bottomRef = useRef(null);

  const { messages, sessionId, isTyping, aiAvailable, error } = useSelector((s) => s.chat);

  /* Scroll automático al último mensaje */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = (text) => {
    dispatch(sendMessage({ message: text, sessionId }));
  };

  const handleNewSession = () => dispatch(startNewSession());

  const allMessages = messages.length === 0 ? [WELCOME_MESSAGE] : messages;

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header del chat */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <img src="/logo.jpeg" alt="SIRA" className="w-9 h-9 rounded-full object-cover shrink-0 shadow" />
          <div>
            <p className="font-bold text-secondary text-sm">ChatSIRA</p>
            <p className="text-xs text-gray-400">
              {aiAvailable ? '🟢 IA activa (Groq)' : '🟡 Modo básico (motor de reglas)'}
            </p>
          </div>
        </div>
        <Button size="sm" variant="ghost" onClick={handleNewSession}>
          + Nueva sesión
        </Button>
      </div>

      {/* Área de mensajes */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {allMessages.map((msg, idx) => (
          <MessageBubble key={idx} message={msg} />
        ))}
        {isTyping && <TypingIndicator />}
        {error && (
          <div className="text-center text-sm text-red-500 bg-red-50 rounded-lg p-2">
            {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input de texto */}
      <div className="flex-shrink-0">
        <ChatInput onSend={handleSend} disabled={isTyping} />
        <p className="text-center text-xs text-gray-400 pb-2">
          SIRA orienta pero no resuelve ejercicios directamente — fomenta tu aprendizaje activo.
        </p>
      </div>
    </div>
  );
}
