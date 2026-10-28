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
  const { user } = useAuth();

  const menuItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard },
    { id: 'attendance', label: 'Frequência', icon: ClipboardCheck },
    { id: 'activities', label: 'Atividades', icon: ListTodo },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className={cn("min-h-screen flex", isDarkMode ? "dark bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900")}>
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 shadow-sm transition-colors duration-300">
        <div className="p-6">
          <h1 className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">CADERNETA ON</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 uppercase tracking-widest font-semibold">Painel de Controle</p>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                activeView === item.id
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <button
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
          >
            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            {isDarkMode ? 'Modo Claro' : 'Modo Escuro'}
          </button>

          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold text-xs">
              {user?.displayName?.charAt(0) || user?.email?.charAt(0) || '?'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold truncate">{user?.displayName || 'Professor'}</p>
              <button
                onClick={() => signOut(auth)}
                className="text-[10px] text-red-500 hover:text-red-600 font-bold flex items-center gap-1 uppercase tracking-tighter"
              >
                <LogOut size={10} /> Sair
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex items-center px-8 justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">Sincronizado em tempo real</span>
          </div>
          <div className="text-xs font-medium text-slate-400 dark:text-slate-500">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </header>
        
        <div className="flex-1 overflow-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
