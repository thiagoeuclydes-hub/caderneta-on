import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { AttendanceView } from './components/Attendance';
import { ActivitiesView } from './components/Activities';
import { SettingsView } from './components/Settings';
import { collection, query, where, onSnapshot, getCountFromServer } from 'firebase/firestore';
import { db } from './lib/firebase';
import { format } from 'date-fns';
import { handleFirestoreError, OperationType } from './lib/error-handler';

const AppContent: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [activeView, setActiveView] = useState('dashboard');
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [stats, setStats] = useState({
    classesCount: 0,
    studentsCount: 0,
    attendanceToday: 0,
    activitiesToday: 0
  });

  useEffect(() => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    const updateStats = async () => {
      try {
        const qClasses = query(collection(db, 'classes'), where('ownerId', '==', user.uid));
        const qStudents = query(collection(db, 'students'), where('ownerId', '==', user.uid));
        const qAttendance = query(collection(db, 'attendance'), where('ownerId', '==', user.uid), where('date', '==', today), where('status', '==', 'P'));
        const qActivities = query(collection(db, 'activities'), where('ownerId', '==', user.uid), where('date', '==', today));

        const [classesSnap, studentsSnap, attendanceSnap, activitiesSnap] = await Promise.all([
          getCountFromServer(qClasses),
          getCountFromServer(qStudents),
          getCountFromServer(qAttendance),
          getCountFromServer(qActivities)
        ]);

        setStats({
          classesCount: classesSnap.data().count,
          studentsCount: studentsSnap.data().count,
          attendanceToday: attendanceSnap.data().count,
          activitiesToday: activitiesSnap.data().count
        });
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    updateStats();
    
    // REDUCED QUOTA USAGE: Removed global real-time listeners from the dashboard.
    // Real-time updates remain active inside specific functional views (Attendance, Activities).
  }, [user]);

  const refreshStats = async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    try {
      const qClasses = query(collection(db, 'classes'), where('ownerId', '==', user.uid));
      const qStudents = query(collection(db, 'students'), where('ownerId', '==', user.uid));
      const qAttendance = query(collection(db, 'attendance'), where('ownerId', '==', user.uid), where('date', '==', today), where('status', '==', 'P'));
      const qActivities = query(collection(db, 'activities'), where('ownerId', '==', user.uid), where('date', '==', today));

      const [classesSnap, studentsSnap, attendanceSnap, activitiesSnap] = await Promise.all([
        getCountFromServer(qClasses),
        getCountFromServer(qStudents),
        getCountFromServer(qAttendance),
        getCountFromServer(qActivities)
      ]);

      setStats({
        classesCount: classesSnap.data().count,
        studentsCount: studentsSnap.data().count,
        attendanceToday: attendanceSnap.data().count,
        activitiesToday: activitiesSnap.data().count
      });
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={setActiveView} stats={stats} onRefresh={refreshStats} />;
      case 'attendance':
        return <AttendanceView />;
      case 'activities':
        return <ActivitiesView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <Dashboard onNavigate={setActiveView} stats={stats} onRefresh={refreshStats} />;
    }
  };

  return (
    <Layout 
      activeView={activeView} 
      onViewChange={setActiveView}
      isDarkMode={isDarkMode}
      toggleDarkMode={() => setIsDarkMode(!isDarkMode)}
    >
      {renderView()}
    </Layout>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
