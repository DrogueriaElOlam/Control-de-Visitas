import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import LoginModal from './components/LoginModal';
import AdminDashboard from './components/AdminDashboard';
import AdminVendorManagement from './components/AdminVendorManagement';
import VendorAnalytics from './components/VendorAnalytics';
import VisitRegistration from './components/VisitRegistration';
import VisitsListAndFilters from './components/VisitsListAndFilters';
import InteractiveMapModal from './components/InteractiveMapModal';
import ExportModal from './components/ExportModal';
import DailyGoalWidget from './components/DailyGoalWidget';
import VendorReportModal from './components/VendorReportModal';

import { 
  getSavedSession, 
  clearSession, 
  getVendorsList, 
  getVisitsList,
  syncPendingVisits
} from './lib/db';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [targetMapVisit, setTargetMapVisit] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);

  const [vendors, setVendors] = useState([]);
  const [visits, setVisits] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Initialize session and theme
  useEffect(() => {
    const saved = getSavedSession();
    if (saved) {
      setCurrentUser(saved);
      setActiveTab(saved.role === 'admin' ? 'dashboard' : 'register');
    }

    const savedTheme = localStorage.getItem('olam_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setDarkMode(true);
    }

    loadInitialData();

    // Auto retry sync whenever internet connection is restored
    const handleOnline = () => {
      syncPendingVisits().then(() => loadInitialData());
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  // Theme switch effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('olam_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('olam_theme', 'light');
    }
  }, [darkMode]);

  async function loadInitialData() {
    try {
      // Sync any offline/retry visits first
      await syncPendingVisits();
      
      const [vList, viList] = await Promise.all([
        getVendorsList(),
        getVisitsList()
      ]);
      setVendors(vList);
      setVisits(viList);
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoadingInitial(false);
    }
  }

  // Login handler
  const handleLoginSuccess = (session) => {
    setCurrentUser(session);
    setActiveTab(session.role === 'admin' ? 'dashboard' : 'register');
    loadInitialData();
  };

  // Logout handler
  const handleLogout = () => {
    clearSession();
    setCurrentUser(null);
  };

  // When a visit is added
  const handleVisitAdded = (newVisit) => {
    setVisits(prev => [newVisit, ...prev]);
  };

  // When vendors are updated
  const handleVendorUpdated = async () => {
    const updated = await getVendorsList();
    setVendors(updated);
  };

  // When clicking "Ver GPS" on a visit
  const handleOpenMapLocation = (visit) => {
    setTargetMapVisit(visit);
    setActiveTab('map');
  };

  // If not logged in, show Login
  if (!currentUser) {
    return <LoginModal onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        onOpenReportModal={() => setShowReportModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-24 md:pb-8">
        
        {/* ADMIN VIEWS */}
        {currentUser.role === 'admin' && (
          <>
            {activeTab === 'dashboard' && (
              <AdminDashboard
                vendors={vendors}
                visits={visits}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'vendors' && (
              <AdminVendorManagement
                onVendorUpdated={handleVendorUpdated}
              />
            )}

            {activeTab === 'frequency' && (
              <VendorAnalytics
                vendors={vendors}
                visits={visits}
              />
            )}

            {activeTab === 'visits' && (
              <VisitsListAndFilters
                visits={visits}
                currentUser={currentUser}
                onVisitsChange={loadInitialData}
                onOpenMapLocation={handleOpenMapLocation}
                onOpenReportModal={() => setShowReportModal(true)}
              />
            )}

            {activeTab === 'map' && (
              <InteractiveMapModal
                visits={visits}
                targetVisit={targetMapVisit}
                currentUser={currentUser}
              />
            )}

            {activeTab === 'export' && (
              <ExportModal
                visits={visits}
                vendors={vendors}
              />
            )}
          </>
        )}

        {/* VENDOR VIEWS */}
        {currentUser.role === 'vendor' && (
          <>
            {activeTab === 'register' && (
              <VisitRegistration
                currentUser={currentUser}
                onVisitAdded={handleVisitAdded}
                allVisits={visits}
              />
            )}

            {activeTab === 'my_visits' && (
              <VisitsListAndFilters
                visits={visits}
                currentUser={currentUser}
                onVisitsChange={loadInitialData}
                onOpenMapLocation={handleOpenMapLocation}
                onOpenReportModal={() => setShowReportModal(true)}
              />
            )}

            {activeTab === 'my_goal' && (
              <DailyGoalWidget
                currentUser={currentUser}
                visits={visits}
                onOpenReportModal={() => setShowReportModal(true)}
              />
            )}
          </>
        )}

      </main>

      {/* Official Vendor & Admin Report Modal */}
      <VendorReportModal
        isOpen={showReportModal || activeTab === 'report'}
        onClose={() => {
          setShowReportModal(false);
          if (activeTab === 'report') {
            setActiveTab(currentUser?.role === 'admin' ? 'dashboard' : 'my_visits');
          }
        }}
        currentUser={currentUser}
        visits={visits}
        vendors={vendors}
        onVisitAdded={handleVisitAdded}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-4 mb-16 md:mb-0 text-center text-xs text-slate-400">
        <p>© 2026 Droguería El Olam • Sistema de Control y Rendimiento de Visitas Diarias</p>
      </footer>

    </div>
  );
}
