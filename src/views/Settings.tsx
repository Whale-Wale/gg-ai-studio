import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { Settings as SettingsIcon, User, Bell, Shield, Smartphone, Save } from 'lucide-react';

const Settings: React.FC<{ language: 'en' | 'vi' }> = ({ language }) => {
  const { profile } = useAuth();
  const [name, setName] = useState(profile?.name || '');
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState(true);
  const [activeSection, setActiveSection] = useState<'profile' | 'notifications' | 'security' | 'devices'>('profile');

  const handleSave = async () => {
    if (!profile?.uid) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        name
      });
      alert(language === 'en' ? 'Settings saved successfully' : 'Đã lưu cài đặt thành công');
    } catch (e) {
      console.error(e);
      alert(language === 'en' ? 'Failed to save settings' : 'Không thể lưu cài đặt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8" id="settings">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 glass rounded-2xl flex items-center justify-center text-accent-teal shadow-lg">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-light italic">{language === 'en' ? 'System' : 'Cấu hình'} <span className="font-semibold not-italic">{language === 'en' ? 'Settings' : 'Hệ thống'}</span></h2>
          <p className="text-[10px] opacity-40 uppercase tracking-widest mt-1">
            {profile?.role === 'Professional' ? (language === 'en' ? 'Provider Preferences' : 'Tùy chọn phòng khám') : (language === 'en' ? 'Patient Preferences' : 'Tùy chọn bệnh nhân')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          <button 
            onClick={() => setActiveSection('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeSection === 'profile' 
                ? 'glass border-l-2 border-accent-teal text-accent-teal' 
                : 'hover:bg-white/5 text-white/40 hover:text-white'
            }`}
          >
            <User size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{language === 'en' ? 'Profile' : 'Hồ sơ'}</span>
          </button>
          <button 
            onClick={() => setActiveSection('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeSection === 'notifications' 
                ? 'glass border-l-2 border-accent-teal text-accent-teal' 
                : 'hover:bg-white/5 text-white/40 hover:text-white'
            }`}
          >
            <Bell size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{language === 'en' ? 'Notifications' : 'Thông báo'}</span>
          </button>
          <button 
            onClick={() => setActiveSection('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              activeSection === 'security' 
                ? 'glass border-l-2 border-accent-teal text-accent-teal' 
                : 'hover:bg-white/5 text-white/40 hover:text-white'
            }`}
          >
            <Shield size={18} />
            <span className="text-xs font-bold uppercase tracking-widest">{language === 'en' ? 'Security' : 'Bảo mật'}</span>
          </button>
          {profile?.role === 'User' && (
            <button 
              onClick={() => setActiveSection('devices')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeSection === 'devices' 
                  ? 'glass border-l-2 border-accent-teal text-accent-teal' 
                  : 'hover:bg-white/5 text-white/40 hover:text-white'
              }`}
            >
              <Smartphone size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">{language === 'en' ? 'Devices' : 'Thiết bị'}</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="md:col-span-2 space-y-6">
          {activeSection === 'profile' && (
            <>
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass p-8 rounded-3xl space-y-6"
              >
                <h3 className="text-sm font-bold uppercase tracking-widest border-b border-white/5 pb-4 mb-6">
                  {language === 'en' ? 'Personal Information' : 'Thông tin cá nhân'}
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-2">
                      {language === 'en' ? 'Full Name' : 'Họ và tên'}
                    </label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl outline-none focus:border-accent-teal/50 transition-all text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-2">
                      {language === 'en' ? 'Email Address' : 'Địa chỉ Email'}
                    </label>
                    <input 
                      type="email" 
                      value={profile?.email || ''}
                      disabled
                      className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl outline-none text-white/50 text-sm cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold opacity-40 uppercase tracking-widest block mb-2">
                      {language === 'en' ? 'Tenant / Clinic ID' : 'Mã phòng khám'}
                    </label>
                    <input 
                      type="text" 
                      value={profile?.tenantId || ''}
                      disabled
                      className="w-full px-4 py-3 bg-black/20 border border-white/5 rounded-xl outline-none text-white/50 text-sm cursor-not-allowed"
                    />
                    <p className="text-[10px] text-white/30 mt-2 italic">
                      {language === 'en' ? 'To change your tenant ID, please contact the administrator.' : 'Để đổi tổ chức, vui lòng liên hệ quản trị viên.'}
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSave}
                  disabled={loading}
                  className="px-8 py-3 bg-accent-teal text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-105 transition-all text-xs uppercase tracking-widest shadow-lg shadow-accent-teal/20"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save size={16} />
                  )}
                  {language === 'en' ? 'Save Changes' : 'Lưu thay đổi'}
                </button>
              </div>
            </>
          )}

          {activeSection === 'notifications' && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="glass p-8 rounded-3xl space-y-6"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest border-b border-white/5 pb-4 mb-6">
                {language === 'en' ? 'Notification Preferences' : 'Cài đặt thông báo'}
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold">{language === 'en' ? 'Push Notifications' : 'Thông báo đẩy'}</h4>
                  <p className="text-[10px] opacity-40 uppercase mt-1">
                    {language === 'en' ? 'Receive alerts for critical updates' : 'Nhận cảnh báo quan trọng'}
                  </p>
                </div>
                <button 
                  onClick={() => setNotifications(!notifications)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-accent-teal' : 'bg-white/10'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform ${notifications ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-xs font-bold">{language === 'en' ? 'Email Digest' : 'Tóm tắt qua Email'}</h4>
                  <p className="text-[10px] opacity-40 uppercase mt-1">
                    {language === 'en' ? 'Weekly summary of health activities' : 'Bản tóm tắt hoạt động sức khỏe hàng tuần'}
                  </p>
                </div>
                <button 
                  onClick={() => {}}
                  className={`w-12 h-6 rounded-full transition-colors relative bg-white/10`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-transform left-1`} />
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'security' && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="glass p-8 rounded-3xl space-y-6"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest border-b border-white/5 pb-4 mb-6">
                {language === 'en' ? 'Security Options' : 'Tùy chọn bảo mật'}
              </h3>

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold">{language === 'en' ? 'Two-Factor Authentication' : 'Xác thực hai yếu tố'}</h4>
                  <p className="text-[10px] opacity-40 uppercase mt-1">
                    {language === 'en' ? 'Add an extra layer of security' : 'Thêm một lớp bảo mật bổ sung'}
                  </p>
                </div>
                <button 
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  {language === 'en' ? 'Enable' : 'Kích hoạt'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-xs font-bold">{language === 'en' ? 'Change Password' : 'Đổi mật khẩu'}</h4>
                  <p className="text-[10px] opacity-40 uppercase mt-1">
                    {language === 'en' ? 'Update your account password' : 'Cập nhật mật khẩu tài khoản'}
                  </p>
                </div>
                <button 
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  {language === 'en' ? 'Update' : 'Cập nhật'}
                </button>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div>
                  <h4 className="text-xs font-bold text-rose-500">{language === 'en' ? 'Danger Zone' : 'Khu vực nguy hiểm'}</h4>
                  <p className="text-[10px] opacity-40 uppercase mt-1">
                    {language === 'en' ? 'Reset account data & settings' : 'Xóa toàn bộ dữ liệu hiện tại'}
                  </p>
                </div>
                <button 
                   onClick={() => alert('Feature coming soon')}
                   className="px-4 py-2 border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all"
                >
                  {language === 'en' ? 'Reset Data' : 'Xóa Dữ Liệu'}
                </button>
              </div>
            </motion.div>
          )}

          {activeSection === 'devices' && (
            <motion.div 
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="glass p-8 rounded-3xl space-y-6"
            >
              <h3 className="text-sm font-bold uppercase tracking-widest border-b border-white/5 pb-4 mb-6">
                {language === 'en' ? 'Active Devices' : 'Thiết bị hoạt động'}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-accent-teal/10 text-accent-teal rounded-xl flex items-center justify-center">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">iPhone 14 Pro</h4>
                      <p className="text-[10px] opacity-40 uppercase mt-1">
                        {language === 'en' ? 'Last active: Just now' : 'Hoạt động cuối: Vừa xong'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-accent-teal">{language === 'en' ? 'Current Device' : 'Thiết bị hiện tại'}</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 opacity-60">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                      <User size={20} />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold">MacBook Pro</h4>
                      <p className="text-[10px] opacity-40 uppercase mt-1">
                        {language === 'en' ? 'Last active: 2 days ago' : 'Hoạt động cuối: 2 ngày trước'}
                      </p>
                    </div>
                  </div>
                  <button className="text-[10px] font-bold uppercase text-rose-500 hover:text-rose-400">
                    {language === 'en' ? 'Revoke Access' : 'Thu hồi quyền truy cập'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;
