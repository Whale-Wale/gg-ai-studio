import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, User } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { useAuth } from '../contexts/AuthContext';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
let chatSession: any = null;

const AdminAIAssistant: React.FC<{ language: 'en' | 'vi' }> = ({ language }) => {
  const { profile } = useAuth();
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: language === 'en' ? 'Hello Admin! I am your AI Assistant. How can I help you manage the platform today?' : 'Xin chào Quản trị viên! Tôi là Trợ lý AI. Tôi có thể giúp gì cho ngài hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize chat session
    chatSession = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: language === 'en' 
          ? "You are an AI assistant for a global healthcare SaaS platform admin. You help them analyze data, manage tenants (hospitals/clinics), and provide technical advice. Keep answers professional and concise."
          : "Bạn là trợ lý AI cho quản trị viên hệ thống nền tảng SaaS y tế. Bạn giúp họ phân tích dữ liệu, quản lý tổ chức (phòng khám/bệnh viện), và cung cấp tư vấn kỹ thuật. Giữ câu trả lời chuyên nghiệp và ngắn gọn."
      }
    });
  }, [language]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading || !chatSession) return;
    
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const response = await chatSession.sendMessage({ message: userMsg });
      setMessages(prev => [...prev, { role: 'model', text: response.text || '' }]);
    } catch (e: any) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', text: language === 'en' ? 'Sorry, an error occurred.' : 'Xin lỗi, đã xảy ra lỗi.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col glass rounded-3xl overflow-hidden border border-white/5 relative">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/5 backdrop-blur-md flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-full bg-accent-teal/20 flex flex-center items-center justify-center text-accent-teal">
          <Bot size={20} />
        </div>
        <div>
          <h2 className="font-bold">{language === 'en' ? 'Platform AI Assistant' : 'Trợ lý AI hệ thống'}</h2>
          <p className="text-[10px] opacity-50 uppercase tracking-widest">{language === 'en' ? 'Powered by Gemini 3' : 'Được hỗ trợ bởi Gemini 3'}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
             <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-white/10 text-white' : 'bg-accent-teal text-black'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
             </div>
             <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user' ? 'bg-white/10 rounded-tr-none' : 'bg-white/5 border border-white/5 rounded-tl-none'}`}>
               <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
             </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4">
             <div className="w-8 h-8 rounded-full bg-accent-teal text-black flex items-center justify-center shrink-0">
                <Bot size={14} />
             </div>
             <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-4 flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-accent-teal/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-accent-teal/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-accent-teal/50 animate-bounce" style={{ animationDelay: '300ms' }} />
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/5 bg-black/20 shrink-0">
        <div className="relative">
          <input 
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={language === 'en' ? 'Ask anything...' : 'Hỏi bất kỳ điều gì...'}
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-4 pr-12 py-4 text-sm focus:border-accent-teal/50 outline-none transition-colors"
          />
          <button 
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-accent-teal text-black rounded-xl hover:scale-105 transition-transform disabled:opacity-50 disabled:hover:scale-100"
          >
            <Send size={16} className="-ml-1" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminAIAssistant;
