import React, { useState } from 'react';
import { GraduationCap, ShieldCheck, User, Lock, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    setError(null);
    
    // Slight delay for "pro" feel
    setTimeout(() => {
      const success = login(username, password);
      if (!success) {
        setError("Usuário ou senha incorretos.");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-10 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-12">
          <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center mb-8 shadow-2xl shadow-blue-500/40 transform rotate-3 hover:rotate-0 transition-transform duration-300">
            <GraduationCap size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-2 italic">CADERNETA ON</h1>
          <p className="text-slate-400 text-sm font-medium tracking-wide uppercase">Acesso Restrito ao Professor</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-2">Identificação</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="text"
                placeholder="Usuário"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-600 outline-none transition-all hover:bg-white/10"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 pl-2">Chave de Acesso</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              <input
                type="password"
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder:text-slate-600 focus:ring-2 focus:ring-blue-600 outline-none transition-all hover:bg-white/10"
                required
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold"
            >
              <AlertTriangle size={16} className="shrink-0" />
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-slate-950 hover:bg-blue-50 transition-all duration-300 font-black py-4 rounded-2xl shadow-xl shadow-white/5 disabled:opacity-50 disabled:cursor-not-allowed group mt-4 overflow-hidden relative"
          >
            <span className="relative z-10">{loading ? 'Verificando...' : 'Entrar no Sistema'}</span>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 group-hover:opacity-10 transition-opacity" />
          </button>
        </form>

        <div className="mt-12 pt-8 border-t border-white/5 text-center flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full">
            <ShieldCheck size={12} className="text-emerald-500" />
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Ambiente Seguro</span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed max-w-[200px] font-medium">
            Sistema otimizado para acesso único e pessoal.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
