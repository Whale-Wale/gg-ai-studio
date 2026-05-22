import React, { useState, useEffect } from 'react';
import { Save, AlertCircle, RefreshCw, Server, Shield, Activity, HardDrive, Bot } from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const mockLogs = [
  { id: 1, type: 'error', message: 'Failed to generate summary for patient P-1029', time: '10:45 AM' },
  { id: 2, type: 'warning', message: 'High latency detected in Europe region (+400ms)', time: '09:20 AM' },
  { id: 3, type: 'error', message: 'Authentication token expired for service worker', time: '08:15 AM' },
  { id: 4, type: 'info', message: 'System updated to version 2.4.1', time: 'Yesterday' },
];

const AdminSystemConfig: React.FC<{ language: 'en' | 'vi' }> = ({ language }) => {
  const [prompt, setPrompt] = useState('Analyze the following health data and provide a summary, 3 potential risks, and 3 recommendations.');
  const [quota, setQuota] = useState(72); // out of 100%
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'settings', 'ai_config');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data().prompt) {
          setPrompt(docSnap.data().prompt);
        }
      } catch (e) {
        console.error("Error fetching config:", e);
      }
    };
    fetchConfig();
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'ai_config'), { prompt }, { merge: true });
      alert(language === 'en' ? 'Settings saved successfully' : 'Đã lưu cấu hình');
    } catch (e) {
      console.error(e);
      alert(language === 'en' ? 'Error saving config' : 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-light italic">{language === 'en' ? 'AI &' : 'AI &'} <span className="font-semibold not-italic">{language === 'en' ? 'System' : 'Hệ thống'}</span></h2>
            <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
              {language === 'en' ? 'Configure Prompts & Monitor Resources' : 'Cấu hình Prompt & Theo dõi Tài nguyên'}
            </p>
          </div>
          <button 
             onClick={saveSettings}
             disabled={saving}
             className="flex items-center justify-center gap-2 bg-accent-teal text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all text-xs uppercase tracking-widest disabled:opacity-50"
          >
             {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
             {language === 'en' ? 'Save Config' : 'Lưu Cấu hình'}
          </button>
       </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
             <div className="glass p-8 rounded-3xl border border-white/5 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 text-white/5">
                   <Bot size={150} />
                </div>
                <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
                  <Bot className="text-accent-teal" size={20} />
                  {language === 'en' ? 'Global System Prompt' : 'Prompt Hệ thống chung'}
                </h3>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="w-full h-40 bg-black/20 border border-white/10 rounded-2xl p-4 text-sm resize-none focus:outline-none focus:border-accent-teal/50 transition-colors"
                  placeholder={language === 'en' ? 'Enter system instructions for AI...' : 'Nhập hướng dẫn hệ thống cho AI...'}
                />
             </div>

             <div className="glass p-8 rounded-3xl border border-white/5">
                <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
                  <Activity className="text-rose-500" size={20} />
                  {language === 'en' ? 'Gemini API Quota' : 'Hạn mức API Gemini'}
                </h3>
                <div className="space-y-4">
                   <div className="flex justify-between text-xs tracking-widest uppercase mb-1">
                      <span className="opacity-50">{language === 'en' ? 'Usage this month' : 'Sử dụng tháng này'}</span>
                      <span className="font-bold text-rose-500">{quota}%</span>
                   </div>
                   <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent-teal to-rose-500 rounded-full" style={{ width: `${quota}%` }} />
                   </div>
                   <p className="text-[10px] opacity-40 uppercase tracking-widest text-center mt-2">
                     7,200 / 10,000 {language === 'en' ? 'requests used' : 'lượt yêu cầu đã dùng'}
                   </p>
                </div>
             </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/5">
             <h3 className="text-sm font-bold flex items-center gap-2 mb-6">
               <AlertCircle className="text-amber-500" size={20} />
               {language === 'en' ? 'System Error Logs' : 'Log Lỗi Hệ Thống'}
             </h3>
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {mockLogs.map(log => (
                  <div key={log.id} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-start flex-col gap-2">
                    <div className="flex justify-between items-center w-full">
                       <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md ${
                          log.type === 'error' ? 'bg-rose-500/20 text-rose-500' :
                          log.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
                          'bg-sky-500/20 text-sky-500'
                       }`}>
                          {log.type}
                       </span>
                       <span className="text-[10px] opacity-40 uppercase tracking-widest">{log.time}</span>
                    </div>
                    <p className="text-xs font-mono opacity-80 mt-2">{log.message}</p>
                  </div>
                ))}
             </div>
          </div>
       </div>
    </div>
  );
};

export default AdminSystemConfig;
