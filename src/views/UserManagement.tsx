import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
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
  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('User');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // PlatformAdmin sees all, Professional might see only their tenant
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(data);
    });
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

  const deleteUser = async (id: string) => {
    if (window.confirm(language === 'en' ? 'Delete this user profile?' : 'Xóa hồ sơ người dùng này?')) {
      try {
         await deleteDoc(doc(db, 'users', id));
      } catch (e) {
         console.error(e);
      }
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
        <div className="p-6 border-b border-white/5">
          <h3 className="text-xs font-bold uppercase tracking-widest opacity-40">
            {language === 'en' ? 'Account List' : 'Danh sách tài khoản'}
          </h3>
        </div>
        <div className="p-6 max-h-[60vh] overflow-y-auto space-y-3">
          {users.map(u => (
            <div key={u.id} className="p-5 flex items-center justify-between glass hover:bg-white/10 transition-all rounded-2xl border border-white/5 hover:border-accent-teal/30 shadow-sm hover:shadow-md">
               <div className="flex items-center gap-5">
                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-accent-teal border border-white/10">
                   <User size={24} />
                 </div>
                 <div>
                   <h4 className="font-bold">{u.name || (language === 'en' ? 'Unnamed' : 'Chưa đặt tên')}</h4>
                   <p className="text-[10px] opacity-60">{u.email}</p>
                 </div>
               </div>
               <div className="flex items-center gap-6">
                 <span className="text-xs px-2 py-1 rounded bg-white/5 uppercase tracking-widest border border-white/10">{u.role}</span>
                 <button onClick={() => deleteUser(u.id)} className="text-white/20 hover:text-rose-500">
                    <Trash2 size={18} />
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
                  <option value="User">{language === 'en' ? 'Patient/User' : 'Bệnh nhân'}</option>
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
    </div>
  );
};

export default UserManagement;
