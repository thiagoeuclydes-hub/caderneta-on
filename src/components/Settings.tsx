import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, GraduationCap, Users, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

import { handleFirestoreError, OperationType } from '../lib/error-handler';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [newSerie, setNewSerie] = useState('');
  const [newClassName, setNewClassName] = useState('');
  const [studentList, setStudentList] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const qClasses = query(collection(db, 'classes'), where('ownerId', '==', user.uid));
    const unsubClasses = onSnapshot(qClasses, (snapshot) => {
      setClasses(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));

    const qStudents = query(collection(db, 'students'), where('ownerId', '==', user.uid));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      setStudents(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'students'));

    return () => {
      unsubClasses();
      unsubStudents();
    };
  }, [user]);

  const handleCreateClass = async () => {
    if (!newSerie || !newClassName || !user) return;
    setLoading(true);
    try {
      await addDoc(collection(db, 'classes'), {
        serie: newSerie,
        name: newClassName,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewSerie('');
      setNewClassName('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'classes');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudents = async () => {
    if (!studentList || !selectedClassId || !user) return;
    setLoading(true);
    const names = studentList.split('\n').map(n => n.trim()).filter(n => n.length > 0);
    try {
      for (const name of names) {
        await addDoc(collection(db, 'students'), {
          name,
          classId: selectedClassId,
          ownerId: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setStudentList('');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'students');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este aluno?')) {
      try {
        await deleteDoc(doc(db, 'students', id));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'students');
      }
    }
  };

  const handleDeleteClass = async (id: string) => {
    if (confirm('Atenção: Isso excluirá a turma e TODOS os alunos vinculados. Continuar?')) {
      try {
        // Delete students first
        const q = query(collection(db, 'students'), where('classId', '==', id));
        const snap = await getDocs(q);
        for (const d of snap.docs) {
          await deleteDoc(d.ref);
        }
        // Delete class
        await deleteDoc(doc(db, 'classes', id));
        if (selectedClassId === id) setSelectedClassId('');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'classes/students');
      }
    }
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-bold tracking-tight">Gestão de Turmas & Alunos</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Configure suas classes e matricule seus alunos.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* New Class Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <GraduationCap size={20} />
            </div>
            <h3 className="font-bold">Nova Turma</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Série</label>
                <input
                  type="text"
                  placeholder="Ex: 1ª Série"
                  value={newSerie}
                  onChange={(e) => setNewSerie(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Nome da Turma</label>
                <input
                  type="text"
                  placeholder="Ex: Turma A"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
            </div>
            <button
              onClick={handleCreateClass}
              disabled={loading || !newSerie || !newClassName}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Plus size={18} /> Criar Turma
            </button>
          </div>
        </div>

        {/* Enrollment Card */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg">
              <UserPlus size={20} />
            </div>
            <h3 className="font-bold">Matricular Alunos</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Selecionar Turma</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              >
                <option value="">Selecione uma turma...</option>
                {classes.sort((a, b) => a.serie.localeCompare(b.serie)).map(c => (
                  <option key={c.id} value={c.id}>{c.serie} - {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Nomes dos Alunos (Um por linha)</label>
              <textarea
                rows={3}
                placeholder="Cole a lista de nomes aqui..."
                value={studentList}
                onChange={(e) => setStudentList(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none"
              />
            </div>
            <button
              onClick={handleAddStudents}
              disabled={loading || !studentList || !selectedClassId}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Users size={18} /> Confirmar Matrícula
            </button>
          </div>
        </div>
      </div>

      {/* Classes List */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold">Turmas Ativas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <AnimatePresence>
            {classes.map(c => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-tighter text-blue-600 dark:text-blue-400">{c.serie}</p>
                    <h4 className="font-bold text-sm">{c.name}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteClass(c.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {students.filter(s => s.classId === c.id).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                      <div key={s.id} className="flex justify-between items-center group">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{s.name}</span>
                        <button
                          onClick={() => handleDeleteStudent(s.id)}
                          className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {students.filter(s => s.classId === c.id).length === 0 && (
                      <p className="text-xs text-slate-400 italic py-2 text-center">Nenhum aluno matriculado.</p>
                    )}
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/50 p-2 text-center border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-bold text-slate-400">TOTAL: {students.filter(s => s.classId === c.id).length} ALUNOS</p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
