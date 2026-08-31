import React, { useState, useEffect, useRef } from 'react';
import { ChatMessageDto } from '@clustro/shared';
import { api } from '../../services/api';
import { getSocket, joinClusterRoom, leaveClusterRoom } from '../../services/socket';
import { useAuth } from '../../contexts/AuthContext';
import { X, Send, MessageCircle } from 'lucide-react';

interface ChatDrawerProps {
  clusterId: string;
  clusterName: string;
  onClose: () => void;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ clusterId, clusterName, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessageDto[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load chat history
    api.get(`/clusters/${clusterId}/chat/messages`).then((res) => {
      setMessages(res.data);
      setLoading(false);
    });

    // Join Socket room
    joinClusterRoom(clusterId);
    const socket = getSocket();

    const handleNewMessage = (msg: ChatMessageDto) => {
      if (msg.clusterId === clusterId) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('new_message', handleNewMessage);

    return () => {
      socket.off('new_message', handleNewMessage);
      leaveClusterRoom(clusterId);
    };
  }, [clusterId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || !user) return;

    const currentText = text.trim();
    setText('');

    // Emit over socket or fallback to REST POST endpoint
    try {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit('send_message', {
          clusterId,
          senderId: user.id,
          text: currentText,
        });
      } else {
        const res = await api.post(`/clusters/${clusterId}/chat/messages`, { text: currentText });
        setMessages((prev) => [...prev, res.data]);
      }
    } catch (e) {
      const res = await api.post(`/clusters/${clusterId}/chat/messages`, { text: currentText });
      setMessages((prev) => [...prev, res.data]);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 bg-white border border-stone-200 rounded-3xl shadow-2xl flex flex-col max-h-[520px] h-[500px] z-40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-stone-100 bg-brand-800 text-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-brand-300" />
          <p className="text-sm font-bold truncate max-w-[200px]">{clusterName} Chat</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-full hover:bg-brand-700 text-brand-200 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50">
        {loading && <p className="text-xs text-center text-slate-400 py-8">Loading chat messages…</p>}
        {!loading && messages.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-xs">
            <MessageCircle className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No messages in this cluster yet.</p>
            <p className="mt-0.5">Send the first message to say hi 👋</p>
          </div>
        )}

        {messages.map((m) => {
          const isMe = m.senderId === user?.id;
          return (
            <div key={m.id} className={`max-w-[85%] ${isMe ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
              <div
                className={`inline-block px-3.5 py-2 rounded-2xl text-xs font-medium leading-relaxed shadow-2xs ${
                  isMe
                    ? 'bg-brand-700 text-white rounded-br-xs'
                    : 'bg-white text-slate-800 border border-stone-200 rounded-bl-xs'
                }`}
              >
                {m.messageText}
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5 px-1">
                {isMe ? 'You' : m.senderName} · {new Date(m.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-100 flex gap-2 shrink-0">
        <input
          className="flex-1 px-4 py-2 rounded-full bg-stone-100 focus:bg-white border border-stone-200 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-700 transition-all"
          placeholder="Message this cluster…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="w-8.5 h-8.5 rounded-full bg-brand-700 hover:bg-brand-800 disabled:bg-stone-300 text-white flex items-center justify-center shrink-0 transition-colors shadow-xs cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
