
import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Tenant } from '../types';
import { motion } from 'motion/react';
import { Globe, Plus, Power, Trash2, Search, CheckCircle, XCircle, Activity, Server, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockSystemData = [
  { time: '00:00', latency: 45, requests: 120, errors: 2 },
  { time: '04:00', latency: 48, requests: 80, errors: 1 },
  { time: '08:00', latency: 65, requests: 350, errors: 5 },
  { time: '12:00', latency: 85, requests: 480, errors: 8 },
  { time: '16:00', latency: 55, requests: 420, errors: 4 },
  { time: '20:00', latency: 50, requests: 290, errors: 3 },
  { time: '24:00', latency: 45, requests: 150, errors: 1 },
];

const AdminDashboard: React.FC<{ language: 'en' | 'vi', activeTab?: string }> = ({ language, activeTab = 'dashboard' }) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [usersCount, setUsersCount] = useState<{patients: number, doctors: number}>({patients: 0, doctors: 0});
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'tenants'), (snapshot) => {
      setTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
    }, (error) => console.error("Tenants snapshot error:", error.message));
    
    // Also fetch users to count patients and doctors
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
       const docs = snapshot.docs.map(doc => doc.data());
       const patients = docs.filter(u => u.role === 'User').length;
       const doctors = docs.filter(u => u.role === 'Professional').length;
       setUsersCount({ patients, doctors });
    }, (error) => console.error("Users count snapshot error:", error.message));

    return () => {
      unsubscribe();
      unsubscribeUsers();
    };
  }, []);

  const addTenant = async () => {
    if (!newName) return;
    try {
      await addDoc(collection(db, 'tenants'), {
        name: newName,
        plan: 'Basic',
        status: 'Active',
        userCount: 0,
        createdAt: serverTimestamp()
      });
      setNewName('');
      setShowAdd(false);
    } catch (e) {
      console.error(e);
      alert('Error creating tenant');
    }
  };

  const [confirmingStatusId, setConfirmingStatusId] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);

  const toggleStatus = async (id: string, currentStatus: string) => {
    try {
      await updateDoc(doc(db, 'tenants', id), {
        status: currentStatus === 'Active' ? 'Inactive' : 'Active'
      });
      setConfirmingStatusId(null);
    } catch (e: any) {
      console.error(e);
      alert(language === 'en' ? 'Error changing status: ' + e.message : 'Lỗi khi đổi trạng thái: ' + e.message);
    }
  };

  const deleteTenant = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'tenants', id));
      setConfirmingDeleteId(null);
    } catch (e: any) {
      if (e.code === 'permission-denied') {
        alert('You do not have permission to delete this record.');
      } else {
        console.error(e);
      }
    }
  };

  const filteredTenants = useMemo(() => {
    return tenants.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()) || t.id.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [tenants, searchQuery]);

  const activeCount = tenants.filter(t => t.status === 'Active').length;

  if (activeTab === 'dashboard') {
    return (
      <div className="space-y-6" id="dashboard">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl font-light italic">{language === 'en' ? 'Platform' : 'Hệ thống'} <span className="font-semibold not-italic">Overview</span></h2>
            <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
              {language === 'en' ? 'Global SaaS Management' : 'Quản lý SaaS Toàn cầu'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6 mb-8">
          <div className="glass p-6 rounded-3xl border border-white/5 shadow-sm hover:shadow-md transition-all col-span-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">{language === 'en' ? 'Total Tenants' : 'Tổng tổ chức'}</h3>
            <div className="flex items-end gap-3 mt-2">
               <p className="text-3xl font-light font-mono text-white leading-none">{tenants.length}</p>
               <span className="text-xs font-bold text-accent-teal uppercase tracking-widest leading-none mb-1 text-emerald-500">{activeCount} {language === 'en' ? 'Active' : 'Hoạt động'}</span>
            </div>
          </div>
          <div className="glass p-6 rounded-3xl border border-white/5 shadow-sm hover:shadow-md transition-all col-span-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">{language === 'en' ? 'Total Patients' : 'Tổng Bệnh nhân'}</h3>
            <p className="text-3xl font-light font-mono text-white mt-2">{usersCount.patients}</p>
          </div>
          <div className="glass p-6 rounded-3xl border border-white/5 shadow-sm hover:shadow-md transition-all col-span-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">{language === 'en' ? 'Total Doctors' : 'Tổng Bác sĩ'}</h3>
            <p className="text-3xl font-light font-mono text-white mt-2">{usersCount.doctors}</p>
          </div>
          <div className="glass p-6 rounded-3xl border border-white/5 shadow-sm hover:shadow-md transition-all col-span-2 lg:col-span-6 flex items-center justify-between">
            <div>
               <h3 className="text-[10px] font-bold uppercase tracking-widest opacity-40">{language === 'en' ? 'Video Calls Today' : 'Lượt Video Call hôm nay'}</h3>
               <p className="text-3xl font-light font-mono text-white mt-2">1,248</p>
            </div>
            <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-emerald-500 bg-emerald-500/10">
               <Activity size={24} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold opacity-80 flex items-center gap-2 text-white">
                  <Server size={16} className="text-accent-teal" />
                  {language === 'en' ? 'System Latency' : 'Độ trễ hệ thống'}
                </h3>
                <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">{language === 'en' ? 'Average response time (ms)' : 'Thời gian phản hồi trung bình (ms)'}</p>
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                {language === 'en' ? 'Healthy' : 'Tốt'}
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={mockSystemData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(20, 184, 166, 0.3)', borderRadius: '12px' }}
                    itemStyle={{ color: '#14b8a6', fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="latency" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorLatency)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass p-8 rounded-3xl border border-white/5 flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-bold opacity-80 flex items-center gap-2 text-white">
                  <Zap size={16} className="text-rose-500" />
                  {language === 'en' ? 'Error Rate & Workload' : 'Tỉ lệ lỗi & Tải hệ thống'}
                </h3>
                <p className="text-[10px] uppercase tracking-widest opacity-40 mt-1">{language === 'en' ? 'Requests vs Errors' : 'Lượt yêu cầu và lỗi'}</p>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <AreaChart data={mockSystemData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e5e5e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#e5e5e5" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorErrors" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', borderColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '12px' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                    itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="requests" stroke="#e5e5e5" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
                  <Area type="monotone" dataKey="errors" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorErrors)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="tenants-view">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-light italic">{language === 'en' ? 'Tenants' : 'Tổ chức'}</h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
             {language === 'en' ? 'Manage your organizations' : 'Quản lý các tổ chức'}
          </p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
          <button 
            onClick={() => setShowAdd(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-accent-teal text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all text-xs uppercase tracking-widest hover:shadow-lg hover:shadow-accent-teal/20"
          >
            <Plus size={20} />
            {language === 'en' ? 'Add' : 'Thêm'}
          </button>
        </div>
      </div>

      <div className="glass rounded-3xl overflow-hidden" id="tenants">
        <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">{language === 'en' ? 'Tenants' : 'Danh sách tổ chức'}</h3>
          <div className="relative w-full sm:w-auto">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-40" />
            <input 
              type="text" 
              placeholder={language === 'en' ? 'Search by name or ID...' : 'Tìm theo tên hoặc ID...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-accent-teal/50 transition-all text-xs"
            />
          </div>
        </div>
        <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto">
          {filteredTenants.length === 0 ? (
             <div className="p-12 text-center text-white/40 text-xs uppercase tracking-widest">
               {language === 'en' ? 'No records found' : 'Không tìm thấy dữ liệu'}
             </div>
          ) : filteredTenants.map((tenant) => (
            <div key={tenant.id} className="p-6 hover:bg-white/5 transition-all group">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-accent-teal shadow-lg group-hover:scale-110 transition-transform">
                    <Globe size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      {tenant.name}
                      {tenant.isTest && <span className="px-1.5 py-0.5 bg-accent-teal/20 text-accent-teal rounded text-[8px] uppercase tracking-widest leading-none">TEST</span>}
                    </h3>
                    <p className="text-[10px] opacity-40 tracking-widest uppercase">ID: {tenant.id.substring(0, 8)} • Plan: {tenant.plan}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-6 flex-wrap mt-4 sm:mt-0">
                  <div className="text-right">
                    <p className="text-xs font-bold">{tenant.userCount} {language === 'en' ? 'Users' : 'Người dùng'}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                    tenant.status === 'Active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                  }`}>
                    {tenant.status === 'Active' ? (language === 'en' ? 'Active' : 'Hoạt động') : (language === 'en' ? 'Inactive' : 'Tạm ngưng')}
                  </span>
                  <div className="flex items-center gap-2">
                    {confirmingStatusId === tenant.id ? (
                      <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-lg">
                        <span className="text-[10px] opacity-60 uppercase">{language === 'en' ? 'Sure?' : 'Chắc chứ?'}</span>
                        <button onClick={() => toggleStatus(tenant.id, tenant.status)} className="text-[10px] text-accent-teal hover:text-white uppercase font-bold">{language === 'en' ? 'Yes' : 'Có'}</button>
                        <button onClick={() => setConfirmingStatusId(null)} className="text-[10px] opacity-60 hover:opacity-100 uppercase">{language === 'en' ? 'No' : 'Không'}</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmingStatusId(tenant.id)}
                        className="p-2 text-white/20 hover:text-white bg-white/5 rounded-lg transition-colors border border-transparent hover:border-white/10"
                        title={language === 'en' ? 'Toggle Status' : 'Đổi trạng thái'}
                      >
                        <Power size={18} />
                      </button>
                    )}

                    {confirmingDeleteId === tenant.id ? (
                      <div className="flex items-center gap-2 bg-white/10 px-2 py-1 rounded-lg">
                        <span className="text-[10px] opacity-60 uppercase">{language === 'en' ? 'Sure?' : 'Chắc chứ?'}</span>
                        <button onClick={() => deleteTenant(tenant.id)} className="text-[10px] text-rose-500 hover:text-rose-400 uppercase font-bold">{language === 'en' ? 'Yes' : 'Có'}</button>
                        <button onClick={() => setConfirmingDeleteId(null)} className="text-[10px] opacity-60 hover:opacity-100 uppercase">{language === 'en' ? 'No' : 'Không'}</button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setConfirmingDeleteId(tenant.id)}
                        className="p-2 text-white/20 hover:text-rose-500 bg-white/5 rounded-lg transition-colors border border-transparent hover:border-rose-500/20"
                        title={language === 'en' ? 'Delete' : 'Xóa'}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass p-8 rounded-[32px] w-full max-w-md shadow-2xl border border-accent-teal/20"
          >
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] mb-8">{language === 'en' ? 'New Organization' : 'Tổ chức mới'}</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-2">{language === 'en' ? 'Tenant Name' : 'Tên tổ chức'}</label>
                <input 
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-accent-teal/50 transition-all text-xs"
                  placeholder="e.g. MediCenter"
                />
              </div>
              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-3 border border-white/5 rounded-xl font-bold text-[10px] uppercase tracking-widest opacity-60 hover:opacity-100 transition-all"
                >
                  {language === 'en' ? 'Cancel' : 'Hủy'}
                </button>
                <button 
                  onClick={addTenant}
                  className="flex-1 py-3 bg-accent-teal text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-accent-teal/20 border border-transparent"
                >
                  {language === 'en' ? 'Deploy' : 'Khởi tạo'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

