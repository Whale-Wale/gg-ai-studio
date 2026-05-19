
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './views/Login';
import AdminDashboard from './views/AdminDashboard';
import ProDashboard from './views/ProDashboard';
import UserDashboard from './views/UserDashboard';
import PatientDetail from './views/PatientDetail';
import Settings from './views/Settings';
import UserManagement from './views/UserManagement';
import AdminAIAssistant from './views/AdminAIAssistant';
import Feedback from './views/Feedback';
import { useTestCleanup } from './hooks/useTestCleanup';

const AppContent = () => {
  const { user, profile, loading } = useAuth();
  useTestCleanup();
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState<'en' | 'vi'>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved === 'en' || saved === 'vi') ? saved : 'vi';
  });

  const handleSetLanguage = (lang: 'en' | 'vi') => {
    setLanguage(lang);
    localStorage.setItem('app-language', lang);
  };

  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'settings') return;
    const timeout = setTimeout(() => {
      const el = document.getElementById(activeTab);
      if (el) {
        // Adjust for sticky headers if any, or just scroll to center/start
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
    return () => clearTimeout(timeout);
  }, [activeTab]);

  if (loading) return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-12 h-12 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Login language={language} setLanguage={handleSetLanguage} />;

  const renderContent = () => {
    if (!profile) return null;

    // Direct overrides for detail views
    if (profile.role === 'Professional' && selectedPatientId) {
      return <PatientDetail 
        patientId={selectedPatientId} 
        onBack={() => setSelectedPatientId(null)} 
        language={language} 
      />;
    }

    switch (activeTab) {
      case 'dashboard':
        if (profile.role === 'PlatformAdmin') return <AdminDashboard language={language} activeTab={activeTab} />;
        if (profile.role === 'Professional') return <ProDashboard language={language} onSelectPatient={setSelectedPatientId} />;
        return <UserDashboard language={language} activeTab={activeTab} />;
      
      case 'patients':
        if (profile.role === 'Professional' || profile.role === 'PlatformAdmin') 
          return <ProDashboard language={language} onSelectPatient={setSelectedPatientId} />;
        return <UserDashboard language={language} activeTab={activeTab} />;

      case 'health':
        return <UserDashboard language={language} activeTab={activeTab} />;

      case 'feedback':
        if (profile.role === 'Professional' || profile.role === 'User') return <Feedback language={language} />;
        return <Navigate to="/" replace />;

      case 'accounts':
        if (profile.role === 'PlatformAdmin') return <UserManagement language={language} />;
        return <Navigate to="/" replace />;

      case 'admin-ai':
        if (profile.role === 'PlatformAdmin') return <AdminAIAssistant language={language} />;
        return <Navigate to="/" replace />;

      case 'tenants':
        if (profile.role === 'PlatformAdmin') return <AdminDashboard language={language} activeTab={activeTab} />;
        return <Navigate to="/" replace />;

      case 'alerts':
        if (profile.role === 'Professional') return <ProDashboard language={language} onSelectPatient={setSelectedPatientId} />;
        return <UserDashboard language={language} activeTab={activeTab} />;

      case 'chat':
        return <UserDashboard language={language} activeTab={activeTab} />;

      case 'settings':
        return <Settings language={language} />;

      default:
        return <UserDashboard language={language} activeTab={activeTab} />;
    }
  };

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={(tab) => {
        setActiveTab(tab);
        setSelectedPatientId(null); // Reset detail view when switching tabs
      }} 
      language={language} 
      setLanguage={handleSetLanguage}
    >
      <Routes>
        <Route path="/" element={renderContent()} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
