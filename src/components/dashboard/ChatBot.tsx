// src/components/dashboard/ChatBot.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { useChatSession } from '@/hooks/use-chat-session';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Loader } from 'lucide-react';
import { MarkdownContent } from '@/components/MarkdownContent';
import { chatbotService, type ChatbotSource } from '@/lib/api/chatbot.service';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  sources?: ChatbotSource[];
  timestamp: Date;
}

export function ChatBot() {
  const { sessionId } = useChatSession();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: 'Hola, soy el Asistente VirtualMed. ¿Cómo puedo ayudarte hoy? Puedo brindarte información basada en protocolos clínicos verificados.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al nuevo mensaje
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const data = await chatbotService.sendMessage({
        session_id: sessionId,
        message: input,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        sources: data.sources,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      const errorMessage: Message = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200 shadow-sm mt-14">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 flex-shrink-0">
        <h2 className="text-xl font-semibold text-gray-900">Asistente VirtualMed</h2>
        <p className="text-sm text-gray-600 mt-1">
          Información basada en protocolos clínicos verificados
        </p>
      </div>

      {/* Messages Area - This will expand to fill available space */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.type === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-xs lg:max-w-md xl:max-w-lg px-4 py-3 rounded-lg ${
                message.type === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.type === 'user' ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
              ) : (
                <div className="text-sm leading-relaxed break-words">
                  <MarkdownContent content={message.content} />
                </div>
              )}

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-300 space-y-1">
                  <p className="text-xs font-semibold opacity-75">Fuentes:</p>
                  {message.sources.map((source, idx) => (
                    <div key={idx} className="text-xs opacity-75">
                      <span>📄 {source.file_name}</span>
                      {source.page_label && (
                        <span> - Página(s): {source.page_label}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-lg flex items-center space-x-2">
              <Loader className="w-4 h-4 animate-spin" />
              <span className="text-sm">Procesando tu pregunta...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - Fixed at bottom */}
      <div className="border-t border-gray-200 p-4 bg-gray-50 flex-shrink-0">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Escribe tu pregunta aquí..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-blue-500 hover:bg-blue-600 text-white"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
