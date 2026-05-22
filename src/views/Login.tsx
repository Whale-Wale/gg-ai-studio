import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Stethoscope, Globe, Shield, Smartphone, Zap, Mail, Lock } from 'lucide-react';

const Login: React.FC<{ language: 'en' | 'vi', setLanguage: (l: 'en' | 'vi') => void }> = ({ language, setLanguage }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const processUser = async (user: any) => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);

    const isAdmin = user.email === 'admin@healthchain.com';
    const isClinic = user.email === 'clinic@healthchain.com';
    
    let targetRole = 'User';
    let targetTenant = 'demo-tenant';

    if (isAdmin) {
      targetRole = 'PlatformAdmin';
      targetTenant = 'system';
    } else if (isClinic) {
      targetRole = 'Professional';
      targetTenant = 'demo-tenant';
    }

    if (docSnap.exists()) {
      const existingData = docSnap.data();
      let updates: any = {};
      
      if (existingData.role !== targetRole) updates.role = targetRole;
      if (existingData.tenantId !== targetTenant) updates.tenantId = targetTenant;
      
      if (targetRole === 'User' && !existingData.patientId) {
        const { addDoc, collection } = await import('firebase/firestore');
        const pRef = await addDoc(collection(db, 'patients'), {
          name: user.displayName || user.email?.split('@')[0] || 'Patient',
          tenantId: targetTenant,
          status: 'Normal',
          createdAt: new Date()
        });
        updates.patientId = pRef.id;
      }

      if (Object.keys(updates).length > 0) {
         await setDoc(docRef, updates, { merge: true });
      }
    } else {
      let patientIdStr = null;
      if (targetRole === 'User') {
        const { addDoc, collection } = await import('firebase/firestore');
        const pRef = await addDoc(collection(db, 'patients'), {
          name: user.displayName || user.email?.split('@')[0] || 'Patient',
          tenantId: targetTenant,
          status: 'Normal',
          createdAt: new Date()
        });
        patientIdStr = pRef.id;
      }

      await setDoc(docRef, {
        uid: user.uid,
        email: user.email,
        name: user.displayName || user.email?.split('@')[0] || 'User',
        role: targetRole,
        tenantId: targetTenant,
        patientId: patientIdStr,
        createdAt: new Date(),
      });
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      alert(language === 'en' ? 'Please enter email and password' : 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await processUser(result.user);
    } catch (error: any) {
      console.error(error);
      if (error.code === 'auth/operation-not-allowed') {
        alert(language === 'en' ? 'Email/Password auth is not enabled in Firebase Console. Please enable it in Authentication > Sign-in methods.' : 'Chưa bật Email/Password trong Firebase Console. Vui lòng bật trong Authentication > Sign-in phương thức.');
      } else {
        alert((language === 'en' ? 'Authentication failed: ' : 'Lỗi xác thực: ') + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-bg flex flex-col md:flex-row relative overflow-hidden">
      {/* Abstract Background Accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-accent-teal/10 blur-[120px] rounded-full" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />

      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center p-12 lg:p-24 relative z-10">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-12 h-12 bg-accent-teal rounded-2xl flex items-center justify-center font-bold text-black shadow-[0_0_30px_rgba(20,184,166,0.3)]">
            <Stethoscope size={24} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">HealthChain <span className="font-light opacity-50 italic">SaaS</span></h1>
        </div>

        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="max-w-xl"
        >
          <h2 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6">
            {language === 'en' ? 'Your Personal' : 'Trung tâm'} <br /><span className="text-accent-teal italic font-light">{language === 'en' ? 'Health Hub.' : 'Sức khỏe.'}</span>
          </h2>
          <p className="text-lg text-white/50 mb-12 leading-relaxed">
            {language === 'en' 
              ? 'Track your vitals, monitor daily activity, and get personalized insights to stay on top of your well-being.'
              : 'Theo dõi chỉ số sinh tồn, hoạt động hàng ngày và nhận tư vấn cá nhân hóa để duy trì sức khỏe của bạn.'}
          </p>
        </motion.div>
      </div>

      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass p-10 rounded-[40px] shadow-2xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <div className="flex justify-center mb-10">
              <div className="bg-white/5 border border-white/10 p-1 rounded-xl flex">
                <button 
                  onClick={() => setLanguage('vi')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${language === 'vi' ? 'bg-accent-teal text-black' : 'text-white/40'}`}
                >
                  VI
                </button>
                 <button 
                  onClick={() => setLanguage('en')}
                  className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${language === 'en' ? 'bg-accent-teal text-black' : 'text-white/40'}`}
                >
                  EN
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                      <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-2">
                        {language === 'en' ? 'Email' : 'Email'}
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input 
                          type="email" 
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="user@healthchain.com"
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-accent-teal/50 transition-all text-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-2">
                        {language === 'en' ? 'Password' : 'Mật khẩu'}
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                        <input 
                          type="password" 
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-2xl outline-none focus:border-accent-teal/50 transition-all text-xs"
                        />
                      </div>
                    </div>
              </div>

              <button
                onClick={handleEmailAuth}
                disabled={loading}
                className="group w-full bg-accent-teal text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-accent-teal/20 text-[10px] uppercase tracking-widest mt-6"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  language === 'en' ? 'Sign In' : 'Đăng nhập'
                )}
              </button>
              
              <p className="text-center text-[10px] text-white/20 uppercase tracking-widest mt-10">
                {language === 'en' 
                  ? 'Authenticated Session Required' 
                  : 'Yêu cầu phiên đã xác thực'}
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
