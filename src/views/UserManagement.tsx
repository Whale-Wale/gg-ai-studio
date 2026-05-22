import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { Users, Plus, Trash2, Mail, Lock, Shield, User } from 'lucide-react';

const secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
const secondaryAuth = getAuth(secondaryApp);

const UserManagement: React.FC<{ language: 'en' | 'vi' }> = ({ language }) => {
  const { profile } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [filterRole, setFilterRole] = useState<string>('All');
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('User');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let q;
    if (profile?.role === 'PlatformAdmin') {
      q = collection(db, 'users');
    } else if (profile?.tenantId) {
      q = query(collection(db, 'users'), where('tenantId', '==', profile.tenantId));
    } else {
      return; // Wait for tenantId
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    }, (error) => console.error("Users snapshot error:", error.message));
    return () => unsubscribe();
  }, []);

  const createUser = async () => {
    if (!newEmail || !newPassword || !newName) return;
    setLoading(true);
    try {
      // Create user auth
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newEmail, newPassword);
      // Ensure we immediately log out the secondary app
      await signOut(secondaryAuth);
      
      // Add user profile
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email: newEmail,
        name: newName,
        role: newRole,
        status: newRole === 'Professional' ? 'Pending' : 'Active',
        tenantId: profile?.role === 'PlatformAdmin' ? 'demo-tenant' : profile?.tenantId,
        createdAt: new Date().toISOString()
      });
      
      setShowAdd(false);
      setNewEmail('');
      setNewPassword('');
      setNewName('');
      alert(language === 'en' ? 'User created successfully' : 'Tạo tài khoản thành công');
    } catch (e: any) {
      console.error(e);
      alert(language === 'en' ? 'Error: ' + e.message : 'Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const updateUserStatus = async (userId: string, status: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { status });
    } catch (e: any) {
      console.error(e);
      alert(language === 'en' ? 'Error: ' + e.message : 'Lỗi: ' + e.message);
    }
  };

  const deleteUser = async () => {
    if (!userToDelete) return;
    try {
      await deleteDoc(doc(db, 'users', userToDelete));
      setUserToDelete(null);
    } catch (e: any) {
      console.error(e);
      alert(language === 'en' ? 'Error: ' + e.message : 'Lỗi: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-light italic">{language === 'en' ? 'Accounts' : 'Tài khoản'}</h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
            {language === 'en' ? 'Manage Doctors, Nurses, and Patients' : 'Quản lý Bác sĩ, Y tá, và Bệnh nhân'}
          </p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-accent-teal text-black px-6 py-3 rounded-xl font-bold hover:scale-105 transition-all text-xs uppercase tracking-widest"
        >
          <Plus size={20} />
          {language === 'en' ? 'Create Account' : 'Tạo Tài khoản'}
        </button>
      </div>

      <div className="glass rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">
            {language === 'en' ? 'Account List' : 'Danh sách tài khoản'}
          </h3>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
             {['All', 'Professional', 'User', 'PlatformAdmin'].map(r => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${filterRole === r ? 'bg-accent-teal/20 text-accent-teal border-accent-teal/50' : 'bg-white/5 text-white/50 border-white/10 hover:bg-white/10'} border`}
                >
                  {r === 'All' ? (language === 'en' ? 'All' : 'Tất cả') : r === 'User' ? (language === 'en' ? 'Patients' : 'Bệnh nhân') : r === 'Professional' ? (language === 'en' ? 'Doctors' : 'Bác sĩ') : 'Admins'}
                </button>
             ))}
          </div>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {users.filter(u => filterRole === 'All' || u.role === filterRole).map(u => (
            <div key={u.id} className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass hover:bg-white/10 transition-all rounded-2xl border border-white/5 hover:border-accent-teal/30 shadow-sm hover:shadow-md">
               <div className="flex items-center gap-5">
                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-accent-teal border border-white/10 shrink-0">
                   {u.role === 'Professional' ? <Shield size={24} /> : <User size={24} />}
                 </div>
                 <div>
                   <h4 className="font-bold flex items-center gap-2">
                     {u.name || (language === 'en' ? 'Unnamed' : 'Chưa đặt tên')}
                     <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 uppercase tracking-widest border border-white/10">{u.role}</span>
                     {u.status === 'Pending' && <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-500 uppercase tracking-widest border border-amber-500/20">{language === 'en' ? 'Pending' : 'Chờ duyệt'}</span>}
                     {u.status === 'Suspended' && <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-500 uppercase tracking-widest border border-rose-500/20">{language === 'en' ? 'Suspended' : 'Bị khóa'}</span>}
                   </h4>
                   <p className="text-[10px] opacity-60 mt-1">{u.email}</p>
                 </div>
               </div>
               <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                 {u.role === 'Professional' && u.status === 'Pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => updateUserStatus(u.id, 'Active')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30 rounded-lg transition-colors border border-emerald-500/20">
                        {language === 'en' ? 'Approve' : 'Phê duyệt'}
                      </button>
                      <button onClick={() => updateUserStatus(u.id, 'Rejected')} className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500/50 hover:bg-rose-500/20 hover:text-rose-500 rounded-lg transition-colors border border-white/5 hover:border-rose-500/20">
                        {language === 'en' ? 'Reject' : 'Từ chối'}
                      </button>
                    </div>
                 )}
                 {(u.role === 'User' || u.role === 'Professional') && u.status !== 'Pending' && (
                    <button 
                      onClick={() => updateUserStatus(u.id, u.status === 'Suspended' ? 'Active' : 'Suspended')} 
                      className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-colors border ${u.status === 'Suspended' ? 'bg-amber-500/20 text-amber-500 border-amber-500/20 hover:bg-amber-500/30' : 'bg-white/5 opacity-60 hover:opacity-100 hover:bg-rose-500/20 hover:text-rose-500 hover:border-rose-500/20'}`}
                    >
                      {u.status === 'Suspended' ? (language === 'en' ? 'Unsuspend' : 'Mở khóa') : (language === 'en' ? 'Suspend' : 'Khóa')}
                    </button>
                 )}
                 <button onClick={() => setUserToDelete(u.id)} className="p-2 bg-white/5 text-white/20 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/20 ml-2">
                    <Trash2 size={16} />
                 </button>
               </div>
            </div>
          ))}
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass p-8 rounded-[32px] w-full max-w-md shadow-2xl border border-accent-teal/20">
            <h3 className="text-sm font-bold uppercase tracking-[0.2em] mb-8 text-accent-teal">
              {language === 'en' ? 'New Account' : 'Tài khoản mới'}
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">{language === 'en' ? 'Full Name' : 'Họ và tên'}</label>
                <input 
                  type="text" 
                  placeholder={language === 'en' ? 'Enter full name' : 'Nhập họ và tên'}
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:bg-white/10 focus:border-accent-teal/50 outline-none transition-all placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">{language === 'en' ? 'Email Address' : 'Địa chỉ Email'}</label>
                <input 
                  type="email" 
                  placeholder="name@example.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:bg-white/10 focus:border-accent-teal/50 outline-none transition-all placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">{language === 'en' ? 'Password' : 'Mật khẩu'}</label>
                <input 
                  type="password" 
                  placeholder={language === 'en' ? 'Min 6 chars' : 'Ít nhất 6 ký tự'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:bg-white/10 focus:border-accent-teal/50 outline-none transition-all placeholder:text-white/30"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest opacity-50 mb-2">{language === 'en' ? 'Role' : 'Vai trò'}</label>
                <select 
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full bg-[#1A1A1A] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-accent-teal/50 transition-all appearance-none"
                >
                  <option value="Professional">{language === 'en' ? 'Doctor/Professional' : 'Bác sĩ/Chuyên gia'}</option>
                  <option value="Nurse">{language === 'en' ? 'Nurse' : 'Y tá'}</option>
                  <option value="User">{language === 'en' ? 'Patient/User' : 'Người dùng'}</option>
                  {profile?.role === 'PlatformAdmin' && <option value="PlatformAdmin">Platform Admin</option>}
                </select>
              </div>
            </div>
            
            <div className="flex gap-4 mt-8">
              <button 
                onClick={() => setShowAdd(false)}
                className="flex-1 py-3 text-white/50 hover:text-white rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all"
              >
                {language === 'en' ? 'Cancel' : 'Hủy'}
              </button>
              <button 
                onClick={createUser}
                disabled={loading}
                className="flex-1 py-3 bg-accent-teal text-black rounded-xl font-bold text-[10px] uppercase tracking-widest hover:scale-105 transition-all disabled:opacity-50"
              >
                {loading ? '...' : (language === 'en' ? 'Create' : 'Tạo')}
              </button>
            </div>
          </div>
        </div>
      )}

      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="glass p-8 rounded-[32px] w-full max-w-sm shadow-2xl border border-rose-500/20 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-lg font-bold mb-2">
              {language === 'en' ? 'Delete Account?' : 'Xóa tài khoản này?'}
            </h3>
            <p className="text-xs text-white/50 mb-8">
              {language === 'en' 
                ? 'This action cannot be undone. It will permanently remove the user’s profile data.'
                : 'Hành động này không thể hoàn tác. Nó sẽ xóa vĩnh viễn hồ sơ của người dùng này.'}
            </p>
            
            <div className="flex gap-4">
              <button 
                onClick={() => setUserToDelete(null)}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-xl font-bold text-xs transition-all"
              >
                {language === 'en' ? 'Cancel' : 'Hủy'}
              </button>
              <button 
                onClick={deleteUser}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-bold text-xs hover:scale-105 transition-all shadow-[0_0_20px_rgba(244,63,94,0.4)]"
              >
                {language === 'en' ? 'Delete' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
