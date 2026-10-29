import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, GraduationCap, Users, UserPlus, Pencil, X, Check, AlertCircle, Save } from 'lucide-react';
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
  
  // New UI states for modals/inline editing
  const [editingClass, setEditingClass] = useState<any>(null);
  const [deletingClass, setDeletingClass] = useState<any>(null);
  const [editSerie, setEditSerie] = useState('');
  const [editName, setEditName] = useState('');

  useEffect(() => {
    if (!user) return;

    const qClasses = query(collection(db, 'classes'), where('ownerId', '==', user.uid));
    const unsubClasses = onSnapshot(qClasses, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => a.serie.localeCompare(b.serie) || a.name.localeCompare(b.name));
      setClasses(data);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'classes'));

    const qStudents = query(collection(db, 'students'), where('ownerId', '==', user.uid));
    const unsubStudents = onSnapshot(qStudents, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a: any, b: any) => a.name.localeCompare(b.name));
      setStudents(data);
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
        serie: newSerie.trim(),
        name: newClassName.trim(),
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

  const handleStartEdit = (classObj: any) => {
    setEditingClass(classObj);
    setEditSerie(classObj.serie);
    setEditName(classObj.name);
  };

  const handleSaveEdit = async () => {
    if (!editingClass || !editSerie.trim() || !editName.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'classes', editingClass.id), {
        serie: editSerie.trim(),
        name: editName.trim()
      });
      setEditingClass(null);
    } catch (err) {
      console.error('Erro ao editar turma:', err);
      handleFirestoreError(err, OperationType.UPDATE, 'classes');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingClass || !user) return;
    const id = deletingClass.id;
    setLoading(true);
    try {
      // 1. Delete all students in this class
      const qStudents = query(
        collection(db, 'students'), 
        where('classId', '==', id),
        where('ownerId', '==', user.uid)
      );
      const snapStudents = await getDocs(qStudents);
      const deletePromises = snapStudents.docs.map(d => deleteDoc(d.ref));

      // 2. Delete all attendance records for this class
      const qAttendance = query(
        collection(db, 'attendance'), 
        where('classId', '==', id),
        where('ownerId', '==', user.uid)
      );
      const snapAttendance = await getDocs(qAttendance);
      deletePromises.push(...snapAttendance.docs.map(d => deleteDoc(d.ref)));

      // 3. Delete all activities records for this class
      const qActivities = query(
        collection(db, 'activities'), 
        where('classId', '==', id),
        where('ownerId', '==', user.uid)
      );
      const snapActivities = await getDocs(qActivities);
      deletePromises.push(...snapActivities.docs.map(d => deleteDoc(d.ref)));

      // Wait for all related data to be deleted
      if (deletePromises.length > 0) {
        await Promise.all(deletePromises);
      }

      // 4. Finally delete the class document
      await deleteDoc(doc(db, 'classes', id));
      
      if (selectedClassId === id) setSelectedClassId('');
      setDeletingClass(null);
    } catch (err) {
      console.error('Erro ao deletar turma:', err);
      handleFirestoreError(err, OperationType.DELETE, 'classes/cleanup');
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

  const [deletingStudent, setDeletingStudent] = useState<any>(null);

  const handleConfirmDeleteStudent = async () => {
    if (!deletingStudent) return;
    try {
      await deleteDoc(doc(db, 'students', deletingStudent.id));
      setDeletingStudent(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'students');
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
                {classes.map(c => (
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
          <AnimatePresence mode="popLayout">
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
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(c)}
                      disabled={loading}
                      className="p-2 text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                      title="Editar Turma"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDeletingClass(c)}
                      disabled={loading}
                      className="p-2 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Excluir Turma"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <div className="p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {students.filter(s => s.classId === c.id).sort((a, b) => a.name.localeCompare(b.name)).map(s => (
                      <div key={s.id} className="flex justify-between items-center group">
                        <span className="text-sm text-slate-600 dark:text-slate-300">{s.name}</span>
                        <button
                          onClick={() => setDeletingStudent(s)}
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

      {/* Edit Modal */}
      <AnimatePresence>
        {editingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-bold">Editar Turma</h3>
                  <p className="text-sm text-slate-500">Altere os dados básicos da turma.</p>
                </div>
                <button onClick={() => setEditingClass(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Série</label>
                  <input
                    type="text"
                    value={editSerie}
                    onChange={(e) => setEditSerie(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Nome da Turma</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setEditingClass(null)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading || !editSerie.trim() || !editName.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20"
                  >
                    <Save size={18} /> Salvar
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deletingClass && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                  <AlertCircle size={32} />
                </div>
                <h3 className="text-xl font-bold">Excluir Turma?</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Esta ação é irreversível. Todos os alunos, frequências e atividades desta turma serão <span className="font-bold text-red-500 uppercase">excluídos permanentemente</span>.
                </p>
                <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 w-full">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Turma Selecionada</p>
                  <p className="font-bold">{deletingClass.serie} - {deletingClass.name}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingClass(null)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-red-500/20"
                >
                  {loading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Student Modal */}
      <AnimatePresence>
        {deletingStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-8 shadow-2xl border border-slate-200 dark:border-slate-800"
            >
              <div className="flex flex-col items-center text-center mb-6">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
                  <Trash2 size={24} />
                </div>
                <h3 className="font-bold text-lg">Remover Aluno?</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Deseja realmente remover <span className="font-bold text-slate-900 dark:text-slate-100">{deletingStudent.name}</span> da turma?
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeletingStudent(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                >
                  Não
                </button>
                <button
                  onClick={handleConfirmDeleteStudent}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-red-500/20"
                >
                  Sim, Remover
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
