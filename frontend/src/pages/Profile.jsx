/**
 * Perfil del usuario autenticado en SIRA.
 * Muestra información proveniente del token Moodle (solo lectura).
 * Los datos del perfil son gestionados por Moodle — SIRA no los edita.
 */
import { useSelector } from 'react-redux';

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-secondary">{value || '—'}</span>
    </div>
  );
}

export default function Profile() {
  const user    = useSelector((s) => s.auth.user);
  const courses = useSelector((s) => s.moodle.courses);

  const roleLabel = {
    student: 'Estudiante',
    teacher: 'Docente',
    admin:   'Administrador',
  }[user?.role] || user?.role;

  const displayName = user?.fullName || user?.name || 'Usuario';

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-secondary">Mi Perfil</h1>

      {/* Tarjeta de identidad */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary-dark rounded-2xl flex items-center justify-center text-white text-2xl font-bold shadow">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-secondary">{displayName}</h2>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              user?.role === 'admin'   ? 'bg-purple-100 text-purple-700' :
              user?.role === 'teacher' ? 'bg-blue-100 text-blue-700' :
                                        'bg-green-100 text-green-700'
            }`}>
              {roleLabel}
            </span>
          </div>
        </div>

        <InfoRow label="Nombre completo" value={displayName} />
        <InfoRow label="Correo"          value={user?.email} />
        <InfoRow label="Rol en SIRA"     value={roleLabel} />
        {user?.type === 'moodle' && (
          <InfoRow label="ID Moodle" value={`#${user.moodleUserId}`} />
        )}
        {user?.type === 'admin' && (
          <InfoRow label="ID Admin" value={`#${user.id}`} />
        )}
      </div>

      {/* Cursos activos (solo usuarios Moodle) */}
      {user?.type === 'moodle' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-secondary mb-4">
            Cursos activos en Moodle ({courses.length})
          </h3>
          {courses.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No hay cursos cargados. Ve al dashboard para cargarlos.
            </p>
          ) : (
            <ul className="space-y-2">
              {courses.map((c) => (
                <li key={c.id} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                  <span className="text-secondary font-medium">{c.fullname}</span>
                  <div className="flex items-center gap-3 shrink-0">
                    {c.progress !== null && c.progress !== undefined && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        c.progress < 40 ? 'bg-red-100 text-red-700' :
                        c.progress < 75 ? 'bg-yellow-100 text-yellow-700' :
                                          'bg-green-100 text-green-700'
                      }`}>
                        {c.progress}%
                      </span>
                    )}
                    <span className="text-gray-400 text-xs">{c.shortname}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        Los datos del perfil provienen de Moodle UFPS y no son editables desde SIRA.
      </p>
    </div>
  );
}
