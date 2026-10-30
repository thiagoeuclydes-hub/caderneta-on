import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, Check, X, Minus, AlertCircle, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
      data.sort((a: any, b: any) => a.serie.localeCompare(b.serie) || a.name.localeCompare(b.name));
      setClasses(data);
      if (data.length > 0 && !selectedClassId) setSelectedClassId(data[0].id);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!selectedClassId || !user) return;
    const qS = query(
      collection(db, 'students'), 
      where('classId', '==', selectedClassId),
      where('ownerId', '==', user.uid)
    );
    const unsubS = onSnapshot(qS, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }) as any).sort((a: any, b: any) => a.name.localeCompare(b.name)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `students (classId: ${selectedClassId})`));

    const qA = query(
      collection(db, 'activities'), 
      where('classId', '==', selectedClassId), 
      where('bimester', '==', selectedBimester),
      where('ownerId', '==', user.uid)
    );
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

  const markAllColumn = async (date: string, desc: string) => {
    if (!user || !selectedClassId || students.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const student of students) {
        const existing = activities.find(a => a.studentId === student.id && a.date === date && a.description === desc);
        if (!existing) {
          const newDocRef = doc(collection(db, 'activities'));
          batch.set(newDocRef, {
            studentId: student.id,
            classId: selectedClassId,
            date,
            description: desc,
            status: 'FEZ',
            bimester: selectedBimester,
            ownerId: user.uid,
            updatedAt: serverTimestamp()
          });
        } else if (existing.status !== 'FEZ') {
          batch.update(doc(db, 'activities', existing.id), {
            status: 'FEZ',
            updatedAt: serverTimestamp()
          });
        }
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'activities');
    } finally {
      setLoading(false);
    }
  };

  const bimesters = ['1º', '2º', '3º', '4º'];

  const activeColumns = Array.from(new Set(activities.map(a => `${a.date}|${a.description}`))).sort();
  
  const [loading, setLoading] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  const currentClass = classes.find(c => c.id === selectedClassId);

  const handleDeleteColumn = async () => {
    if (!columnToDelete || !user || !selectedClassId) return;
    const [date, desc] = columnToDelete.split('|');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'activities'),
        where('classId', '==', selectedClassId),
        where('ownerId', '==', user.uid),
        where('date', '==', date),
        where('description', '==', desc)
      );
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setColumnToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'activities/column');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 min-h-full">
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-4 bg-emerald-900/20 px-6 py-2 rounded-lg border border-emerald-500/30">
          <h2 className="text-xl font-black text-emerald-400 tracking-wider">
            {selectedBimester} BIM - ATIVIDADES - {currentClass ? `${currentClass.serie} ${currentClass.name}` : '...'}
          </h2>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-900 text-emerald-400 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-emerald-500"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.serie} - {c.name}</option>
            ))}
          </select>

          <div className="flex bg-slate-900/50 rounded-lg border border-emerald-500/20 p-1">
            {bimesters.map(b => (
              <button
                key={b}
                onClick={() => setSelectedBimester(b)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[10px] font-black transition-all",
                  selectedBimester === b 
                    ? "bg-emerald-500 text-slate-950" 
                    : "text-emerald-500/50 hover:text-emerald-400"
                )}
              >
                {b} BIM
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-900 text-emerald-400 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm font-bold outline-none"
          />
          <input
            type="text"
            placeholder="Descrição (Ex: Pag 45)"
            value={newActivityDesc}
            onChange={(e) => setNewActivityDesc(e.target.value)}
            className="bg-slate-900 text-emerald-400 border border-emerald-500/30 rounded-lg px-4 py-2 text-sm font-bold outline-none w-48"
          />
          <button
            onClick={() => markAllColumn(selectedDate, newActivityDesc)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2 rounded-lg text-sm shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> NOVO LANÇAMENTO
          </button>
        </div>
      </div>

      <div className="flex-1 bg-slate-950 rounded-xl border border-emerald-900/50 overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-[#0c1e26]">
                <th className="p-4 text-left border-r border-emerald-900/50 min-w-[240px] sticky left-0 z-40 bg-[#0c1e26]">
                  <span className="text-xs font-black text-emerald-500 uppercase tracking-widest">ALUNOS</span>
                </th>
                {activeColumns.map(col => {
                  const [d, desc] = col.split('|');
                  return (
                    <th key={col} className="p-2 border-r border-emerald-900/50 min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-emerald-400 uppercase truncate max-w-[90px]">{desc}</span>
                        <span className="text-[10px] font-black text-white">{format(new Date(d + 'T12:00:00'), 'dd/MM')}</span>
                      </div>
                    </th>
                  );
                })}
              </tr>
              <tr className="bg-[#0c1e26]/50">
                <th className="border-r border-emerald-900/50 sticky left-0 z-40 bg-[#0c1e26]"></th>
                {activeColumns.map(col => (
                  <th key={`tools-${col}`} className="p-1 border-r border-emerald-900/50">
                    <div className="flex gap-1">
                      <button
                        onClick={() => markAllColumn(col.split('|')[0], col.split('|')[1])}
                        className="flex-1 py-0.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-slate-950 text-[8px] font-black rounded border border-emerald-500/20 transition-all"
                      >
                        ALL
                      </button>
                      <button
                        onClick={() => setColumnToDelete(col)}
                        className="px-1 py-0.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[8px] font-black rounded border border-red-500/20 transition-all"
                        title="Apagar atividade"
                      >
                        <X size={12} strokeWidth={4} />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr key={student.id} className="border-b border-emerald-900/20 hover:bg-emerald-900/5 transition-colors group">
                  <td className="p-3 pl-4 border-r border-emerald-900/50 font-bold text-[11px] text-emerald-300 uppercase sticky left-0 bg-slate-950 group-hover:bg-teal-900/10 z-20">
                    {student.name}
                  </td>
                  {activeColumns.map(col => {
                    const [d, desc] = col.split('|');
                    const record = activities.find(a => a.studentId === student.id && a.date === d && a.description === desc);
                    const status = record?.status || '';

                    return (
                      <td key={col} className="p-1 border-r border-emerald-900/10">
                        <button
                          onClick={() => toggleActivityStatus(student.id, d, desc)}
                          className={cn(
                            "w-full h-8 rounded text-[9px] font-black transition-all border uppercase",
                            status === 'FEZ' ? "bg-emerald-600 border-emerald-500 text-white" :
                            status === 'NÃO FEZ' ? "bg-red-600 border-red-500 text-white" :
                            status === 'INCOMPLETO' ? "bg-amber-600 border-amber-500 text-white" :
                            "bg-slate-900/50 border-emerald-900/30 text-transparent"
                          )}
                        >
                          {status}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Column Confirmation Modal */}
      <AnimatePresence>
        {columnToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-red-500/30 rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-black text-white mb-2 uppercase">APAGAR ATIVIDADE?</h3>
              <p className="text-slate-400 text-sm mb-6">
                Isso apagará permanentemente o lançamento de <span className="text-white font-bold">{columnToDelete.split('|')[1]}</span> do dia <span className="text-white font-bold">{format(new Date(columnToDelete.split('|')[0] + 'T12:00:00'), 'dd/MM')}</span> para todos os alunos.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setColumnToDelete(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-emerald-500/30 text-emerald-500 font-bold hover:bg-emerald-500/10 transition-all"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleDeleteColumn}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all"
                >
                  {loading ? 'APAGANDO...' : 'SIM, APAGAR'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
