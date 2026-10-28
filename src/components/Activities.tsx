import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, Check, X, Minus, AlertCircle, Plus } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { handleFirestoreError, OperationType } from '../lib/error-handler';

export const ActivitiesView: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('1º');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [newActivityDesc, setNewActivityDesc] = useState('');

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'classes'), where('ownerId', '==', user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setClasses(data);
      if (data.length > 0 && !selectedClassId) setSelectedClassId(data[0].id);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!selectedClassId || !user) return;
    const qS = query(collection(db, 'students'), where('classId', '==', selectedClassId));
    const unsubS = onSnapshot(qS, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.name.localeCompare(b.name)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `students (classId: ${selectedClassId})`));

    const qA = query(collection(db, 'activities'), where('classId', '==', selectedClassId), where('bimester', '==', selectedBimester));
    const unsubA = onSnapshot(qA, (snap) => {
      setActivities(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `activities (classId: ${selectedClassId}, bimester: ${selectedBimester})`));

    return () => {
      unsubS();
      unsubA();
    };
  }, [selectedClassId, selectedBimester, user]);

  const toggleActivityStatus = async (studentId: string, date: string, desc: string) => {
    if (!user || !selectedClassId) return;
    
    const existing = activities.find(a => a.studentId === studentId && a.date === date && a.description === desc);
    const path = 'activities';
    
    const statuses = ['', 'FEZ', 'NÃO FEZ', 'INCOMPLETO'];
    let nextStatus = 'FEZ';
    
    try {
      if (existing) {
        const currentIdx = statuses.indexOf(existing.status);
        nextStatus = statuses[(currentIdx + 1) % statuses.length];

        if (nextStatus === '') {
          await deleteDoc(doc(db, 'activities', existing.id));
        } else {
          await updateDoc(doc(db, 'activities', existing.id), {
            status: nextStatus,
            updatedAt: serverTimestamp()
          });
        }
      } else {
        await addDoc(collection(db, 'activities'), {
          studentId,
          classId: selectedClassId,
          date,
          description: desc,
          status: 'FEZ',
          bimester: selectedBimester,
          ownerId: user.uid,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, existing ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const bimesters = ['1º', '2º', '3º', '4º'];

  const activeColumns = Array.from(new Set(activities.map(a => `${a.date}|${a.description}`))).sort();
  const currentKey = `${selectedDate}|${newActivityDesc}`;
  
  const addColumn = () => {
    if (!newActivityDesc || !selectedDate) return;
    // Just force the current selection into the active columns visually if it has any data
    // The matrix already shows columns that have at least one record
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Controle de Atividades</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Lançamento de tarefas, trabalhos e avaliações.</p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit shadow-inner">
          {bimesters.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBimester(b)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                selectedBimester === b 
                  ? "bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {b} BIM
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Turma</label>
              <select
                value={selectedClassId}
                onChange={(e) => setSelectedClassId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none"
              >
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.serie} - {c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Data da Atividade</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Descrição / Ref.</label>
              <input
                type="text"
                placeholder="Ex: Pag. 115 ou Trabalho 1"
                value={newActivityDesc}
                onChange={(e) => setNewActivityDesc(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none"
              />
            </div>

            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
              <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                <AlertCircle size={10} /> Dica
              </p>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-500 leading-tight">Ao digitar acima, você poderá clicar nos botões da tabela para lançar o status dessa atividade específica.</p>
            </div>
          </div>
        </div>

        {/* Matrix View */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50">
                  <th className="sticky left-0 bg-slate-50 dark:bg-slate-800/50 p-4 text-left border-r border-slate-200 dark:border-slate-800 min-w-[200px] z-20">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Alunos</span>
                  </th>
                  {/* Show active activity columns */}
                  {activeColumns.map(col => {
                    const [d, desc] = col.split('|');
                    return (
                      <th key={col} className="p-3 border-r border-slate-200 dark:border-slate-800 min-w-[100px]">
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{desc}</span>
                          <span className="text-xs font-black">{format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</span>
                        </div>
                      </th>
                    );
                  })}
                  {/* Current planned column if not in activeColumns */}
                  {newActivityDesc && !activeColumns.includes(currentKey) && (
                    <th className="p-3 border-r border-slate-200 dark:border-slate-800 min-w-[100px] bg-emerald-50/50 dark:bg-emerald-900/10">
                      <div className="flex flex-col items-center animate-pulse">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">{newActivityDesc}</span>
                        <span className="text-xs font-black">{format(new Date(selectedDate + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</span>
                      </div>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="sticky left-0 bg-white dark:bg-slate-900 p-4 border-r border-slate-200 dark:border-slate-800 font-medium text-sm z-10">
                      {student.name}
                    </td>
                    {activeColumns.map(col => {
                      const [d, desc] = col.split('|');
                      const record = activities.find(a => a.studentId === student.id && a.date === d && a.description === desc);
                      const status = record?.status || '';

                      return (
                        <td key={col} className="p-1 text-center border-r border-slate-100 dark:border-slate-800/50">
                          <button
                            onClick={() => toggleActivityStatus(student.id, d, desc)}
                            className={cn(
                              "w-full h-8 rounded-lg flex items-center justify-center transition-all border text-[10px] font-bold uppercase",
                              status === 'FEZ' ? "bg-emerald-500 border-emerald-600 text-white shadow-sm" :
                              status === 'NÃO FEZ' ? "bg-red-500 border-red-600 text-white shadow-sm" :
                              status === 'INCOMPLETO' ? "bg-amber-500 border-amber-600 text-white shadow-sm" :
                              "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-300"
                            )}
                          >
                            {status || <Minus size={14} />}
                          </button>
                        </td>
                      );
                    })}
                    {newActivityDesc && !activeColumns.includes(currentKey) && (
                      <td className="p-1 text-center border-r border-slate-100 dark:border-slate-800/50 bg-emerald-50/10 dark:bg-emerald-900/5">
                        <button
                          onClick={() => toggleActivityStatus(student.id, selectedDate, newActivityDesc)}
                          className="w-full h-8 rounded-lg flex items-center justify-center transition-all border bg-slate-50 dark:bg-slate-800 border-dashed border-emerald-300 dark:border-emerald-700 text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                        >
                          <Plus size={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Fez</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Não Fez</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-amber-500 rounded" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Incompleto</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pendente</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
