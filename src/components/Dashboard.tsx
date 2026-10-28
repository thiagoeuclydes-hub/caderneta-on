import { GraduationCap, Users, ClipboardCheck, ListTodo, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardProps {
  onNavigate: (view: string) => void;
  onRefresh: () => Promise<void>;
  stats: {
    classesCount: number;
    studentsCount: number;
    attendanceToday: number;
    activitiesToday: number;
  };
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, stats, onRefresh }) => {
  const { user } = useAuth();
  const [refreshing, setRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 500);
  };

  const cards = [
    { id: 'settings', title: 'Turmas', count: stats.classesCount, icon: GraduationCap, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 'settings', title: 'Alunos', count: stats.studentsCount, icon: Users, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { id: 'attendance', title: 'Presenças Hoje', count: stats.attendanceToday, icon: ClipboardCheck, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { id: 'activities', title: 'Atividades', count: stats.activitiesToday, icon: ListTodo, color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-3xl font-extrabold tracking-tight">
            Olá, <span className="text-blue-600 dark:text-blue-400">{user?.displayName?.split(' ')[0] || 'Professor'}</span>
          </h2>
          <p className="text-slate-500 dark:text-slate-400">Aqui está o resumo das suas atividades escolares.</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "Atualizando..." : "Atualizar Resumo"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {cards.map((card, idx) => (
          <motion.button
            key={card.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            onClick={() => onNavigate(card.id)}
            className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-300 text-left group"
          >
            <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <card.icon size={24} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-1">{card.title}</p>
            <h3 className="text-4xl font-black tabular-nums">{card.count}</h3>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <h3 className="text-lg font-bold mb-6">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => onNavigate('attendance')}
              className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
            >
              <h4 className="font-bold mb-1">Registrar Frequência</h4>
              <p className="text-xs text-slate-500">Chamada em tempo real</p>
            </button>
            <button 
              onClick={() => onNavigate('activities')}
              className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left"
            >
              <h4 className="font-bold mb-1">Lançar Atividades</h4>
              <p className="text-xs text-slate-500">Tarefas e trabalhos</p>
            </button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white shadow-xl shadow-blue-500/20 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Novo Bimestre</h3>
            <p className="text-blue-100 text-sm leading-relaxed">Não esqueça de selecionar o bimestre correto no topo da página de frequência ou atividades.</p>
          </div>
          <div className="pt-6">
            <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
              <div className="w-1/4 h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
            </div>
            <p className="text-[10px] font-bold uppercase mt-2 tracking-widest opacity-80">Progressão do Ano Letivo</p>
          </div>
        </div>
      </div>
    </div>
  );
};
