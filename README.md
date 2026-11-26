# SIRA — Sistema Inteligente de Recomendación Académica

Plataforma de asistencia académica integrada con Moodle para la **Universidad Francisco de Paula Santander (UFPS)**.

SIRA ayuda a estudiantes, docentes y administradores a tomar mejores decisiones académicas usando inteligencia artificial (Gemini), un motor de reglas y acceso directo desde Moodle sin contraseña adicional.

---

## Funcionalidades

| Rol | Funcionalidades |
|-----|----------------|
| **Estudiante** | ChatSIRA con IA, recomendaciones académicas automáticas, progreso de cursos Moodle, reportes personales |
| **Docente** | Panel de cursos, identificación de estudiantes en riesgo, ChatSIRA para análisis de grupo |
| **Administrador** | Gestión de usuarios, estadísticas globales del sistema, chat analítico |

- **Widget flotante en Moodle**: SIRA se abre como un panel de chat (380 × 520 px) sobre la plataforma — el usuario puede seguir usando Moodle mientras chatea.
- **SSO automático**: Sin contraseña adicional. El token Moodle autentica al usuario en SIRA en un solo clic desde el bloque.
- **Motor de recomendaciones híbrido**: Clasifica cada curso del estudiante (en riesgo / necesita mejora / buen camino / destacado) combinando progreso y calificaciones de Moodle.
- **RAG sobre contenido del curso**: El chatbot indexa las Páginas y recursos del curso activo en Moodle y los usa como fuente principal al responder preguntas.

---

## Tecnologías

### Backend
- **Node.js 18 + Express** — API REST en el puerto 5000
- **PostgreSQL 14+ + Sequelize** — Base de datos relacional
- **JWT** — Autenticación de sesiones
- **Google Gemini API** — Modelo de lenguaje del chatbot (gemini-2.0-flash por defecto)
- **RAG híbrido**: KB local de materias + indexación dinámica del contenido del curso Moodle

### Frontend
- **React 18 + Vite** — SPA en el puerto 5173
- **Tailwind CSS v4** — Tema UFPS (`#C8102E` rojo institucional)
- **Redux Toolkit** — Estado global (auth, moodle, chat, recommendations)
- **React Router v6** — Navegación protegida por roles

### Plugin Moodle
- **PHP 7.4+** — Bloque Moodle estándar (`block_sira`)
- **Moodle REST API** — Generación de tokens SSO por usuario
- **iframe + widget flotante** — SIRA embebido en Moodle sin salir de la plataforma

---

## Estructura del proyecto

```
sira/
├── backend/
│   └── src/
│       ├── controllers/        # auth, chat, moodle, teacher, recommendation, admin
│       ├── routes/             # Un archivo por dominio
│       ├── models/             # User, MoodleSession, ChatMessage, Recommendation, Feedback
│       ├── services/
│       │   ├── gemini.service.js       # llamadas al LLM Gemini con reintentos
│       │   ├── moodle.service.js       # integración con la REST API de Moodle
│       │   ├── rag.service.js          # construcción de prompts y RAG desde KB local
│       │   ├── courseIndex.service.js  # indexación del contenido del curso en Moodle (RAG dinámico)
│       │   ├── recommendation.service.js  # orquestador del chat y persistencia de recomendaciones
│       │   └── rules.service.js        # motor de reglas académicas y clasificación de riesgo
│       ├── middleware/         # auth.middleware (verifyToken, requireAdmin, requireTeacher…)
│       ├── data/               # knowledge.js (KB local de materias), seed.js
│       └── config/             # database.js, gemini.js
├── frontend/
│   └── src/
│       ├── pages/              # Login, Dashboard, TeacherDashboard, AdminDashboard, Chat, Reports, Profile
│       ├── components/
│       │   ├── layout/         # AppLayout, Sidebar, Header, ProtectedRoute
│       │   ├── chat/           # MessageBubble, ChatInput, TypingIndicator
│       │   └── shared/         # Button, Input, Spinner, StarRating
│       ├── store/              # Redux slices: auth, moodle, chat, recommendations
│       └── services/           # api.js (Axios con interceptores JWT y moodleToken)
└── moodle-plugin/
    └── block_sira/             # Plugin PHP: block_sira.php, redirect.php, settings.php
        ├── db/                 # access.php, services.php
        └── lang/               # en/, es/
```

---

## Instalación

### Prerrequisitos

- Node.js ≥ 18
- PostgreSQL ≥ 14
- Cuenta en [Google AI Studio](https://aistudio.google.com) para obtener la API key de Gemini (gratuita)
- Moodle ≥ 3.11 (solo para el plugin; el resto del sistema funciona sin él)

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd sira
```

### 2. Configurar el backend

```bash
cd backend
cp .env.example .env
npm install
```

Editar `backend/.env`:

```env
PORT=5000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sira_db
DB_USER=postgres
DB_PASS=tu_contraseña

# JWT
JWT_SECRET=cambia_esto_por_un_secreto_seguro
JWT_EXPIRES_IN=7d

# Gemini (opcional — sin esto el chat corre en modo básico de reglas)
GEMINI_API_KEY=AIza...
GEMINI_MODEL=gemini-2.0-flash

# Moodle (URL de la instancia)
MOODLE_URL=http://localhost:8080
MOODLE_CANONICAL_HOST=localhost:8080

# CORS
FRONTEND_URL=http://localhost:5173
```

### 3. Configurar el frontend

```bash
cd frontend
npm install
```

El frontend apunta a `/api` por proxy de Vite (ver `vite.config.js`). No requiere `.env` adicional en desarrollo local.

### 4. Iniciar el proyecto

```bash
# desde la raíz del repositorio
npm install       # instala concurrently
npm run dev       # backend (nodemon puerto 5000) + frontend (Vite puerto 5173) en paralelo
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- Health check: http://localhost:5000/api/health

> Las tablas de PostgreSQL se crean automáticamente en el primer arranque (Sequelize `sync`).  
> Ejecutar `npm run seed` dentro de `backend/` para crear el usuario administrador inicial.

---

## Plugin Moodle — instalación

### Instalar el plugin

1. Copiar la carpeta `moodle-plugin/block_sira/` al directorio `blocks/` de Moodle:
   ```bash
   cp -r moodle-plugin/block_sira /ruta/moodle/blocks/sira
   ```
2. Ir a **Administración del sitio → Notificaciones** para registrar el plugin.
3. En **Administración → Plugins → Bloques → SIRA** configurar:
   - **URL de SIRA**: `http://localhost:5173`
   - **Nombre del servicio**: `sira_service`
4. Habilitar servicios web REST en Moodle y crear el servicio externo `sira_service`.
5. Agregar el bloque a cualquier curso desde el modo edición.

### Cómo funciona la integración

```
Usuario en Moodle
      │
      ▼
Clic en "Abrir ChatSIRA" dentro del bloque
      │
      ▼
Widget flotante se abre (380×520 px, esquina inferior derecha)
  El usuario puede seguir navegando Moodle en el fondo
      │
      ▼
iframe carga redirect.php (SSO automático):
  · Valida sesión Moodle — require_login()
  · Detecta rol: teacher | student
  · Busca o genera token REST permanente para el usuario
      │
      ▼
Redirige al frontend: /login?moodleToken=xxx&role=student&courseId=42
      │
      ▼
Login.jsx detecta los parámetros y autentica sin contraseña
      │
      ▼
SIRA listo dentro del widget — el contexto del curso activo está disponible
```

**Controles del widget:**

| Botón | Acción |
|-------|--------|
| `⤢` (expandir) | Amplía el panel a ~55% del ancho de pantalla |
| `—` (minimizar) | Oculta el panel; aparece botón burbuja rojo en la esquina |
| `✕` (cerrar) | Cierra widget y burbuja completamente |
| Burbuja / botón del bloque | Reabre el panel (el iframe no se recarga) |

### Acceso sin Moodle

El administrador accede directamente en `http://localhost:5173/login` con sus credenciales.

Para simular un login de estudiante o docente desde la terminal:

```bash
curl -X POST http://localhost:5000/api/auth/moodle \
  -H "Content-Type: application/json" \
  -d '{"moodleToken":"TOKEN_VALIDO","role":"student"}'
```

Esto devuelve un JWT SIRA que puede usarse para explorar el frontend directamente.

---

## Endpoints principales de la API

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/api/auth/admin/login` | Público | Login administrador (email + contraseña) |
| `POST` | `/api/auth/moodle` | Público | Login SSO con token Moodle |
| `GET`  | `/api/auth/me` | Autenticado | Perfil del usuario actual |
| `GET`  | `/api/moodle/courses` | Moodle user | Cursos del usuario en Moodle |
| `GET`  | `/api/recommendations` | Moodle user | Listar recomendaciones del estudiante |
| `POST` | `/api/recommendations/generate` | Moodle user | Generar recomendaciones (motor de reglas) |
| `POST` | `/api/chat/message` | Moodle user | Enviar mensaje a ChatSIRA (imagen opcional) |
| `GET`  | `/api/chat/history` | Moodle user | Historial de mensajes de la sesión |
| `GET`  | `/api/chat/sessions` | Moodle user | Sesiones de chat del usuario |
| `GET`  | `/api/teacher/dashboard` | Docente | Resumen de cursos y estadísticas |
| `GET`  | `/api/teacher/courses/:id/at-risk` | Docente | Estudiantes en riesgo de un curso |
| `GET`  | `/api/admin/stats` | Admin | Estadísticas globales del sistema |
| `GET`  | `/api/admin/users` | Admin | Lista de usuarios (paginada) |
| `GET`  | `/api/health` | Público | Estado del sistema |

---

## Créditos

Proyecto de grado — Ingeniería de Sistemas  
**Universidad Francisco de Paula Santander (UFPS)** · Cúcuta, 2026  
Autores: **Anderson Escorcia - Daniel Gerardino** 
