import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, LayoutDashboard, ClipboardCheck, ListTodo, Settings, Moon, Sun } from 'lucide-react';
import { signOut, auth } from '../lib/firebase';
import { cn } from '../lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  activeView: string;
  onViewChange: (view: string) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeView, 
  onViewChange, 
  isDarkMode, 
  toggleDarkMode 
}) => {
  const { user, logout } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'attendance', label: 'Frequência', icon: ClipboardCheck },
    { id: 'activities', label: 'Atividades', icon: ListTodo },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className={cn("min-h-screen flex flex-col", isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm backdrop-blur-md transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto px-4 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex flex-col">
              <h1 className="text-lg font-bold tracking-tight text-blue-600 dark:text-blue-400 leading-none">CADERNETA ON</h1>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-black mt-1">Professor</span>
            </div>

            <nav className="hidden md:flex items-center gap-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all duration-200",
                    activeView === item.id
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <item.icon size={16} />
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden lg:flex flex-col items-end mr-4">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">Sincronizado</span>
              </div>
            </div>

            <button
              onClick={toggleDarkMode}
              className="p-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-2" />

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-xs font-bold truncate leading-none mb-1">{user?.displayName || 'Professor'}</p>
                <button
                  onClick={logout}
                  className="text-[9px] text-red-500 hover:text-red-600 font-black flex items-center gap-1 uppercase tracking-tighter"
                >
                  <LogOut size={10} /> Sair
                </button>
              </div>
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-black text-sm border-2 border-blue-600/20">
                {user?.displayName?.charAt(0) || '?'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Secondary Mobile Nav */}
      <nav className="md:hidden flex items-center justify-around bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold transition-all",
              activeView === item.id
                ? "text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-500"
            )}
          >
            <item.icon size={16} />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
