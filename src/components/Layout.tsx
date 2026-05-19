
import React from 'react';
import { 
  BarChart3, 
  Users, 
  Settings, 
  LayoutDashboard, 
  Bell, 
  LogOut, 
  Activity, 
  MessageSquare, 
  Stethoscope,
  Globe,
  Bot
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'motion/react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: 'en' | 'vi';
  setLanguage: (lang: 'en' | 'vi') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, language, setLanguage }) => {
  const { profile, signOut, isAdmin, isPro, isPatient } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: language === 'en' ? 'Dashboard' : 'Bảng điều khiển', roles: ['PlatformAdmin', 'Professional', 'User'] },
    { id: 'admin-ai', icon: Bot, label: language === 'en' ? 'AI Assistant' : 'Trợ lý AI', roles: ['PlatformAdmin'] },
    { id: 'accounts', icon: Users, label: language === 'en' ? 'Accounts' : 'Tài khoản', roles: ['PlatformAdmin'] },
    { id: 'patients', icon: Users, label: language === 'en' ? 'Patients' : 'Bệnh nhân', roles: ['Professional'] },
    { id: 'health', icon: Activity, label: language === 'en' ? 'My Health' : 'Sức khỏe của tôi', roles: ['User'] },
    { id: 'feedback', icon: MessageSquare, label: language === 'en' ? 'Feedback' : 'Phản hồi', roles: ['Professional', 'User'] },
    { id: 'tenants', icon: Globe, label: language === 'en' ? 'Tenants' : 'Tổ chức', roles: ['PlatformAdmin'] },
    { id: 'alerts', icon: Bell, label: language === 'en' ? 'Alerts' : 'Cảnh báo', roles: ['Professional'] },
    { id: 'chat', icon: Bot, label: language === 'en' ? 'Assistant' : 'Trợ lý AI', roles: ['User'] },
    { id: 'settings', icon: Settings, label: language === 'en' ? 'Settings' : 'Cài đặt', roles: ['PlatformAdmin', 'Professional', 'User'] },
  ];

  const filteredMenu = menuItems.filter(item => profile && item.roles.includes(profile.role));

  return (
    <div className="flex h-screen bg-dark-bg text-[#e5e5e5] overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside 
        initial={{ x: -250 }}
        animate={{ x: 0 }}
        className="w-64 glass hidden md:flex flex-col border-r-0 z-20"
      >
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 bg-accent-teal rounded-lg flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(20,184,166,0.3)]">
              <Stethoscope size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight uppercase">HealthChain <span className="font-light opacity-50">SaaS</span></h1>
          </div>

          <nav className="space-y-1">
            {filteredMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-6 py-3 transition-all text-xs uppercase tracking-widest ${
                  activeTab === item.id 
                    ? 'sidebar-link-active' 
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                <item.icon size={16} />
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-20 glass px-4 md:px-8 flex items-center justify-between sticky top-0 z-10 border-t-0 border-l-0 border-r-0 bg-dark-bg/80 backdrop-blur-xl">
          <div className="flex items-center gap-3">
             <div className="md:hidden w-8 h-8 bg-accent-teal rounded-lg flex items-center justify-center font-bold text-black shadow-[0_0_15px_rgba(20,184,166,0.3)]">
               <Stethoscope size={18} />
             </div>
             <h1 className="text-sm uppercase tracking-[0.2em] font-bold opacity-80 hidden md:block">
               {menuItems.find(i => i.id === activeTab)?.label}
             </h1>
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent-teal/10 border border-accent-teal/20">
              <div className="w-1.5 h-1.5 rounded-full bg-accent-teal animate-pulse"></div>
              <span className="text-[10px] font-bold text-accent-teal uppercase tracking-widest">{language === 'en' ? 'System Normal' : 'Hệ thống ổn định'}</span>
            </div>

            <button 
               onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
               className="flex items-center gap-2 px-3 py-1.5 text-white/60 hover:text-white hover:bg-white/5 rounded-full transition-colors border border-transparent hover:border-white/10"
            >
              <Globe size={16} />
              <span className="text-xs font-bold uppercase tracking-widest hidden sm:block">{language === 'en' ? 'ENG' : 'VIE'}</span>
            </button>

            <button className="p-2 text-white/60 hover:text-white hover:bg-white/5 rounded-full relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-dark-bg"></span>
            </button>

            <div className="w-px h-8 bg-white/10 hidden md:block"></div>

            <div className="flex items-center gap-3">
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-white leading-none">{profile?.name}</p>
                <p className="text-[10px] opacity-50 uppercase tracking-widest mt-1">{profile?.role}</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-teal-500/20 to-blue-600/20 border border-white/10 overflow-hidden shrink-0 shadow-sm relative">
                <img src={profile?.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile?.uid}`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <button 
                 onClick={signOut}
                 className="p-2 text-rose-500/70 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-colors ml-1"
                 title={language === 'en' ? 'Logout' : 'Đăng xuất'}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar pb-24 md:pb-8" id="scroll-container">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-white/5 z-50 px-2 pt-2" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
        <div className="flex items-center justify-around">
          {filteredMenu.map(item => (
             <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`p-2 flex flex-col items-center gap-1.5 rounded-xl transition-all ${
                  activeTab === item.id 
                    ? 'text-accent-teal' 
                    : 'text-white/40'
                }`}
             >
               <item.icon size={20} />
               <span className="text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">{item.label}</span>
             </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Layout;
