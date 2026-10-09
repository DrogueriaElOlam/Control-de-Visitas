import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  Building2,
  RefreshCw
} from 'lucide-react';
import { 
  getVendorConversation, 
  sendChatMessage, 
  fetchRemoteChatMessages, 
  subscribeToInternalChat 
} from '../lib/internalChat';

export default function VendorSupportChatModal({ 
  isOpen, 
  onClose, 
  currentUser, 
  initialTicketData = null 
}) {
  if (!isOpen) return null;

  const vendorName = currentUser?.name || 'Vendedor';
  const [messages, setMessages] = useState(() => getVendorConversation(vendorName));
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [loadingRemote, setLoadingRemote] = useState(false);
  const messagesEndRef = useRef(null);

  // Pre-llenar formulario si viene de un conflicto de código
  const [ticketData, setTicketData] = useState(initialTicketData);

  useEffect(() => {
    setMessages(getVendorConversation(vendorName));
    scrollToBottom();

    // Sincronizar en segundo plano
    setLoadingRemote(true);
    fetchRemoteChatMessages().then(() => {
      setMessages(getVendorConversation(vendorName));
      setLoadingRemote(false);
      scrollToBottom();
    }).catch(() => setLoadingRemote(false));

    // Suscribirse a mensajes en tiempo real
    const cleanup = subscribeToInternalChat(() => {
      setMessages(getVendorConversation(vendorName));
      scrollToBottom();
    });

    return cleanup;
  }, [vendorName, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !ticketData) return;

    setIsSending(true);
    try {
      if (ticketData) {
        // Enviar ticket formal de solicitud de cambio de código/nombre
        const summaryMsg = inputText.trim() || `Solicito revisión y autorización para el código #${ticketData.clientCode}. En catálogo figura como "${ticketData.oldName}" y requiero registrarlo como "${ticketData.newName}".`;
        await sendChatMessage({
          vendorName,
          sender: 'vendor',
          senderName: vendorName,
          message: summaryMsg,
          type: 'ticket',
          clientCode: ticketData.clientCode,
          oldName: ticketData.oldName,
          newName: ticketData.newName
        });
        setTicketData(null);
      } else {
        // Mensaje de chat normal
        await sendChatMessage({
          vendorName,
          sender: 'vendor',
          senderName: vendorName,
          message: inputText.trim(),
          type: 'chat'
        });
      }

      setInputText('');
      setMessages(getVendorConversation(vendorName));
      scrollToBottom();
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-xl flex flex-col h-[90vh] max-h-[700px] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-800 to-blue-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-blue-600/50 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md shadow-inner text-white">
              <MessageSquare size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Soporte con Administración
                </h3>
                <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Privado
                </span>
              </div>
              <p className="text-xs text-blue-200">
                Canal directo entre {vendorName} y la Administración General
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all cursor-pointer"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        {/* Ticket Banner si viene de código duplicado */}
        {ticketData && (
          <div className="bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 p-3 sm:p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-extrabold text-amber-900 dark:text-amber-200">
                    Solicitud de Cambio de Farmacia para Código #{ticketData.clientCode}
                  </div>
                  <div className="text-amber-800 dark:text-amber-300 mt-0.5 text-[11px]">
                    Nombre actual en catálogo: <strong className="underline">{ticketData.oldName}</strong><br/>
                    Nombre que intentas registrar: <strong className="text-blue-600 dark:text-blue-400">{ticketData.newName}</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTicketData(null)}
                className="text-[10px] text-amber-700 dark:text-amber-400 font-bold hover:underline"
              >
                Descartar ticket
              </button>
            </div>
          </div>
        )}

        {/* Messages Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50 dark:bg-slate-950/40">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-3">
                <MessageSquare size={26} />
              </div>
              <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Bandeja de Soporte Vacía
              </h4>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Escribe tu consulta o envía una petición al Administrador si necesitas corregir o autorizar datos de clientes.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender === 'vendor';
              const isTicket = m.type === 'ticket';

              return (
                <div 
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold px-1">
                    {isMe ? (
                      <>
                        <span>Tú ({vendorName})</span>
                        <span>•</span>
                        <span>{m.time || m.date}</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={12} className="text-indigo-600" />
                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">Administración</span>
                        <span>•</span>
                        <span>{m.time || m.date}</span>
                      </>
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] rounded-2xl p-3 shadow-sm text-xs leading-relaxed ${
                      isMe 
                        ? 'bg-blue-600 text-white rounded-br-xs' 
                        : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                    }`}
                  >
                    {isTicket && (
                      <div className={`mb-2 pb-2 border-b ${isMe ? 'border-white/20' : 'border-slate-200 dark:border-slate-700'}`}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-black text-[11px] uppercase tracking-wider flex items-center gap-1">
                            📋 Solicitud de Código #{m.clientCode}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                            m.status === 'resolved' 
                              ? 'bg-emerald-500 text-white' 
                              : isMe ? 'bg-amber-400 text-slate-900' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {m.status === 'resolved' ? '✓ Resuelta' : 'Pendiente de Revisión'}
                          </span>
                        </div>
                        {m.oldName && (
                          <div className="text-[10px] opacity-90">
                            Original: <strong>{m.oldName}</strong> ➔ Solicitado: <strong>{m.newName}</strong>
                          </div>
                        )}
                        {m.resolutionNote && (
                          <div className="mt-1 p-1.5 rounded-lg bg-emerald-500/20 text-[10px] font-bold">
                            Nota del Admin: {m.resolutionNote}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="whitespace-pre-wrap">{m.message}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={ticketData ? "Explica el motivo del cambio o envía directamente..." : "Escribe un mensaje al administrador..."}
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={isSending || (!inputText.trim() && !ticketData)}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
            >
              <Send size={14} />
              <span>{ticketData ? 'Enviar Solicitud' : 'Enviar'}</span>
            </button>
          </div>
          <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
            <span>🔒 Tus mensajes son 100% privados y exclusivos con la Administración.</span>
            {loadingRemote && <span className="text-blue-500 animate-pulse">Sincronizando...</span>}
          </div>
        </form>

      </div>
    </div>
  );
}
