import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Calendar, ChevronRight, Check, X, Minus, RotateCw } from 'lucide-react';
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

    const qA = query(collection(db, 'attendance'), where('classId', '==', selectedClassId), where('bimester', '==', selectedBimester));
    const unsubA = onSnapshot(qA, (snap) => {
      setAttendance(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => handleFirestoreError(error, OperationType.LIST, `attendance (classId: ${selectedClassId}, bimester: ${selectedBimester})`));

    return () => {
      unsubS();
      unsubA();
    };
  }, [selectedClassId, selectedBimester, user]);

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

  const markAllPresent = async () => {
    if (!user || !selectedClassId || students.length === 0) return;
    const path = 'attendance';
    try {
      for (const student of students) {
        const existing = attendance.find(a => a.studentId === student.id && a.date === selectedDate && a.lesson === selectedLesson);
        if (!existing) {
          await addDoc(collection(db, 'attendance'), {
            studentId: student.id,
            classId: selectedClassId,
            date: selectedDate,
            lesson: selectedLesson,
            status: 'P',
            bimester: selectedBimester,
            ownerId: user.uid,
            updatedAt: serverTimestamp()
          });
        } else if (existing.status !== 'P') {
          await updateDoc(doc(db, 'attendance', existing.id), {
            status: 'P',
            updatedAt: serverTimestamp()
          });
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  };

  const bimesters = ['1º', '2º', '3º', '4º'];
  const lessons = ['1ª Aula', '2ª Aula', '3ª Aula', '4ª Aula'];

  // Get unique date+lesson combinations from attendance to show as columns
  const activeColumns = Array.from(new Set(attendance.map(a => `${a.date}|${a.lesson}`))).sort();
  // Ensure selected column is in the view if not already
  const currentKey = `${selectedDate}|${selectedLesson}`;
  if (!activeColumns.includes(currentKey)) {
    activeColumns.push(currentKey);
    activeColumns.sort();
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight">Registro de Frequência</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Marque a presença dos alunos em tempo real.</p>
        </div>

        <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit shadow-inner">
          {bimesters.map(b => (
            <button
              key={b}
              onClick={() => setSelectedBimester(b)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                selectedBimester === b 
                  ? "bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm" 
                  : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
              )}
            >
              {b} BIM
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Controls Sidebar */}
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
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Data</label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Aula</label>
              <select
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none"
              >
                {lessons.map(l => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>

            <button
              onClick={markAllPresent}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
            >
              <Check size={18} /> Marcar Todos P
            </button>
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
                  {activeColumns.map(col => {
                    const [d, l] = col.split('|');
                    const isToday = d === format(new Date(), 'yyyy-MM-dd');
                    return (
                      <th key={col} className={cn("p-3 border-r border-slate-200 dark:border-slate-800 min-w-[80px]", isToday && "bg-blue-50 dark:bg-blue-900/20")}>
                        <div className="flex flex-col items-center">
                          <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">{l.replace(/\D/g, '')}º AULA</span>
                          <span className="text-xs font-black">{format(new Date(d + 'T12:00:00'), 'dd/MM', { locale: ptBR })}</span>
                        </div>
                      </th>
                    );
                  })}
                  <th className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 min-w-[60px]">
                    <span className="text-[10px] font-black uppercase">Faltas</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, sIdx) => {
                  let totalFaltas = 0;
                  return (
                    <tr key={student.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="sticky left-0 bg-white dark:bg-slate-900 p-4 border-r border-slate-200 dark:border-slate-800 font-medium text-sm z-10">
                        {student.name}
                      </td>
                      {activeColumns.map(col => {
                        const [d, l] = col.split('|');
                        const record = attendance.find(a => a.studentId === student.id && a.date === d && a.lesson === l);
                        const status = record?.status || '';
                        if (status === 'F') totalFaltas++;

                        return (
                          <td key={col} className="p-1 text-center border-r border-slate-100 dark:border-slate-800/50">
                            <button
                              onClick={() => toggleAttendance(student.id, d, l)}
                              className={cn(
                                "w-full h-8 rounded-lg flex items-center justify-center transition-all border",
                                status === 'P' ? "bg-emerald-500 border-emerald-600 text-white shadow-sm" :
                                status === 'F' ? "bg-red-500 border-red-600 text-white shadow-sm" :
                                "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-transparent"
                              )}
                            >
                              {status === 'P' ? <Check size={14} strokeWidth={4} /> : 
                               status === 'F' ? <X size={14} strokeWidth={4} /> : 
                               <Minus size={14} />}
                            </button>
                          </td>
                        );
                      })}
                      <td className="p-3 text-center font-bold text-red-600 dark:text-red-400 tabular-nums">
                        {totalFaltas}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Presença</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Falta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-slate-200 dark:bg-slate-700 rounded" />
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Não Lançado</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
