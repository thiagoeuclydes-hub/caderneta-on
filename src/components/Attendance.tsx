import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, ChevronRight, Check, X, Minus, RotateCw, Plus, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { handleFirestoreError, OperationType } from '../lib/error-handler';

export const AttendanceView: React.FC = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedBimester, setSelectedBimester] = useState('1º');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedLesson, setSelectedLesson] = useState('1ª Aula');

  const [isRenaming, setIsRenaming] = useState(false);
  const [editSerie, setEditSerie] = useState('');
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(false);

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
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (currentClass) {
      setEditSerie(currentClass.serie);
      setEditName(currentClass.name);
    }

    const qS = query(
      collection(db, 'students'), 
      where('classId', '==', selectedClassId),
      where('ownerId', '==', user.uid)
    );
    const unsubS = onSnapshot(qS, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }) as any).sort((a: any, b: any) => a.name.localeCompare(b.name)));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `students (classId: ${selectedClassId})`));

    const qA = query(
      collection(db, 'attendance'), 
      where('classId', '==', selectedClassId), 
      where('bimester', '==', selectedBimester),
      where('ownerId', '==', user.uid)
    );
    const unsubA = onSnapshot(qA, (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `attendance (classId: ${selectedClassId}, bimester: ${selectedBimester})`));

    return () => {
      unsubS();
      unsubA();
    };
  }, [selectedClassId, selectedBimester, user, classes]);

  const toggleAttendance = async (studentId: string, date: string, lesson: string) => {
    if (!user || !selectedClassId) return;
    
    const existing = attendance.find(a => a.studentId === studentId && a.date === date && a.lesson === lesson);
    const path = 'attendance';
    
    try {
      if (existing) {
        let nextStatus = '';
        if (existing.status === 'P') nextStatus = 'F';
        else if (existing.status === 'F') nextStatus = '';
        else nextStatus = 'P';

        if (nextStatus === '') {
          await deleteDoc(doc(db, 'attendance', existing.id));
        } else {
          await updateDoc(doc(db, 'attendance', existing.id), {
            status: nextStatus,
            updatedAt: serverTimestamp()
          });
        }
      } else {
        await addDoc(collection(db, 'attendance'), {
          studentId,
          classId: selectedClassId,
          date,
          lesson,
          status: 'P',
          bimester: selectedBimester,
          ownerId: user.uid,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, existing ? OperationType.UPDATE : OperationType.CREATE, path);
    }
  };

  const markAllColumn = async (date: string, lesson: string) => {
    if (!user || !selectedClassId || students.length === 0) return;
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const student of students) {
        const existing = attendance.find(a => a.studentId === student.id && a.date === date && a.lesson === lesson);
        if (!existing) {
          const newDocRef = doc(collection(db, 'attendance'));
          batch.set(newDocRef, {
            studentId: student.id,
            classId: selectedClassId,
            date,
            lesson,
            status: 'P',
            bimester: selectedBimester,
            ownerId: user.uid,
            updatedAt: serverTimestamp()
          });
        } else if (existing.status !== 'P') {
          batch.update(doc(db, 'attendance', existing.id), {
            status: 'P',
            updatedAt: serverTimestamp()
          });
        }
      }
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'attendance');
    } finally {
      setLoading(false);
    }
  };

  const handleRenameClass = async () => {
    if (!selectedClassId || !editSerie.trim() || !editName.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'classes', selectedClassId), {
        serie: editSerie.trim(),
        name: editName.trim()
      });
      setIsRenaming(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'classes');
    } finally {
      setLoading(false);
    }
  };

  const [columnToDelete, setColumnToDelete] = useState<string | null>(null);

  const handleDeleteColumn = async () => {
    if (!columnToDelete || !user || !selectedClassId) return;
    const [date, lesson] = columnToDelete.split('|');
    setLoading(true);
    try {
      const q = query(
        collection(db, 'attendance'),
        where('classId', '==', selectedClassId),
        where('ownerId', '==', user.uid),
        where('date', '==', date),
        where('lesson', '==', lesson)
      );
      const snap = await getDocs(q);
      const deletePromises = snap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(deletePromises);
      setColumnToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'attendance/column');
    } finally {
      setLoading(false);
    }
  };

  const bimesters = ['1º', '2º', '3º', '4º'];
  const lessons = ['1ª Aula', '2ª Aula', '3ª Aula', '4ª Aula'];

  const activeColumns = Array.from(new Set(attendance.map(a => `${a.date}|${a.lesson}`))).sort();
  
  const currentClass = classes.find(c => c.id === selectedClassId);

  return (
    <div className="flex flex-col gap-6 min-h-full">
      {/* Header matching image */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center gap-4 bg-teal-900/20 px-6 py-2 rounded-lg border border-teal-500/30">
          <h2 className="text-xl font-black text-teal-400 tracking-wider flex items-center gap-2">
            {selectedBimester} BIM - {currentClass ? `${currentClass.serie} ${currentClass.name}` : '...'}
          </h2>
          <button 
            onClick={() => setIsRenaming(true)}
            className="bg-yellow-500 hover:bg-yellow-600 text-slate-950 text-[10px] font-black px-3 py-1 rounded shadow-lg transition-all"
          >
            EDITAR NOME
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-900 text-teal-400 border border-teal-500/30 rounded-lg px-4 py-2 text-sm font-bold outline-none focus:ring-1 focus:ring-teal-500"
          >
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.serie} - {c.name}</option>
            ))}
          </select>

          <div className="flex bg-slate-900/50 rounded-lg border border-teal-500/20 p-1">
            {bimesters.map(b => (
              <button
                key={b}
                onClick={() => setSelectedBimester(b)}
                className={cn(
                  "px-4 py-1.5 rounded-md text-[10px] font-black transition-all",
                  selectedBimester === b 
                    ? "bg-teal-500 text-slate-950" 
                    : "text-teal-500/50 hover:text-teal-400"
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
            className="bg-slate-900 text-teal-400 border border-teal-500/30 rounded-lg px-4 py-2 text-sm font-bold outline-none"
          />
          <select
            value={selectedLesson}
            onChange={(e) => setSelectedLesson(e.target.value)}
            className="bg-slate-900 text-teal-400 border border-teal-500/30 rounded-lg px-4 py-2 text-sm font-bold outline-none"
          >
            {lessons.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button
            onClick={() => markAllColumn(selectedDate, selectedLesson)}
            className="bg-teal-600 hover:bg-teal-500 text-white font-black px-6 py-2 rounded-lg text-sm shadow-lg shadow-teal-500/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> NOVA CHAMADA
          </button>
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="flex-1 bg-slate-950 rounded-xl border border-teal-900/50 overflow-hidden flex flex-col shadow-2xl">
        <div className="overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-30">
              <tr className="bg-[#0c1e26]">
                <th className="p-4 text-left border-r border-teal-900/50 min-w-[240px] sticky left-0 z-40 bg-[#0c1e26]">
                  <span className="text-xs font-black text-teal-500 uppercase tracking-widest">ALUNOS</span>
                </th>
                {activeColumns.map(col => {
                  const [d, l] = col.split('|');
                  return (
                    <th key={col} className="p-2 border-r border-teal-900/50 min-w-[70px]">
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] font-black text-teal-400">{l.replace(/\D/g, '')}º</span>
                        <span className="text-[10px] font-black text-white">{format(new Date(d + 'T12:00:00'), 'dd/MM')}</span>
                      </div>
                    </th>
                  );
                })}
                <th className="p-4 border-l border-teal-900/50 bg-[#0c1e26] sticky right-0 z-40 min-w-[60px]">
                  <span className="text-xs font-black text-teal-500">F</span>
                </th>
              </tr>
              {/* ALL and DELETE Buttons Row */}
              <tr className="bg-[#0c1e26]/50">
                <th className="border-r border-teal-900/50 sticky left-0 z-40 bg-[#0c1e26]"></th>
                {activeColumns.map(col => (
                  <th key={`tools-${col}`} className="p-1 border-r border-teal-900/50">
                    <div className="flex gap-1">
                      <button
                        onClick={() => markAllColumn(col.split('|')[0], col.split('|')[1])}
                        className="flex-1 py-0.5 bg-teal-500/10 hover:bg-teal-500 text-teal-500 hover:text-slate-950 text-[8px] font-black rounded border border-teal-500/20 transition-all"
                      >
                        ALL
                      </button>
                      <button
                        onClick={() => setColumnToDelete(col)}
                        className="px-1 py-0.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[8px] font-black rounded border border-red-500/20 transition-all"
                        title="Apagar dia"
                      >
                        <X size={12} strokeWidth={4} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="bg-[#0c1e26] sticky right-0 z-40"></th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                let totalFaltas = 0;
                return (
                  <tr key={student.id} className="border-b border-teal-900/20 hover:bg-teal-900/5 transition-colors group">
                    <td className="p-3 pl-4 border-r border-teal-900/50 font-bold text-[11px] text-teal-300 uppercase sticky left-0 bg-slate-950 group-hover:bg-teal-900/10 z-20">
                      {student.name}
                    </td>
                    {activeColumns.map(col => {
                      const [d, l] = col.split('|');
                      const record = attendance.find(a => a.studentId === student.id && a.date === d && a.lesson === l);
                      const status = record?.status || '';
                      if (status === 'F') totalFaltas++;

                      return (
                        <td key={col} className="p-1 border-r border-teal-900/10">
                          <button
                            onClick={() => toggleAttendance(student.id, d, l)}
                            className={cn(
                              "w-full h-8 rounded text-[11px] font-black transition-all border",
                              status === 'P' ? "bg-emerald-600 border-emerald-500 text-white" :
                              status === 'F' ? "bg-red-600 border-red-500 text-white" :
                              "bg-slate-900/50 border-teal-900/30 text-transparent"
                            )}
                          >
                            {status}
                          </button>
                        </td>
                      );
                    })}
                    <td className="p-3 text-center font-black text-red-500 bg-slate-950 sticky right-0 z-20 group-hover:bg-teal-900/10 border-l border-teal-900/50">
                      {totalFaltas || '0'}
                    </td>
                  </tr>
                );
              })}
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
              <h3 className="text-xl font-black text-white mb-2 uppercase">APAGAR REGISTROS?</h3>
              <p className="text-slate-400 text-sm mb-6">
                Isso apagará permanentemente a frequência de <span className="text-white font-bold">{columnToDelete.split('|')[1]}</span> do dia <span className="text-white font-bold">{format(new Date(columnToDelete.split('|')[0] + 'T12:00:00'), 'dd/MM')}</span> para todos os alunos.
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setColumnToDelete(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-teal-500/30 text-teal-500 font-bold hover:bg-teal-500/10 transition-all"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleDeleteColumn}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-black py-3 rounded-xl shadow-lg shadow-red-500/20 transition-all"
                >
                  {loading ? 'APAGANDO...' : 'SIM, APAGAR'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Rename Modal */}
      {isRenaming && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-teal-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-black text-teal-400 mb-6">RENOMEAR TURMA</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2 block">Série</label>
                  <input
                    type="text"
                    value={editSerie}
                    onChange={(e) => setEditSerie(e.target.value)}
                    className="w-full bg-slate-950 border border-teal-500/30 rounded-xl px-4 py-3 text-teal-300 font-bold outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ex: 6º ano A"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-teal-600 uppercase tracking-widest mb-2 block">Nome / Turno</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-950 border border-teal-500/30 rounded-xl px-4 py-3 text-teal-300 font-bold outline-none focus:ring-2 focus:ring-teal-500"
                    placeholder="Ex: TARDE"
                  />
                </div>
              </div>
              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => setIsRenaming(false)}
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-xl border border-teal-500/30 text-teal-500 font-bold hover:bg-teal-500/10 transition-all disabled:opacity-50"
                >
                  CANCELAR
                </button>
                <button
                  onClick={handleRenameClass}
                  disabled={loading}
                  className="flex-1 bg-teal-600 hover:bg-teal-500 text-white font-black py-3 rounded-xl shadow-lg shadow-teal-500/20 transition-all disabled:opacity-50"
                >
                  {loading ? 'SALVANDO...' : 'SALVAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
