
import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { Patient, HealthAlert } from '../types';
import { motion } from 'motion/react';
import { 
  Users, 
  Activity, 
  AlertTriangle, 
  ChevronRight, 
  Search,
  Filter
} from 'lucide-react';

const ProDashboard: React.FC<{ language: 'en' | 'vi', onSelectPatient: (id: string) => void }> = ({ language, onSelectPatient }) => {
  const { profile } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddModal, setShowAddModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [usersLoaded, setUsersLoaded] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Normal' | 'Critical'>('All');
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    if (!profile?.tenantId) return;

    // Fetch existing users to link as patients
    const uQuery = query(collection(db, 'users'), where('tenantId', '==', profile.tenantId), where('role', '==', 'User'));
    const unsubscribeUsers = onSnapshot(uQuery, (snapshot) => {
      setAvailableUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUsersLoaded(true);
    }, (error) => console.error("Users snapshot error:", error.message));

    const pQuery = query(collection(db, 'patients'), where('tenantId', '==', profile.tenantId));
    const unsubscribePatients = onSnapshot(pQuery, (snapshot) => {
      const pts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Patient));
      setPatients(pts);
    }, (error) => console.error("Patients snapshot error:", error.message));

    const aQuery = query(
      collection(db, 'alerts'), 
      where('tenantId', '==', profile.tenantId),
      orderBy('timestamp', 'desc'),
      limit(5)
    );
    const unsubscribeAlerts = onSnapshot(aQuery, (snapshot) => {
      setAlerts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HealthAlert)));
      setLoading(false);
    }, (error) => console.error("Alerts snapshot error:", error.message));

    return () => {
      unsubscribeUsers();
      unsubscribePatients();
      unsubscribeAlerts();
    };
  }, [profile]);

  const addingUsersRef = React.useRef(new Set<string>());

  useEffect(() => {
    if (!profile?.tenantId || !usersLoaded) return;
    
    // 1. Link actual users without a patient profile
    const unlinkedUsers = availableUsers.filter(u => !patients.find(p => p.email === u.email));
    
    unlinkedUsers.forEach(async (user) => {
      if (addingUsersRef.current.has(user.id)) return;
      addingUsersRef.current.add(user.id);
      try {
        const pRef = await addDoc(collection(db, 'patients'), {
          name: user.name || 'Unnamed',
          email: user.email,
          dob: 'Unknown',
          tenantId: profile.tenantId,
          status: 'Normal',
          professionalId: profile.uid,
          userId: user.id,
          createdAt: new Date().toISOString()
        });

        const now = new Date();
        for (let i = 0; i < 7; i++) {
           const date = new Date(now);
           date.setDate(now.getDate() - (6 - i));
           await addDoc(collection(db, 'patients', pRef.id, 'records'), {
             timestamp: date,
             heartRate: 70 + Math.floor(Math.random() * 20),
             steps: 5000 + Math.floor(Math.random() * 5000),
             sleepQuality: ['Good', 'Fair', 'Poor'][Math.floor(Math.random() * 3)],
             isTest: true
           });
        }

        const { doc: firestoreDoc, updateDoc } = await import('firebase/firestore');
        await updateDoc(firestoreDoc(db, 'users', user.id), { patientId: pRef.id });
      } catch (e) {
        console.error("Error linking user to patient:", e);
        addingUsersRef.current.delete(user.id);
      }
    });

    // 2. Remove "clone" patients that do not map to an existing valid user in availableUsers
    const orphanedPatients = patients.filter(p => !availableUsers.find(u => u.email === p.email));
    orphanedPatients.forEach(async (patient) => {
      if (addingUsersRef.current.has(patient.id)) return;
      addingUsersRef.current.add(patient.id);
      try {
        const { doc: firestoreDoc, deleteDoc } = await import('firebase/firestore');
        await deleteDoc(firestoreDoc(db, 'patients', patient.id));
      } catch (e) {
        console.error("Error deleting cloned patient:", e);
        addingUsersRef.current.delete(patient.id);
      }
    });

  }, [availableUsers, patients, profile, usersLoaded]);

  const stats = [
    { label: language === 'en' ? 'Total Patients' : 'Tổng bệnh nhân', value: patients.length, icon: Users, color: 'text-accent-teal', bg: 'bg-accent-teal/10' },
    { label: language === 'en' ? 'Critical Cases' : 'Ca nguy kịch', value: patients.filter(p => p.status === 'Critical').length, icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: language === 'en' ? 'Active Alerts' : 'Cảnh báo mới', value: alerts.filter(a => a.status === 'New').length, icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-light italic">{language === 'en' ? 'Clinical' : 'Lâm sàng'} <span className="font-semibold not-italic">Dashboard</span></h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">Tenant ID: {profile?.tenantId}</p>
        </div>
        <div className="flex gap-4 w-full md:w-auto">
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="dashboard">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass p-6 rounded-3xl hover:border-accent-teal/30 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg`}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold opacity-50">{stat.label}</p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass rounded-3xl overflow-hidden" id="patients">
          <div className="p-6 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-xs uppercase tracking-widest font-bold opacity-60 flex-shrink-0">{language === 'en' ? 'Patient Management' : 'Quản lý bệnh nhân'}</h2>
            <div className="flex gap-2 w-full sm:w-auto relative">
              <div className="flex-1 sm:w-48 relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={language === 'en' ? 'Search...' : 'Tìm kiếm...'}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-accent-teal transition-colors"
                />
              </div>
              <div className="relative flex-shrink-0">
                <button 
                  onClick={() => setShowFilterMenu(!showFilterMenu)}
                  className={`p-2 rounded-xl border transition-colors ${statusFilter !== 'All' ? 'bg-accent-teal/20 border-accent-teal/50 text-accent-teal' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                >
                  <Filter size={16} />
                </button>
                {showFilterMenu && (
                  <div className="absolute right-0 top-full mt-2 w-40 glass rounded-xl border border-white/10 shadow-xl overflow-hidden z-20">
                    <button 
                      onClick={() => { setStatusFilter('All'); setShowFilterMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest ${statusFilter === 'All' ? 'bg-accent-teal/20 text-accent-teal' : 'hover:bg-white/5'}`}
                    >
                      {language === 'en' ? 'All Status' : 'Tất cả'}
                    </button>
                    <button 
                      onClick={() => { setStatusFilter('Normal'); setShowFilterMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest ${statusFilter === 'Normal' ? 'bg-emerald-500/20 text-emerald-500' : 'hover:bg-white/5'}`}
                    >
                      {language === 'en' ? 'Normal' : 'Bình thường'}
                    </button>
                    <button 
                      onClick={() => { setStatusFilter('Critical'); setShowFilterMenu(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold uppercase tracking-widest ${statusFilter === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 'hover:bg-white/5'}`}
                    >
                      {language === 'en' ? 'Critical' : 'Nguy kịch'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="divide-y divide-white/5">
            {(() => {
              const filteredPatients = patients.filter(p => {
                const matchesSearch = (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (p.email || '').toLowerCase().includes(searchQuery.toLowerCase());
                const matchesStatus = statusFilter === 'All' ? true : p.status === statusFilter;
                return matchesSearch && matchesStatus;
              });

              if (filteredPatients.length === 0) {
                return (
                  <div className="p-8 text-center text-white/30 text-xs tracking-widest uppercase italic">
                    {loading ? '...' : (language === 'en' ? 'No patients found' : 'Không có bệnh nhân')}
                  </div>
                );
              }

              return filteredPatients.map((patient) => (
              <div 
                key={patient.id} 
                onClick={() => onSelectPatient(patient.id)}
                className="p-4 hover:bg-white/5 transition-all group cursor-pointer border-l-4 border-transparent hover:border-accent-teal"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center text-accent-teal shadow-inner">
                    <Users size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                       {patient.name}
                       {patient.isTest && <span className="px-1.5 py-0.5 bg-accent-teal/20 text-accent-teal rounded text-[8px] uppercase tracking-widest leading-none">TEST</span>}
                    </h3>
                    <p className="text-[10px] opacity-40 uppercase tracking-tighter">ID: {patient.id.substring(0, 8)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest ${
                      patient.status === 'Critical' ? 'bg-rose-500/20 text-rose-500' : 'bg-emerald-500/20 text-emerald-500'
                    }`}>
                      {patient.status}
                    </span>
                    <ChevronRight className="text-white/20 transition-transform group-hover:translate-x-1" size={16} />
                  </div>
                </div>
              </div>
            ));
            })()}
          </div>
        </div>

        <div className="glass rounded-3xl overflow-hidden" id="alerts">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-widest font-bold opacity-60">{language === 'en' ? 'Real-time Alerts' : 'Cảnh báo thời gian thực'}</h2>
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
          </div>
          <div className="divide-y divide-white/5">
            {alerts.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-xs tracking-widest uppercase italic">
                {language === 'en' ? 'Everything looks safe' : 'Hệ thống ổn định'}
              </div>
            ) : alerts.map((alert) => (
              <div key={alert.id} className={`p-4 flex items-center justify-between gap-4 transition-all ${alert.status === 'New' ? 'bg-rose-500/5' : ''}`}>
                <div className="flex items-center gap-4">
                   <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${alert.status === 'New' ? 'bg-rose-500/20 text-rose-500' : 'bg-white/5 text-white/30'}`}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">
                      {alert.heartRate} BPM <span className="opacity-40 text-xs font-normal">({language === 'en' ? 'Abnormal' : 'Bất thường'})</span>
                      {alert.isTest && <span className="ml-2 px-1.5 py-0.5 bg-accent-teal/20 text-accent-teal rounded text-[8px] uppercase tracking-widest leading-none">TEST</span>}
                    </p>
                    <p className="text-[10px] opacity-40 uppercase tracking-tighter">
                      {alert.patientName || 'Patient'} • {alert.timestamp?.toDate ? alert.timestamp.toDate().toLocaleTimeString() : 'Just now'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={async () => {
                    const { updateDoc, doc } = await import('firebase/firestore');
                    await updateDoc(doc(db, 'alerts', alert.id), { status: 'Read' });
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                  alert.status === 'New' ? 'bg-accent-teal text-black hover:scale-105' : 'bg-white/5 text-white/30'
                }`}>
                  {alert.status === 'New' ? (language === 'en' ? 'Dismiss' : 'Xử lý') : (language === 'en' ? 'Read' : 'Đã xem')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProDashboard;
