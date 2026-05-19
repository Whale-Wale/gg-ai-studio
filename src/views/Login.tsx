import React, { useState } from 'react';
import { auth, db } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Stethoscope, Globe, Shield, Smartphone, Zap, Mail, Lock } from 'lucide-react';

const Login: React.FC<{ language: 'en' | 'vi', setLanguage: (l: 'en' | 'vi') => void }> = ({ language, setLanguage }) => {
  const [loading, setLoading] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMethod, setAuthMethod] = useState<'google' | 'email'>('email');

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

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await processUser(result.user);
    } catch (error) {
      console.error(error);
      alert(language === 'en' ? 'Google Login failed. Make sure it is enabled.' : 'Đăng nhập Google thất bại');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) {
      alert(language === 'en' ? 'Please enter email and password' : 'Vui lòng nhập email và mật khẩu');
      return;
    }
    setLoading(true);
    try {
      let result;
      if (authMode === 'register') {
        result = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        result = await signInWithEmailAndPassword(auth, email, password);
      }
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
    <div className="min-h-screen bg-dark-bg flex flex-col md:flex-row relative overflow-hidden text-[#e5e5e5]">
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
                {authMethod === 'email' && (
                  <>
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
                  </>
                )}
              </div>

              {authMethod === 'email' ? (
                <>
                  <button
                    onClick={handleEmailAuth}
                    disabled={loading}
                    className="group w-full bg-accent-teal text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-accent-teal/20 text-[10px] uppercase tracking-widest mt-6"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      authMode === 'login' ? (language === 'en' ? 'Sign In' : 'Đăng nhập') : (language === 'en' ? 'Register' : 'Đăng ký')
                    )}
                  </button>
                  <p className="text-center text-xs opacity-60">
                    {authMode === 'login' 
                      ? (language === 'en' ? 'Don\'t have an account? ' : 'Chưa có tài khoản? ')
                      : (language === 'en' ? 'Already have an account? ' : 'Đã có tài khoản? ')}
                    <button 
                      onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                      className="text-accent-teal font-bold hover:underline"
                    >
                      {authMode === 'login' 
                        ? (language === 'en' ? 'Sign Up' : 'Đăng ký')
                        : (language === 'en' ? 'Sign In' : 'Đăng nhập')}
                    </button>
                  </p>
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 border-b border-white/10"></div>
                    <span className="text-[10px] uppercase tracking-widest opacity-40">OR</span>
                    <div className="flex-1 border-b border-white/10"></div>
                  </div>
                  <button
                    onClick={() => setAuthMethod('google')}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-[10px] border border-white/10 uppercase tracking-widest"
                  >
                    <img src="https://www.google.com/favicon.ico" className="w-4 h-4 grayscale opacity-80" alt="Google" />
                    Google Login
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="group w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 text-[10px] uppercase tracking-widest mt-6"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
                        {language === 'en' ? 'Continue with Google' : 'Tiếp tục với Google'}
                      </>
                    )}
                  </button>
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 border-b border-white/10"></div>
                    <span className="text-[10px] uppercase tracking-widest opacity-40">OR</span>
                    <div className="flex-1 border-b border-white/10"></div>
                  </div>
                  <button
                    onClick={() => setAuthMethod('email')}
                    className="w-full bg-white/5 hover:bg-white/10 text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all text-[10px] border border-white/10 uppercase tracking-widest"
                  >
                    <Mail size={16} className="opacity-80" />
                    {language === 'en' ? 'Use Email / Password' : 'Dùng Email / Mật khẩu'}
                  </button>
                </>
              )}
              
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
