
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { getGeminiResponse, playTTS } from '../services/geminiService';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: '您好，张爷爷！我是小玲，今天有什么想跟我聊聊的吗？', timestamp: Date.now() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    const aiResponseContent = await getGeminiResponse(inputText);
    
    const aiMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: aiResponseContent,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, aiMessage]);
    setIsLoading(false);

    // Speak the response
    setIsSpeaking(true);
    await playTTS(aiResponseContent);
    setIsSpeaking(false);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-4 rounded-3xl text-xl shadow-sm ${
              msg.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-4 rounded-3xl rounded-tl-none border border-slate-100 flex gap-1">
              <div className="w-2 h-2 bg-blue-300 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="p-4 overflow-x-auto whitespace-nowrap gap-2 flex bg-slate-50 border-t border-slate-200">
        {['讲个笑话', '今天天气', '我该吃药了吗？', '讲个新闻'].map(suggestion => (
          <button
            key={suggestion}
            onClick={() => setInputText(suggestion)}
            className="bg-white border border-slate-200 px-4 py-2 rounded-full text-slate-600 active-scale"
          >
            {suggestion}
          </button>
        ))}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-100">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="点击这里输入文字..."
            className="flex-1 bg-slate-100 rounded-2xl px-6 py-4 text-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center text-2xl disabled:opacity-50 active-scale"
          >
            🚀
          </button>
        </form>
      </div>

      {isSpeaking && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm animate-pulse">
          <span className="text-xl">🔊</span> 小玲正在为您朗读...
        </div>
      )}
    </div>
  );
};

export default Chat;
