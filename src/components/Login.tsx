import React, { useState } from 'react';
import { signInWithPopup, googleProvider, auth } from '../lib/firebase';
import { LogIn, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      setError("Falha ao entrar com Google. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center mb-10">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <ShieldCheck size={32} className="text-white" />
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-2">CADERNETA ON</h1>
          <p className="text-slate-400 text-sm">Gestão Escolar Inteligente & Dinâmica</p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-white text-slate-950 hover:bg-slate-200 transition-all duration-300 font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <LogIn size={20} className="group-hover:translate-x-1 transition-transform" />
          {loading ? 'Conectando...' : 'Entrar com Google'}
        </button>

        {error && (
          <p className="mt-4 text-center text-red-400 text-xs font-semibold">{error}</p>
        )}

        <div className="mt-8 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold">
            Exclusivo para Professores & Staff
          </p>
        </div>
      </motion.div>
    </div>
  );
};
