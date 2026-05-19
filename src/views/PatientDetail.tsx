
import React, { useEffect, useState } from 'react';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, doc, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { HealthRecord, AISummary, Patient } from '../types';
import { generateHealthSummary } from '../lib/gemini';
import { motion } from 'motion/react';
import { 
  ArrowLeft, 
  Download, 
  Heart, 
  Activity, 
  Moon, 
  Calendar,
  AlertCircle,
  FileText,
  Brain,
  Globe,
  Users,
  UserCheck,
  ClipboardList,
  Watch,
  Wind,
  Zap
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line
} from 'recharts';

interface PatientDetailProps {
  patientId: string;
  onBack: () => void;
  language: 'en' | 'vi';
}

const PatientDetail: React.FC<PatientDetailProps> = ({ patientId, onBack, language }) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [notes, setNotes] = useState<any[]>([]);

  // Dialog states to replace window.prompt and window.confirm
  const [dialogState, setDialogState] = useState<{
    isOpen: boolean;
    type: 'discharge' | 'note' | 'info' | 'error' | null;
    input1?: string;
    input2?: string;
    message?: string;
  }>({ isOpen: false, type: null });

  useEffect(() => {
    const pRef = doc(db, 'patients', patientId);
    const unsubscribePatient = onSnapshot(pRef, (doc) => {
      if (doc.exists()) setPatient({ id: doc.id, ...doc.data() } as Patient);
    }, (error) => console.error("Patient onSnapshot error:", error));

    const rQuery = query(
      collection(db, 'patients', patientId, 'records'),
      orderBy('timestamp', 'desc'),
      limit(30)
    );
    const unsubscribeRecords = onSnapshot(rQuery, (snapshot) => {
      setRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthRecord)).reverse());
    }, (error) => console.error("Records onSnapshot error:", error));

    const sQuery = query(
      collection(db, 'patients', patientId, 'summaries'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const unsubscribeSummary = onSnapshot(sQuery, (snapshot) => {
      if (!snapshot.empty) setSummary({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as AISummary);
    }, (error) => console.error("Summaries onSnapshot error:", error));

    const nQuery = query(
      collection(db, 'patients', patientId, 'notes'),
      orderBy('timestamp', 'desc')
    );
    const unsubscribeNotes = onSnapshot(nQuery, (snapshot) => {
      setNotes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Notes onSnapshot error:", error));

    return () => {
      unsubscribePatient();
      unsubscribeRecords();
      unsubscribeSummary();
      unsubscribeNotes();
    };
  }, [patientId]);

  const exportPDF = async () => {
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text("Patient Report", 20, 20);
      doc.setFontSize(14);
      doc.text(`Name: ${patient?.name || 'N/A'}`, 20, 30);
      doc.text(`Status: ${patient?.status || 'N/A'}`, 20, 40);
      doc.text(`DOB: ${patient?.dob || 'N/A'}`, 20, 50);
      doc.text(`ID: ${patient?.id || 'N/A'}`, 20, 60);

      doc.setFontSize(16);
      doc.text("Health Records Summary:", 20, 80);
      doc.setFontSize(12);
      
      let y = 90;
      records.slice(0, 5).forEach((r, idx) => {
        const date = new Date(r.timestamp?.toDate ? r.timestamp.toDate() : Date.now()).toLocaleDateString();
        doc.text(`${idx + 1}. Date: ${date} - Heart Rate: ${r.heartRate} bpm - Steps: ${r.steps}`, 20, y);
        y += 10;
      });

      if (summary) {
        y += 10;
        doc.setFontSize(16);
        doc.text("AI Analysis Summary:", 20, y);
        doc.setFontSize(12);
        y += 10;
        const lines = doc.splitTextToSize(summary.summary || 'No summary', 170);
        doc.text(lines, 20, y);
      }

      doc.save(`health_report_${patient?.name || 'patient'}.pdf`);
      setDialogState({ isOpen: true, type: 'info', message: language === 'en' ? 'PDF Exported successfully!' : 'Đã xuất PDF thành công!' });
    } catch (error) {
      console.error(error);
      setDialogState({ isOpen: true, type: 'error', message: 'Export PDF failed: ' + (error as Error).message });
    }
  };

  const generateSummary = async () => {
    if (!patient) return;
    if (records.length === 0) {
      setDialogState({ isOpen: true, type: 'error', message: language === 'en' ? 'No health records available to analyze.' : 'Không có dữ liệu sức khỏe để phân tích.' });
      return;
    }
    setDialogState({ isOpen: true, type: 'info', message: language === 'en' ? 'Analyzing...' : 'Đang phân tích...' });
    try {
      const result = await generateHealthSummary(records.slice(-10), language);
      await addDoc(collection(db, 'patients', patientId, 'summaries'), {
        ...result,
        patientId,
        tenantId: patient.tenantId,
        timestamp: serverTimestamp()
      });
      // Replace window.alert
      setDialogState({ isOpen: true, type: 'info', message: language === 'en' ? 'AI Analysis completed' : 'Phân tích AI hoàn tất' }); 
    } catch (e) {
      console.error(e);
      setDialogState({ isOpen: true, type: 'error', message: 'AI Generation failed: ' + (e as Error).message });
    }
  };

  const dischargePatient = () => {
    setDialogState({ isOpen: true, type: 'discharge' });
  };

  const confirmDischarge = async () => {
    if (!patient) return;
    try {
      await updateDoc(doc(db, 'patients', patientId), { status: 'Discharged' });
      setDialogState({ isOpen: false, type: null });
      onBack();
    } catch (e) {
      console.error(e);
      setDialogState({ isOpen: true, type: 'error', message: 'Discharge failed: ' + (e as Error).message });
    }
  };

  const addNote = () => {
    setDialogState({ isOpen: true, type: 'note', input1: '' });
  };

  const confirmAddNote = async () => {
    const text = dialogState.input1;
    if (!text || !text.trim()) {
      setDialogState({ isOpen: true, type: 'error', message: language === 'en' ? 'Note cannot be empty' : 'Ghi chú không được để trống' });
      return;
    }
    setDialogState({ isOpen: true, type: 'info', message: language === 'en' ? 'Saving...' : 'Đang lưu...' });
    try {
      await addDoc(collection(db, 'patients', patientId, 'notes'), {
        text: text.trim(),
        timestamp: serverTimestamp()
      });
      setDialogState({ isOpen: false, type: null });
    } catch (e) {
      console.error(e);
      setDialogState({ isOpen: true, type: 'error', message: 'Failed to add note: ' + (e as Error).message });
    }
  };

  if (!patient) return null;

  const chartData = records.map((r, i) => ({
    ...r,
    timeIndex: i,
    spo2: Math.max(90, Math.min(100, 100 - Math.abs((r.heartRate - 75) / 12))),
    hrv: Math.max(20, 100 - r.heartRate * 0.4)
  }));

  return (
    <div className="space-y-8 pb-12" id="report-content">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-all text-sm uppercase tracking-widest font-bold"
        >
          <ArrowLeft size={18} />
          {language === 'en' ? 'Back' : 'Quay lại'}
        </button>
        <div className="flex flex-wrap gap-4 w-full md:w-auto">
          <button 
            onClick={generateSummary}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-accent-teal/10 text-accent-teal px-4 md:px-6 py-3 rounded-xl font-bold hover:bg-accent-teal/20 transition-all border border-accent-teal/20 text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap"
          >
            <Brain size={18} />
            {language === 'en' ? 'AI Analysis' : 'Phân tích AI'}
          </button>
          <button 
            onClick={dischargePatient}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500/10 text-emerald-500 px-4 md:px-6 py-3 rounded-xl font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/20 text-[10px] md:text-xs uppercase tracking-widest whitespace-nowrap"
          >
            <UserCheck size={18} />
            {language === 'en' ? 'Discharge' : 'Xuất viện'}
          </button>
          <button 
            onClick={exportPDF}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/10 text-white px-4 md:px-6 py-3 rounded-xl font-bold hover:bg-white/20 transition-all text-[10px] md:text-xs uppercase tracking-widest border border-white/5 whitespace-nowrap"
          >
            <Download size={18} />
            {language === 'en' ? 'Export' : 'Xuất PDF'}
          </button>
        </div>
      </div>

      <div className="glass p-8 rounded-[32px] flex flex-col md:flex-row gap-8 items-start md:items-center border-l-4 border-accent-teal relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Users size={120} />
        </div>
        <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center text-accent-teal text-3xl font-bold shadow-inner relative z-10">
          {patient.name.charAt(0)}
        </div>
        <div className="flex-1 relative z-10">
          <div className="flex items-center gap-4 mb-2">
            <h2 className="text-3xl font-bold tracking-tight">{patient.name}</h2>
            <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-[0.2em] ${
              patient.status === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
            }`}>
              {patient.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-6 text-[10px] uppercase font-bold tracking-widest opacity-40">
            <p className="flex items-center gap-2"><Globe size={14} /> {language === 'en' ? 'ID' : 'Mã'}: {patient.id.substring(0, 8)}</p>
            <p className="flex items-center gap-2"><Activity size={14} /> {language === 'en' ? 'DOB' : 'Ngày sinh'}: {patient.dob}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-2 px-1">
        <Watch className="text-accent-teal" size={24} />
        <h2 className="text-lg font-bold tracking-tight uppercase">{language === 'en' ? 'Smartwatch Biometrics' : 'Chỉ số sinh tồn Smartwatch'}</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
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
                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timeIndex" hide />
                  <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip cursor={false} contentStyle={{ background: '#000', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} itemStyle={{ color: '#f43f5e', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} />
                  <Area type="monotone" dataKey="heartRate" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorHr)" />
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
                    <linearGradient id="colorAct" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="timeIndex" hide />
                  <YAxis hide />
                  <Tooltip cursor={false} contentStyle={{ background: '#000', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} itemStyle={{ color: '#10b981', fontWeight: 'bold' }} labelStyle={{ display: 'none' }} />
                  <Area type="step" dataKey="steps" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorAct)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Clinical Notes */}
      <div className="grid grid-cols-1 gap-8">
        <div className="glass p-8 rounded-[32px]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <ClipboardList className="text-accent-teal" size={20} />
              <h3 className="text-xs font-bold uppercase tracking-widest opacity-60">{language === 'en' ? 'Clinical Notes' : 'Ghi chú lâm sàng'}</h3>
            </div>
            <button onClick={addNote} className="text-[10px] uppercase font-bold text-accent-teal hover:underline">+ {language === 'en' ? 'Add Note' : 'Thêm ghi chú'}</button>
          </div>
          <div className="space-y-4">
            {notes.length === 0 ? (
               <div className="text-white/30 text-[10px] uppercase tracking-widest font-bold italic py-4 text-center">
                 {language === 'en' ? 'No notes yet' : 'Chưa có ghi chú'}
               </div>
            ) : notes.map(note => (
              <div key={note.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <p className="text-xs font-light tracking-wide opacity-80 leading-relaxed text-[#e5e5e5]">
                  {note.text}
                </p>
                <div className="text-[10px] uppercase tracking-widest opacity-40 mt-3 pt-3 border-t border-white/5 flex justify-end">
                  <span>{new Date(note.timestamp?.toDate ? note.timestamp.toDate() : Date.now()).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Summary View */}
      {summary && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-8 rounded-[32px] border-l-4 border-accent-teal relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5">
             <Brain size={120} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-teal animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-teal">Clinical AI Analysis (Gemini)</span>
            </div>
            <p className="text-lg font-light leading-relaxed mb-8 italic opacity-90">"{summary.summary}"</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h4 className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{language === 'en' ? 'Clinical Risks' : 'Nguy cơ lâm sàng'}</h4>
                <div className="flex flex-wrap gap-2">
                  {summary.risks.map((risk, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded uppercase font-bold tracking-tighter">
                      {risk}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <h4 className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{language === 'en' ? 'Recommendations' : 'Đề xuất xử lý'}</h4>
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

      {/* Custom Dialog */}
      {dialogState.isOpen && dialogState.type && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass p-6 md:p-8 rounded-[32px] w-full max-w-md border border-white/10 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">
              {dialogState.type === 'discharge' && (language === 'en' ? 'Confirm Discharge' : 'Xác nhận xuất viện')}
              {dialogState.type === 'note' && (language === 'en' ? 'Add Clinical Note' : 'Thêm ghi chú lâm sàng')}
              {dialogState.type === 'info' && (language === 'en' ? 'Success' : 'Thành công')}
              {dialogState.type === 'error' && (language === 'en' ? 'Error' : 'Lỗi')}
            </h2>
            
            {(dialogState.type === 'info' || dialogState.type === 'error') && (
              <p className="text-sm opacity-80 mb-6 font-light">
                {dialogState.message}
              </p>
            )}
            
            {dialogState.type === 'discharge' && (
              <p className="text-sm opacity-80 mb-6 font-light">
                {language === 'en' ? 'Are you sure you want to discharge this patient? They will be removed from the active list.' : 'Bạn có chắc chắn muốn cho bệnh nhân này xuất viện? Bệnh nhân sẽ bị xóa khỏi danh sách.'}
              </p>
            )}

            {dialogState.type === 'note' && (
              <textarea 
                value={dialogState.input1 || ''}
                onChange={e => setDialogState(prev => ({ ...prev, input1: e.target.value }))}
                placeholder={language === 'en' ? 'Enter clinical note...' : 'Nhập ghi chú lâm sàng...'}
                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm resize-none h-32 mb-6 focus:outline-none focus:border-accent-teal"
              />
            )}

            <div className="flex gap-4">
              {dialogState.type !== 'info' && dialogState.type !== 'error' && (
                <button 
                  onClick={() => setDialogState({ isOpen: false, type: null })}
                  className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-bold text-sm transition-colors"
                >
                  {language === 'en' ? 'Cancel' : 'Hủy'}
                </button>
              )}
              <button 
                onClick={() => {
                  if (dialogState.type === 'discharge') confirmDischarge();
                  if (dialogState.type === 'note') confirmAddNote();
                  if (dialogState.type === 'info' || dialogState.type === 'error') setDialogState({ isOpen: false, type: null });
                }}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition-colors ${
                  dialogState.type === 'discharge' || dialogState.type === 'error' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-accent-teal hover:bg-accent-teal/90 text-slate-900'
                }`}
              >
                {dialogState.type === 'info' || dialogState.type === 'error' 
                  ? (language === 'en' ? 'Close' : 'Đóng') 
                  : (language === 'en' ? 'Confirm' : 'Xác nhận')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
