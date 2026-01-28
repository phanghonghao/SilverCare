
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { getGeminiResponse, playTTS } from '../services/geminiService';

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: '您好！我是小玲，今天想跟我聊点什么吗？', timestamp: Date.now() }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMsg = inputText;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg, timestamp: Date.now() }]);
    setInputText('');
    setIsLoading(true);

    const result = await getGeminiResponse(userMsg);
    
    let assistantContent = result;
    if (result === "ERROR_NO_KEY") {
      assistantContent = "⚠️ 您还没有配置 API 密钥。请回到首页，点击上方的“配置密钥”按钮并粘贴您的 Gemini 密钥。";
    }

    setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: assistantContent, timestamp: Date.now() }]);
    setIsLoading(false);

    if (result !== "ERROR_NO_KEY") {
      await playTTS(assistantContent);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-5 rounded-[30px] text-2xl shadow-sm ${
              msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-slate-800 rounded-tl-none border border-slate-100'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}
        {isLoading && <div className="text-blue-500 font-bold animate-pulse text-xl ml-4">小玲正在思考中...</div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-100 flex gap-2 items-center">
        <form onSubmit={handleSendMessage} className="flex-1 flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="点击这里输入文字..."
            className="flex-1 bg-slate-100 rounded-[25px] px-6 py-4 text-2xl focus:outline-none"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className="bg-blue-600 text-white w-20 h-20 rounded-[25px] flex items-center justify-center text-4xl active-scale"
          >
            🚀
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
