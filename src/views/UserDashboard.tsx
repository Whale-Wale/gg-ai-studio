
import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { HealthRecord, AISummary } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Flame, 
  Moon, 
  RefreshCw, 
  MessageCircle, 
  Send,
  Zap,
  TrendingUp,
  Brain,
  AlertTriangle,
  Activity,
  Trash2,
  Watch,
  Wind
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { chatWithHealthAssistant } from '../lib/gemini';

import { useIsMobile } from '../hooks/useIsMobile';

const UserDashboard: React.FC<{ language: 'en' | 'vi', activeTab?: string }> = ({ language, activeTab }) => {
  const isMobile = useIsMobile();
  const { profile } = useAuth();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'ai', text: string }[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    if (!profile?.patientId) return;

    const rQuery = query(
      collection(db, 'patients', profile.patientId, 'records'),
      orderBy('timestamp', 'desc'),
      limit(24)
    );
    const unsubscribeRecords = onSnapshot(rQuery, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthRecord)).reverse());
    }, (error) => console.error("Records snapshot error:", error.message));

    const sQuery = query(
      collection(db, 'patients', profile.patientId, 'summaries'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const unsubscribeSummary = onSnapshot(sQuery, (snapshot) => {
      if (!snapshot.empty) {
        setSummary({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AISummary);
      }
    }, (error) => console.error("Summary snapshot error:", error.message));

    return () => {
      unsubscribeRecords();
      unsubscribeSummary();
    };
  }, [profile]);

  const simulateSync = async (forceCritical = false) => {
    if (!profile?.patientId || isSyncing) return;
    setIsSyncing(true);
    
    // Simulate fetching from smartwatch
    const hr = forceCritical ? (140 + Math.floor(Math.random() * 30)) : (60 + Math.floor(Math.random() * 40));

    const newRecord = {
      patientId: profile.patientId,
      tenantId: profile.tenantId || 'demo-tenant',
      heartRate: hr,
      steps: Math.floor(Math.random() * 500),
      sleepQuality: ['Poor', 'Fair', 'Good', 'Excellent'][Math.floor(Math.random() * 4)],
      timestamp: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, 'patients', profile.patientId, 'records'), newRecord);
      
      // Trigger alert if heart rate high
      if (newRecord.heartRate > 100) {
        await addDoc(collection(db, 'alerts'), {
          patientId: profile.patientId,
          patientName: profile.name,
          tenantId: profile.tenantId || 'demo-tenant',
          heartRate: newRecord.heartRate,
          timestamp: serverTimestamp(),
          status: 'New',
          isTest: true,
          testCreatedAt: Date.now()
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setIsSyncing(false), 1500);
    }
  };

  const handleChat = async () => {
    if (!chatMessage.trim() || isAiLoading) return;
    const msg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', text: msg }]);
    setIsAiLoading(true);

    try {
      const aiResponse = await chatWithHealthAssistant(msg, records.slice(-5), language);
      setChatHistory(prev => [...prev, { role: 'ai', text: aiResponse || '' }]);
    } catch (e) {
      setChatHistory(prev => [...prev, { role: 'ai', text: language === 'en' ? 'Sorry, I failed to process your request.' : 'Xin lỗi, tôi không thể xử lý yêu cầu của bạn.' }]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const renderStatsAndMeds = () => (
    <div className="space-y-8">
      {/* Quick Vitals */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6" id="dashboard">
        <div className="glass p-4 sm:p-6 rounded-3xl border-l-4 border-accent-teal">
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-accent-teal/10 text-accent-teal rounded-xl flex items-center justify-center">
              <Heart size={16} className="sm:w-5 sm:h-5" />
            </div>
            <TrendingUp size={16} className="text-emerald-500 opacity-50" />
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 truncate">{language === 'en' ? 'Heart Rate' : 'Nhịp tim'}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">{records[records.length - 1]?.heartRate || '--'}</span>
            <span className="text-[10px] opacity-40">BPM</span>
          </div>
        </div>
        
        <div className="glass p-4 sm:p-6 rounded-3xl border-l-4 border-emerald-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
              <Flame size={16} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 truncate">{language === 'en' ? 'Steps' : 'Số bước'}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {records.reduce((acc, r) => acc + (r.steps || 0), 0)}
            </span>
            <span className="text-[10px] opacity-40 hidden sm:inline">{language === 'en' ? 'TOTAL' : 'TỔNG'}</span>
          </div>
        </div>

        <div className="glass p-4 sm:p-6 rounded-3xl border-l-4 border-indigo-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center">
              <Moon size={16} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 truncate">{language === 'en' ? 'Sleep Quality' : 'Giấc ngủ'}</p>
          <span className="text-lg sm:text-2xl font-bold uppercase mt-1 block">{records[records.length - 1]?.sleepQuality || '--'}</span>
        </div>

        <div className="glass p-4 sm:p-6 rounded-3xl border-l-4 border-rose-500">
          <div className="flex justify-between items-start mb-4">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-500/10 text-rose-500 rounded-xl flex items-center justify-center">
              <Activity size={16} className="sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-50 truncate">{language === 'en' ? 'Blood Press' : 'Huyết áp'}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">120<span className="text-xs sm:text-sm text-white/50">/80</span></span>
          </div>
        </div>
      </div>
    </div>
  );

  const chartData = records.map((r, i) => ({
    ...r,
    timeIndex: i,
    spo2: Math.max(90, Math.min(100, 100 - Math.abs((r.heartRate - 75) / 12))),
    hrv: Math.max(20, 100 - r.heartRate * 0.4)
  }));

  const renderHealthActivity = () => (
    <div className="space-y-8">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4" id="health">
        <div className="flex items-center gap-3 px-1">
          <Watch className="text-accent-teal" size={24} />
          <h2 className="text-lg font-bold tracking-tight uppercase">{language === 'en' ? 'Smartwatch Biometrics' : 'Chỉ số sinh tồn Smartwatch'}</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => simulateSync(false)}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 border border-white/10 hover:border-accent-teal/50 hover:bg-accent-teal/5 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{language === 'en' ? 'Sync' : 'Đồng bộ'}</span>
          </button>
          <button 
            onClick={() => simulateSync(true)}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 border border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
          >
            <AlertTriangle size={14} className={isSyncing ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">{language === 'en' ? 'Danger' : 'Nguy hiểm'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full mb-8">
        {/* Heart Rate Chart */}
        <div className="glass p-6 rounded-[32px] border border-white/5 transition-all hover:bg-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Heart className="text-rose-500" size={20} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex-1">{language === 'en' ? 'Heart Rate' : 'Nhịp tim'}</h3>
            </div>
            <span className="text-2xl font-mono font-bold text-rose-500">
              {records.length > 0 ? records[records.length - 1].heartRate : '--'} <span className="text-[10px] uppercase font-sans text-white/50">bpm</span>
            </span>
          </div>
          <div className="h-[180px] w-full">
            {records.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-[10px] font-bold uppercase tracking-widest italic">
                {language === 'en' ? 'No data' : 'Trống'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorHr2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timeIndex" hide />
                  <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip cursor={false} contentStyle={{ background: '#000', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} itemStyle={{ color: '#f43f5e', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} />
                  <Area type="monotone" dataKey="heartRate" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorHr2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* SpO2 */}
        <div className="glass p-6 rounded-[32px] border border-white/5 transition-all hover:bg-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Wind className="text-sky-400" size={20} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex-1">{language === 'en' ? 'Blood Oxygen (SpO2)' : 'Oxy trong máu (SpO2)'}</h3>
            </div>
            <span className="text-2xl font-mono font-bold text-sky-400">
              {records.length > 0 ? Math.max(90, 100 - Math.abs(((records[records.length - 1]?.heartRate || 75) - 75) / 10)).toFixed(0) : '--'} <span className="text-[10px] uppercase font-sans text-white/50">%</span>
            </span>
          </div>
          <div className="h-[180px] w-full">
            {records.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-[10px] font-bold uppercase tracking-widest italic">
                {language === 'en' ? 'No data' : 'Trống'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="timeIndex" hide />
                  <YAxis hide domain={[85, 100]} />
                  <Tooltip cursor={false} contentStyle={{ background: '#000', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} itemStyle={{ color: '#38bdf8', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} />
                  <Line type="stepAfter" dataKey="spo2" stroke="#38bdf8" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* HRV */}
        <div className="glass p-6 rounded-[32px] border border-white/5 transition-all hover:bg-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Zap className="text-amber-400" size={20} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex-1">{language === 'en' ? 'Heart Rate Variability' : 'Biến thiên nhịp tim'}</h3>
            </div>
            <span className="text-2xl font-mono font-bold text-amber-400">
              {records.length > 0 ? Math.max(20, 100 - (records[records.length - 1]?.heartRate || 60) * 0.4).toFixed(0) : '--'} <span className="text-[10px] uppercase font-sans text-white/50">ms</span>
            </span>
          </div>
          <div className="h-[180px] w-full">
            {records.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-[10px] font-bold uppercase tracking-widest italic">
                {language === 'en' ? 'No data' : 'Trống'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="timeIndex" hide />
                  <YAxis hide domain={[0, 120]} />
                  <Tooltip cursor={false} contentStyle={{ background: '#000', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} itemStyle={{ color: '#fbbf24', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} />
                  <Bar dataKey="hrv" fill="#fbbf24" radius={[4, 4, 0, 0]} opacity={0.8} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Activity Levels */}
        <div className="glass p-6 rounded-[32px] border border-white/5 transition-all hover:bg-white/5">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Activity className="text-emerald-500" size={20} />
              <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex-1">{language === 'en' ? 'Activity / Steps' : 'Hoạt động / Bước chân'}</h3>
            </div>
            <span className="text-2xl font-mono font-bold text-emerald-500">
               {records.length > 0 ? records[records.length - 1].steps : '--'} <span className="text-[10px] uppercase font-sans text-white/50">{language === 'en' ? 'steps' : 'bước'}</span>
            </span>
          </div>
          <div className="h-[180px] w-full">
            {records.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-white/30 text-[10px] font-bold uppercase tracking-widest italic">
                {language === 'en' ? 'No data available' : 'Chưa có dữ liệu'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData.slice(-14)}>
                  <defs>
                    <linearGradient id="colorAct2" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timeIndex" hide />
                  <YAxis hide />
                  <Tooltip cursor={false} contentStyle={{ background: '#000', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} itemStyle={{ color: '#10b981', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} />
                  <Area type="step" dataKey="steps" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAct2)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* AI Summary Card */}
      {summary && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-[32px] border-l-4 border-accent-teal relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Brain size={120} className="-rotate-12" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-teal animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-teal">AI Health Insights (Gemini)</span>
            </div>
            <p className="text-lg font-light leading-relaxed mb-8 italic opacity-90">"{summary.summary}"</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{language === 'en' ? 'Potential Risks' : 'Nguy cơ tiềm ẩn'}</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.risks.map((risk, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded uppercase font-bold tracking-tighter">
                      {risk}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{language === 'en' ? 'Recommendations' : 'Đề xuất'}</h4>
                 <div className="flex flex-wrap gap-2">
                  {summary.recommendations.map((rec, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-accent-teal/10 border border-accent-teal/20 text-accent-teal rounded uppercase font-bold tracking-tighter">
                      {rec}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );

  const renderChatbot = () => (
    <div className={`glass rounded-[32px] flex flex-col ${isMobile ? 'h-[calc(100vh-140px)]' : 'h-[700px]'} overflow-hidden`} id="chat">
      <div className="p-6 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-accent-teal/10 text-accent-teal rounded-full flex items-center justify-center">
            <MessageCircle size={20} />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest">HealthFlow AI</h3>
            <p className="text-[10px] opacity-40 flex items-center gap-1 uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Operational
            </p>
          </div>
        </div>
        {chatHistory.length > 0 && (
          <button 
            onClick={() => setChatHistory([])}
            className="p-2 text-white/30 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
            title={language === 'en' ? 'Clear History' : 'Xóa lịch sử'}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {chatHistory.length === 0 && (
          <div className="text-center py-20 opacity-20 flex flex-col items-center gap-4">
            <Brain size={64} />
            <p className="text-xs uppercase tracking-widest font-bold">{language === 'en' ? 'AI Consultation' : 'Tư vấn AI'}</p>
          </div>
        )}
        <AnimatePresence>
          {chatHistory.map((chat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[90%] p-4 rounded-2xl text-xs leading-relaxed ${
                chat.role === 'user' 
                  ? 'bg-accent-teal text-black font-bold rounded-tr-none' 
                  : 'bg-white/5 text-white/80 rounded-tl-none border border-white/10'
              }`}>
                {chat.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {isAiLoading && (
           <div className="flex justify-start">
             <div className="bg-white/5 p-4 rounded-2xl rounded-tl-none border border-white/10">
               <div className="flex gap-1">
                 <span className="w-1 h-1 bg-accent-teal rounded-full animate-bounce" />
                 <span className="w-1 h-1 bg-accent-teal rounded-full animate-bounce [animation-delay:0.2s]" />
                 <span className="w-1 h-1 bg-accent-teal rounded-full animate-bounce [animation-delay:0.4s]" />
               </div>
             </div>
           </div>
        )}
      </div>

      <div className="p-6 bg-white/5 border-t border-white/5">
        <div className="relative">
          <input 
            type="text"
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleChat()}
            placeholder={language === 'en' ? 'Ask anything...' : 'Hỏi bất kỳ điều gì...'}
            className="w-full pl-4 pr-12 py-3 bg-dark-bg border border-white/10 rounded-xl outline-none focus:border-accent-teal/50 transition-all text-xs"
          />
          <button 
            onClick={handleChat}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent-teal hover:scale-110 transition-all"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    if (activeTab === 'chat') {
      return renderChatbot();
    }
    if (activeTab === 'health') {
      return renderHealthActivity();
    }
    return renderStatsAndMeds();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Stats and Charts */}
      <div className="lg:col-span-2 space-y-8">
        {renderStatsAndMeds()}
        {renderHealthActivity()}
      </div>

      {/* AI Chatbot Section */}
      <div className="h-full">
        {renderChatbot()}
      </div>
    </div>
  );

};

export default UserDashboard;
