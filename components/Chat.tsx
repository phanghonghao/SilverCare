
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { getGeminiResponseStream, playTTS, stopTTS } from '../services/geminiService';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatProps {
  onBack: () => void;
}

const Chat: React.FC<ChatProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: t('chat_initial'), 
      timestamp: Date.now(),
      status: 'read'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 1 && messages[0].id === '1') {
      setMessages([{ ...messages[0], content: t('chat_initial') }]);
    }
  }, [t]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const parseAIResponse = (raw: string) => {
    try {
      if (!raw.includes('```')) return { text: raw, metadata: null };

      const textParts = raw.split('```');
      const text = textParts[0].trim();
      let metadata = null;
      if (textParts.length > 1) {
        const jsonStr = textParts[1].replace('json', '').trim();
        if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
             metadata = JSON.parse(jsonStr);
        }
      }
      return { text: text || raw, metadata };
    } catch (e) {
      return { text: raw, metadata: null };
    }
  };

  const handleStop = () => {
    stopTTS();
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || isLoading) return;
    stopTTS();
    
    const userMsg = inputText;
    const userMsgId = Date.now().toString();
    const assistantMsgId = (Date.now() + 1).toString();

    // 1. 添加用户消息
    setMessages(prev => [...prev, { 
      id: userMsgId, 
      role: 'user', 
      content: userMsg, 
      timestamp: Date.now(),
      status: 'sending'
    }]);

    setInputText('');
    setIsLoading(true);

    // 2. 预先添加 AI 消息占位符
    setMessages(prev => [...prev, {
      id: assistantMsgId,
      role: 'assistant',
      content: "...", 
      timestamp: Date.now(),
      status: 'sending'
    }]);

    try {
      let fullResponse = "";
      let sentenceBuffer = ""; // 用于语音分段
      let isFirstChunk = true;
      let hasStartedSpeaking = false;
      
      const stream = getGeminiResponseStream(userMsg);
      
      for await (const chunk of stream) {
        fullResponse += chunk;
        sentenceBuffer += chunk;
        
        // 实时更新UI
        setMessages(prev => prev.map(msg => {
          if (msg.id === assistantMsgId) {
            return { 
              ...msg, 
              content: isFirstChunk ? fullResponse : fullResponse,
              status: 'sending' 
            };
          }
          return msg;
        }));
        
        if (isFirstChunk) {
            isFirstChunk = false;
        }

        // --- 流式语音播放逻辑 ---
        // 简单判断句号、问号、感叹号、换行符作为断句
        // 并且确保不在 JSON 代码块中（虽然 prompt 要求少用 JSON，但以防万一）
        if (!sentenceBuffer.includes('```') && !sentenceBuffer.includes('{')) {
             const sentences = sentenceBuffer.split(/([。？！；?!;\n]+)/);
             if (sentences.length > 1) {
                 // 有完整句子了 (sentences[0]是文, sentences[1]是标点, sentences[2]是剩余...)
                 for (let i = 0; i < sentences.length - 1; i += 2) {
                     const s = sentences[i] + (sentences[i+1] || '');
                     if (s.trim()) {
                        // immediate=false 表示追加到队列，不要打断正在说的话
                        playTTS(s, false); 
                        hasStartedSpeaking = true;
                     }
                 }
                 // 保留最后一段不完整的
                 sentenceBuffer = sentences[sentences.length - 1];
             }
        }
      }

      // 3. 处理剩余的文本缓存 (最后一句)
      if (sentenceBuffer.trim() && !sentenceBuffer.includes('{') && !sentenceBuffer.includes('```')) {
         playTTS(sentenceBuffer, false);
      }

      // 4. 生成结束状态更新
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMsgId ? { ...msg, status: 'read' } : msg
      ));

    } catch (error) {
       console.error("Stream Error", error);
       setMessages(prev => prev.map(msg => 
        msg.id === assistantMsgId ? { ...msg, content: t('no_api_key_chat'), status: 'error' } : msg
       ));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="bg-white px-4 py-3 flex justify-between items-center border-b border-slate-100 shadow-sm z-10">
        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <span>🎙️</span> {t('chat')}
        </h2>
        <button 
          onClick={onBack}
          className="bg-slate-100 px-6 py-2 rounded-full font-bold text-slate-600 active-scale"
        >
          {t('back')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-24">
        {messages.map((msg) => {
          const { text, metadata } = parseAIResponse(msg.content);
          const isThinking = msg.status === 'sending' && msg.role === 'assistant' && text === '...';
          
          return (
            <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`relative max-w-[90%] p-6 rounded-[35px] shadow-lg transition-all ${
                msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-tr-none' 
                  : 'bg-white text-slate-800 rounded-tl-none border border-blue-50'
              }`}>
                {isThinking ? (
                  <div className="flex gap-2 items-center text-slate-400">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
                  </div>
                ) : (
                  <p className="text-2xl leading-relaxed whitespace-pre-wrap">{text}</p>
                )}
                
                {metadata && (
                  <div className="mt-4 space-y-2 animate-fade-in">
                    {metadata.tip && (
                      <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl">
                        <p className="text-sm font-bold text-emerald-800">{t('health_label')}</p>
                        <p className="text-lg text-emerald-700">{metadata.tip}</p>
                      </div>
                    )}
                    {metadata.suggest && (
                      <div className="bg-blue-50 border border-blue-200 p-3 rounded-2xl">
                        <p className="text-sm font-bold text-blue-800">{t('reply_label')}</p>
                        <p className="text-lg text-blue-700">“{metadata.suggest}”</p>
                      </div>
                    )}
                  </div>
                )}
                <div className={`mt-3 text-xs opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-white border-t border-slate-100 w-full flex flex-col gap-2">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={handleStop}
            className="bg-yellow-400 text-yellow-900 w-16 h-16 rounded-full flex-shrink-0 flex flex-col items-center justify-center shadow-lg active-scale border-2 border-yellow-500"
            title={t('stop_talking')}
          >
            <span className="text-2xl leading-none">🤫</span>
            <span className="text-[10px] font-black">{t('stop_talking')}</span>
          </button>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={t('chat_placeholder')}
            className="flex-1 bg-slate-100 rounded-[35px] px-4 py-4 text-xl focus:outline-none border-2 border-transparent focus:border-blue-400 transition-all min-w-0"
          />
          <button
            type="submit"
            disabled={isLoading || !inputText.trim()}
            className={`bg-blue-600 text-white w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center shadow-xl active-scale transition-all hover:bg-blue-500 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isLoading ? (
               <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 ml-1">
                 <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
               </svg>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
