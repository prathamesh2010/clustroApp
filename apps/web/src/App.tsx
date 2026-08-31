import React, { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Navbar } from './components/layout/Navbar';
import { LandingPage } from './pages/LandingPage';
import { HomeScreen } from './pages/HomeScreen';
import { ClusterScreen } from './pages/ClusterScreen';
import { ProfileModal } from './components/profile/ProfileModal';
import { NotificationsDrawer } from './components/notifications/NotificationsDrawer';
import { Loader2 } from 'lucide-react';

export default function App() {
  const { user, loading } = useAuth();
  const [activeClusterId, setActiveClusterId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-700 mx-auto" />
          <p className="font-display text-lg font-bold text-slate-700">Loading Clustro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <Navbar
        onOpenNotifications={() => setShowNotifications(true)}
        onOpenProfile={() => setShowProfile(true)}
      />

      {/* Main View */}
      <main className="flex-1">
        {activeClusterId ? (
          <ClusterScreen
            clusterId={activeClusterId}
            onBack={() => setActiveClusterId(null)}
          />
        ) : (
          <HomeScreen
            onOpenCluster={(id) => setActiveClusterId(id)}
          />
        )}
      </main>

      {/* Global Modals */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
      {showNotifications && <NotificationsDrawer onClose={() => setShowNotifications(false)} />}
    </div>
  );
}
