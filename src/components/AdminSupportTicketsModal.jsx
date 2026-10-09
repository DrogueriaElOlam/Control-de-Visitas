import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  User, 
  Clock, 
  CheckCheck,
  Search,
  Filter
} from 'lucide-react';
import { 
  getStoredChatMessages, 
  getAdminSupportStats, 
  getVendorConversation, 
  sendChatMessage, 
  resolveSupportTicket, 
  fetchRemoteChatMessages, 
  subscribeToInternalChat 
} from '../lib/internalChat';
import { updateClientInDirectory } from '../lib/catalog';

export default function AdminSupportTicketsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [stats, setStats] = useState(() => getAdminSupportStats());
  const [selectedVendor, setSelectedVendor] = useState(() => {
    const list = getAdminSupportStats().vendorsList;
    return list[0]?.vendorName || 'Danny Perez';
  });
  const [messages, setMessages] = useState(() => getVendorConversation(selectedVendor));
  const [inputText, setInputText] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const messagesEndRef = useRef(null);

  const refreshAll = () => {
    const s = getAdminSupportStats();
    setStats(s);
    setMessages(getVendorConversation(selectedVendor));
  };

  useEffect(() => {
    refreshAll();
    fetchRemoteChatMessages().then(() => {
      refreshAll();
    });

    const cleanup = subscribeToInternalChat(() => {
      refreshAll();
    });
    return cleanup;
  }, [isOpen, selectedVendor]);

  useEffect(() => {
    setMessages(getVendorConversation(selectedVendor));
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, [selectedVendor]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    setIsSending(true);
    try {
      await sendChatMessage({
        vendorName: selectedVendor,
        sender: 'admin',
        senderName: 'Administración General',
        message: inputText.trim(),
        type: 'chat'
      });
      setInputText('');
      refreshAll();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleResolveTicket = async (ticket, approveCatalogUpdate = false) => {
    try {
      if (approveCatalogUpdate && ticket.clientCode && ticket.newName) {
        // Actualizar en el catálogo de clientes de Supabase y localmente
        await updateClientInDirectory({
          code: ticket.clientCode,
          name: ticket.newName
        });
      }

      await resolveSupportTicket(
        ticket.id, 
        approveCatalogUpdate 
          ? `Solicitud aprobada y catálogo actualizado a "${ticket.newName}".`
          : (resolutionNote.trim() || 'Petición atendida y resuelta.')
      );

      setResolutionNote('');
      refreshAll();
    } catch (err) {
      console.error('Error al resolver ticket:', err);
    }
  };

  const filteredVendors = stats.vendorsList.filter(v => 
    v.vendorName.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl flex flex-col h-[92vh] max-h-[760px] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-4 sm:p-5 flex items-center justify-between border-b border-indigo-900 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <MessageSquare size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg tracking-tight">
                  Centro de Solicitudes & Chat de Vendedores
                </h3>
                {stats.totalPending > 0 ? (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full animate-pulse shadow-sm">
                    {stats.totalPending} {stats.totalPending === 1 ? 'pendiente' : 'pendientes'}
                  </span>
                ) : (
                  <span className="bg-emerald-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    Al día
                  </span>
                )}
              </div>
              <p className="text-xs text-indigo-200">
                Resuelve solicitudes de códigos, cambios de clientes y mantén comunicación privada con cada vendedor
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

        {/* Content Body: Dual Column */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left Column: Vendor Threads List */}
          <div className="w-full md:w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-950/60 shrink-0">
            {/* Search Box */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar vendedor..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredVendors.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400">
                  No hay conversaciones ni peticiones registradas aún.
                </div>
              ) : (
                filteredVendors.map((v) => {
                  const isSelected = v.vendorName === selectedVendor;
                  return (
                    <button
                      key={v.vendorName}
                      type="button"
                      onClick={() => setSelectedVendor(v.vendorName)}
                      className={`w-full p-3.5 text-left flex items-start justify-between gap-2 transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-indigo-50 dark:bg-indigo-950/50 border-l-4 border-indigo-600' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-900'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {v.vendorName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {v.lastMessage ? v.lastMessage.message : 'Sin mensajes'}
                        </p>
                        <span className="text-[9px] text-slate-400 mt-1 block">
                          {v.lastMessage?.time || v.lastMessage?.date}
                        </span>
                      </div>

                      {v.pendingCount > 0 && (
                        <span className="bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full shrink-0 shadow-sm animate-pulse">
                          {v.pendingCount}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat & Ticket Handling */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            
            {/* Chat Header for Selected Vendor */}
            <div className="p-3.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {selectedVendor.charAt(0)}
                </div>
                <div>
                  <h4 className="font-extrabold text-xs text-slate-900 dark:text-white">
                    Conversación con: <span className="text-indigo-600 dark:text-indigo-400">{selectedVendor}</span>
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Mensajes privados y canal de soporte remoto
                  </span>
                </div>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40 dark:bg-slate-950/20">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                  <p className="text-xs">No hay mensajes previos con este vendedor.</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = m.sender === 'admin';
                  const isTicket = m.type === 'ticket';

                  return (
                    <div 
                      key={m.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-semibold px-1">
                        <span>{isMe ? 'Administrador General' : m.vendorName}</span>
                        <span>•</span>
                        <span>{m.time || m.date}</span>
                      </div>

                      <div
                        className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                          isMe 
                            ? 'bg-indigo-600 text-white rounded-br-xs' 
                            : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-xs'
                        }`}
                      >
                        {/* Tarjeta de Ticket */}
                        {isTicket && (
                          <div className={`mb-2 pb-2 border-b ${isMe ? 'border-white/20' : 'border-slate-200 dark:border-slate-700'}`}>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <span className="font-black text-[11px] uppercase tracking-wider flex items-center gap-1">
                                📋 Solicitud de Código #{m.clientCode}
                              </span>
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                m.status === 'resolved' 
                                  ? 'bg-emerald-500 text-white' 
                                  : 'bg-rose-500 text-white animate-pulse'
                              }`}>
                                {m.status === 'resolved' ? '✓ Resuelta' : 'Pendiente'}
                              </span>
                            </div>

                            {m.oldName && (
                              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 text-[11px] space-y-0.5 my-1.5">
                                <div>Nombre en Catálogo: <strong className="line-through text-red-500">{m.oldName}</strong></div>
                                <div>Nuevo Nombre Solicitado: <strong className="text-emerald-600 dark:text-emerald-400">{m.newName}</strong></div>
                              </div>
                            )}

                            {/* Acciones del Administrador para resolver la petición */}
                            {m.status === 'pending' && (
                              <div className="mt-2.5 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleResolveTicket(m, true)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                                  title="Aprobar el cambio y actualizar automáticamente el cliente en el catálogo"
                                >
                                  ✓ Autorizar y Cambiar Catálogo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleResolveTicket(m, false)}
                                  className="px-2.5 py-1 bg-slate-700 hover:bg-slate-800 text-white text-[10px] font-bold rounded-lg transition-all shadow-sm cursor-pointer"
                                >
                                  Marcar como Resuelto
                                </button>
                              </div>
                            )}

                            {m.resolutionNote && (
                              <div className="mt-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                Resolución: {m.resolutionNote}
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

            {/* Input Bar for Admin Response */}
            <form onSubmit={handleSendMessage} className="p-3 sm:p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={`Responder a ${selectedVendor}...`}
                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={isSending || !inputText.trim()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
              >
                <Send size={14} />
                <span>Responder</span>
              </button>
            </form>

          </div>

        </div>

      </div>
    </div>
  );
}
