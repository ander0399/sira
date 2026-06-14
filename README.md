# SIRA — Sistema Inteligente de Recomendación Académica

Plataforma de IA académica integrada con Moodle para la **Universidad Francisco de Paula Santander (UFPS)**.

SIRA asiste a estudiantes, docentes y administradores a tomar mejores decisiones académicas mediante inteligencia artificial, un motor de reglas y acceso directo desde Moodle.

---

## Funcionalidades

| Rol | Funcionalidades |
|-----|----------------|
| **Estudiante** | ChatSIRA con IA, recomendaciones académicas automáticas, progreso de cursos Moodle, reportes personales |
| **Docente** | Panel de cursos, identificación de estudiantes en riesgo, ChatSIRA para consultas de grupo |
| **Administrador** | Gestión de usuarios, reporte de actividad de docentes, estadísticas globales del sistema |

- **Widget flotante en Moodle**: SIRA se abre como un panel de chat (380 × 540 px) sobre la plataforma — el usuario puede seguir usando Moodle mientras chatea.
- **SSO automático**: Sin contraseña adicional; el token Moodle autentica al usuario en SIRA en un solo clic.
- **Motor de recomendaciones**: 5 reglas académicas basadas en progreso y calificaciones de Moodle.
- **RAG sobre normativa UFPS**: El chatbot responde con contexto institucional real.

---

## Tecnologías

### Backend
- **Node.js 18 + Express** — API REST
- **PostgreSQL 14+ + Sequelize** — Base de datos relacional
- **JWT** — Autenticación de administradores
- **Groq API (LLaMA 3.3 70B)** — Modelo de lenguaje del chatbot
- **RAG (Retrieval-Augmented Generation)** — Respuestas contextualizadas con normativa UFPS

### Frontend
- **React 18 + Vite** — SPA
- **Tailwind CSS v4** — Tema UFPS (`#C8102E` rojo institucional)
- **Redux Toolkit** — Estado global (auth, moodle, chat, recommendations)
- **React Router v6** — Navegación por roles

### Plugin Moodle
- **PHP 7.4+** — Bloque Moodle estándar (`block_sira`)
- **Moodle REST API** — Generación de tokens SSO
- **iframe + widget flotante** — SIRA embebido en Moodle sin salir de la plataforma

---

## Estructura del proyecto

```
sira/
├── backend/
│   └── src/
│       ├── controllers/        # auth, chat, moodle, teacher, recommendations, admin
│       ├── routes/             # Un archivo por dominio
│       ├── models/             # User, MoodleSession, ChatMessage, Recommendation, Feedback
│       ├── services/           # groq.service, moodle.service, rag.service, rules.service
│       ├── middleware/         # auth.middleware (verifyToken, requireAdmin, requireTeacher…)
│       └── config/             # database.js, groq.js
├── frontend/
│   └── src/
│       ├── pages/              # Login, Dashboard, TeacherDashboard, AdminDashboard, Chat, Reports, Profile
│       ├── components/
│       │   ├── layout/         # AppLayout, Sidebar, Header, ProtectedRoute
│       │   ├── chat/           # MessageBubble, ChatInput, TypingIndicator
│       │   └── shared/         # Button, Input, Spinner, StarRating
│       ├── store/              # Redux slices: auth, moodle, chat, recommendations
│       └── services/           # api.js (Axios)
├── moodle-plugin/
│   └── block_sira/             # Plugin PHP: block_sira.php, redirect.php, settings.php…
│       ├── db/                 # access.php, services.php
│       └── lang/               # en/, es/
└── package.json                # Scripts unificados con concurrently
```

---

## Instalación

### Prerrequisitos

- Node.js ≥ 18
- PostgreSQL ≥ 14
- Cuenta en [Groq Console](https://console.groq.com) (gratuita)
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
PORT=3000
NODE_ENV=development

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=sira_db
DB_USER=postgres
DB_PASS=tu_contraseña

# JWT
JWT_SECRET=cambia_esto_por_un_secreto_seguro

# Groq
GROQ_API_KEY=gsk_...

# Moodle (URL de la instancia)
MOODLE_URL=http://localhost:8080
MOODLE_ADMIN_TOKEN=token_webservice_moodle

# CORS
FRONTEND_URL=http://localhost:5173
```

### 3. Configurar el frontend

```bash
cd frontend
cp .env.example .env
npm install
```

Editar `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

### 4. Iniciar el proyecto

Desde la **raíz** del repositorio:

```bash
npm install       # instala concurrently
npm run dev       # backend (nodemon) + frontend (Vite) en paralelo
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- Health check: http://localhost:3000/api/health

Para producción:

```bash
npm start         # backend con node, frontend con vite preview
```

> Las tablas de PostgreSQL se crean automáticamente en el primer arranque (Sequelize `sync`).
> Ejecuta `npm run seed` dentro de `backend/` para crear el usuario administrador inicial.

---

## Plugin Moodle — instalación y pruebas

### Instalar el plugin

1. Copiar la carpeta `moodle-plugin/block_sira/` al directorio `blocks/` de Moodle:
   ```bash
   cp -r moodle-plugin/block_sira /ruta/a/moodle/blocks/sira
   ```
2. Ir a **Administración del sitio → Notificaciones** para instalar el plugin.
3. En **Administración → Plugins → Bloques → SIRA** configurar:
   - **URL de SIRA**: `http://localhost:5173`
   - **Nombre del servicio**: `sira_service`
4. Habilitar servicios web REST en Moodle y crear el token `sira_service`.
5. Agregar el bloque a cualquier curso desde el modo edición.

### Cómo funciona la integración

```
Usuario en Moodle
      │
      ▼
Clic en "Abrir ChatSIRA" dentro del bloque
      │
      ▼
Widget flotante se abre (380×540 px, esquina inferior derecha)
  → El usuario puede seguir navegando Moodle en el fondo
      │
      ▼
iframe carga redirect.php (SSO automático):
  • Valida sesión Moodle — require_login()
  • Detecta rol: teacher | student
  • Genera token REST — external_generate_token_for_current_user()
      │
      ▼
Redirige al frontend: /login?moodleToken=xxx&role=student
      │
      ▼
Login.jsx detecta los parámetros y autentica al usuario sin contraseña
      │
      ▼
SIRA listo dentro del widget
```

**Controles del widget:**

| Botón | Acción |
|-------|--------|
| `—` (minimizar) | Oculta el panel; aparece botón burbuja rojo en la esquina |
| `✕` (cerrar) | Cierra el widget y la burbuja por completo |
| Burbuja / botón del bloque | Reabre el panel (el iframe no se recarga) |

### Probar sin Moodle instalado

El administrador puede acceder en `http://localhost:5173/login` con sus credenciales.

Para simular un estudiante o docente, llama al endpoint de login Moodle con un token válido:

```bash
curl -X POST http://localhost:3000/api/auth/moodle-login \
  -H "Content-Type: application/json" \
  -d '{"moodleToken":"TOKEN_VALIDO","role":"student"}'
```

Esto devuelve un JWT SIRA que puede usarse para navegar el frontend directamente.

---

## Endpoints de la API

| Método | Ruta | Acceso | Descripción |
|--------|------|--------|-------------|
| `POST` | `/api/auth/login` | Público | Login administrador (email + contraseña) |
| `POST` | `/api/auth/moodle-login` | Público | Login SSO con token Moodle |
| `GET`  | `/api/moodle/courses` | Moodle user | Cursos del usuario en Moodle |
| `GET`  | `/api/recommendations` | Estudiante | Listar recomendaciones |
| `POST` | `/api/recommendations/generate` | Estudiante | Generar recomendaciones (motor de reglas) |
| `POST` | `/api/chat` | Moodle user | Enviar mensaje a ChatSIRA |
| `GET`  | `/api/teacher/dashboard` | Docente | Stats y cursos del docente |
| `GET`  | `/api/teacher/courses/:id/at-risk` | Docente | Estudiantes en riesgo de un curso |
| `GET`  | `/api/admin/stats` | Admin | Estadísticas globales del sistema |
| `GET`  | `/api/admin/users` | Admin | Lista de usuarios (paginada, filtrable por rol/búsqueda) |
| `GET`  | `/api/admin/teachers/report` | Admin | Actividad de docentes en SIRA |
| `GET`  | `/api/health` | Público | Estado del sistema |

---

## Créditos

Proyecto de grado — Ingeniería de Sistemas
**Universidad Francisco de Paula Santander (UFPS)** · 2026
Autor: **Anderson Escorcia**
