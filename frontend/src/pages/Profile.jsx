/**
 * Página de perfil académico del estudiante.
 * Permite ver y editar el perfil, y registrar el historial de materias.
 */
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchProfile, updateProfile, fetchSubjectCatalog, addSubject } from '../store/slices/profileSlice';
import Spinner from '../components/shared/Spinner';
import Button  from '../components/shared/Button';
import Input   from '../components/shared/Input';
import { LEARNING_STYLES, SEMESTERS, SUBJECT_STATUS } from '../utils/constants';

export default function Profile() {
  const dispatch = useDispatch();
  const { data: profile, catalog, loading } = useSelector((s) => s.profile);

  const [editing, setEditing]       = useState(false);
  const [showAddModal, setShowModal] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

  const [editForm, setEditForm] = useState({});
  const [subjectForm, setSubjectForm] = useState({ subjectId: '', status: 'en_curso', grade: '', semesterTaken: '' });

  useEffect(() => {
    dispatch(fetchProfile());
    dispatch(fetchSubjectCatalog());
  }, [dispatch]);

  useEffect(() => {
    if (profile) {
      setEditForm({
        currentSemester: profile.currentSemester,
        gpa:             profile.gpa,
        learningStyle:   profile.learningStyle,
        studentCode:     profile.studentCode || '',
      });
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    setSaveLoading(true);
    await dispatch(updateProfile(editForm));
    setSaveLoading(false);
    setEditing(false);
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    await dispatch(addSubject({
      subjectId:     parseInt(subjectForm.subjectId),
      status:        subjectForm.status,
      grade:         subjectForm.grade ? parseFloat(subjectForm.grade) : null,
      semesterTaken: subjectForm.semesterTaken ? parseInt(subjectForm.semesterTaken) : null,
    }));
    setShowModal(false);
    setSubjectForm({ subjectId: '', status: 'en_curso', grade: '', semesterTaken: '' });
    dispatch(fetchProfile());
  };

  if (loading && !profile) {
    return <div className="flex justify-center mt-20"><Spinner size="lg" /></div>;
  }

  /* Agrupa las materias del historial por semestre */
  const subjectsBySemester = (profile?.subjects || []).reduce((acc, ss) => {
    const sem = ss.subject?.semester || 0;
    if (!acc[sem]) acc[sem] = [];
    acc[sem].push(ss);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-secondary">Mi Perfil Académico</h1>

      {/* Tarjeta de perfil */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="font-bold text-secondary text-lg">Información general</h2>
          {!editing ? (
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Editar</Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSaveProfile} loading={saveLoading}>Guardar</Button>
            </div>
          )}
        </div>

        {editing ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-secondary">Semestre actual</label>
              <select value={editForm.currentSemester}
                onChange={e => setEditForm({...editForm, currentSemester: parseInt(e.target.value)})}
                className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                {SEMESTERS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <Input label="Promedio acumulado" type="number" step="0.1" min="0" max="5"
              value={editForm.gpa} onChange={e => setEditForm({...editForm, gpa: e.target.value})} />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-secondary">Estilo de aprendizaje</label>
              <select value={editForm.learningStyle}
                onChange={e => setEditForm({...editForm, learningStyle: e.target.value})}
                className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                {LEARNING_STYLES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
            <Input label="Código estudiantil" value={editForm.studentCode}
              onChange={e => setEditForm({...editForm, studentCode: e.target.value})} placeholder="Ej: 1151651" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Semestre',    value: `Semestre ${profile?.currentSemester}` },
              { label: 'Promedio',    value: profile?.gpa || '0.0' },
              { label: 'Aprendizaje', value: LEARNING_STYLES.find(l => l.value === profile?.learningStyle)?.label || '—' },
              { label: 'Código',      value: profile?.studentCode || '—' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                <p className="font-bold text-secondary">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de materias */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-secondary text-lg">Historial de materias</h2>
          <Button size="sm" onClick={() => setShowModal(true)}>+ Agregar materia</Button>
        </div>

        {Object.keys(subjectsBySemester).length === 0 ? (
          <p className="text-gray-400 text-sm">No has registrado materias aún.</p>
        ) : (
          <div className="space-y-4">
            {Object.entries(subjectsBySemester).sort(([a],[b]) => a-b).map(([sem, subjects]) => (
              <div key={sem}>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Semestre {sem}</p>
                <div className="space-y-2">
                  {subjects.map((ss) => (
                    <div key={ss.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                      <div>
                        <p className="text-sm font-medium text-secondary">{ss.subject?.name}</p>
                        <p className="text-xs text-gray-400">{ss.subject?.code} · {ss.subject?.credits} créditos</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {ss.grade !== null && (
                          <span className="text-sm font-bold text-secondary">{parseFloat(ss.grade).toFixed(1)}</span>
                        )}
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${SUBJECT_STATUS[ss.status]?.color}`}>
                          {SUBJECT_STATUS[ss.status]?.label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal agregar materia */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="font-bold text-secondary text-lg mb-4">Registrar materia</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-secondary">Materia</label>
                <select value={subjectForm.subjectId} onChange={e => setSubjectForm({...subjectForm, subjectId: e.target.value})}
                  required className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                  <option value="">Selecciona una materia...</option>
                  {catalog.map(s => <option key={s.id} value={s.id}>{s.name} (Sem {s.semester})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-secondary">Estado</label>
                  <select value={subjectForm.status} onChange={e => setSubjectForm({...subjectForm, status: e.target.value})}
                    className="px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    {Object.entries(SUBJECT_STATUS).map(([v,s]) => <option key={v} value={v}>{s.label}</option>)}
                  </select>
                </div>
                <Input label="Nota (si aplica)" type="number" step="0.1" min="0" max="5"
                  placeholder="Ej: 3.5" value={subjectForm.grade}
                  onChange={e => setSubjectForm({...subjectForm, grade: e.target.value})} />
              </div>
              <Input label="Semestre en que la cursaste" type="number" min="1" max="10"
                placeholder="Ej: 2" value={subjectForm.semesterTaken}
                onChange={e => setSubjectForm({...subjectForm, semesterTaken: e.target.value})} />
              <div className="flex gap-3 pt-2">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => setShowModal(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1">Registrar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
