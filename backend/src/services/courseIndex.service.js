/**
 * Servicio de indexación de contenido de cursos Moodle.
 *
 * Flujo:
 *  1. Llama a core_course_get_contents para obtener toda la estructura del curso.
 *  2. Extrae texto de Páginas Moodle (contenido HTML → texto plano).
 *  3. Registra archivos/URLs con su nombre, sección y URL de acceso.
 *  4. Construye un índice en memoria con TTL de 1 hora.
 *  5. Permite búsqueda por keywords que retorna snippets reales del material.
 */

const moodleService = require('./moodle.service');

// Cache en memoria: courseId → { index, builtAt }
const indexCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

/** Elimina etiquetas HTML y normaliza espacios. */
const stripHtml = (html = '') =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

/** Normaliza texto para comparación: minúsculas, sin acentos. */
const normalize = (str = '') =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Construye el índice de un curso a partir de su estructura Moodle.
 * @param {Array} sections - Resultado de core_course_get_contents
 * @returns {{ pages: Array, files: Array, urls: Array }}
 */
const buildIndexFromSections = (sections) => {
  const pages = [];   // contenido textual completo (Páginas Moodle, etiquetas)
  const files = [];   // archivos subidos (PDF, DOC, etc.)
  const urls  = [];   // enlaces externos

  for (const section of sections) {
    const sectionName = stripHtml(section.name || '');

    for (const mod of (section.modules || [])) {
      const modName = stripHtml(mod.name || '');
      const modDesc = stripHtml(mod.description || '');

      switch (mod.modname) {

        case 'page': {
          // Página Moodle: el HTML del contenido viene en mod.contents[0].content
          const contentEntry = (mod.contents || []).find(c => c.type === 'content');
          const rawHtml = contentEntry?.content || modDesc;
          const text = stripHtml(rawHtml);
          if (text.length > 20) {
            pages.push({
              section: sectionName,
              title:   modName,
              text,
              // Guardamos chunks de ~300 chars para no inyectar bloques enormes al prompt
              chunks:  chunkText(text, 300),
            });
          }
          break;
        }

        case 'label': {
          // Etiqueta: descripción HTML inline en la sección
          const text = stripHtml(mod.description || '');
          if (text.length > 20) {
            pages.push({
              section: sectionName,
              title:   `Etiqueta: ${sectionName}`,
              text,
              chunks:  chunkText(text, 300),
            });
          }
          break;
        }

        case 'resource':
        case 'folder': {
          // Archivo subido (PDF, DOC, etc.)
          const fileEntry = (mod.contents || []).find(
            c => c.type === 'file' && c.filename
          );
          files.push({
            section:  sectionName,
            title:    modName,
            filename: fileEntry?.filename || modName,
            url:      fileEntry?.fileurl  || null,
            desc:     modDesc,
          });
          break;
        }

        case 'url': {
          const linkEntry = (mod.contents || []).find(c => c.type === 'file');
          urls.push({
            section: sectionName,
            title:   modName,
            url:     linkEntry?.fileurl || null,
            desc:    modDesc,
          });
          break;
        }

        default:
          // Actividades (tareas, foros, quices): registrar solo nombre y sección
          if (modName) {
            files.push({
              section:  sectionName,
              title:    modName,
              filename: null,
              url:      null,
              desc:     modDesc,
            });
          }
      }
    }
  }

  return { pages, files, urls };
};

/**
 * Divide un texto largo en chunks de tamaño máximo preservando palabras.
 */
const chunkText = (text, maxLen) => {
  const words  = text.split(' ');
  const chunks = [];
  let current  = '';

  for (const word of words) {
    if ((current + ' ' + word).length > maxLen) {
      if (current) chunks.push(current.trim());
      current = word;
    } else {
      current += (current ? ' ' : '') + word;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
};

/**
 * Construye o recupera del caché el índice de un curso.
 * @param {number} courseId
 * @param {string} token - Token Moodle del estudiante
 * @returns {{ pages, files, urls } | null}
 */
const getOrBuildIndex = async (courseId, token) => {
  const cached = indexCache.get(courseId);
  if (cached && (Date.now() - cached.builtAt) < CACHE_TTL_MS) {
    return cached.index;
  }

  try {
    const sections = await moodleService.getCourseContents(courseId, token);
    if (!Array.isArray(sections) || sections.length === 0) return null;

    const index = buildIndexFromSections(sections);
    indexCache.set(courseId, { index, builtAt: Date.now() });
    return index;
  } catch (err) {
    console.warn(`[courseIndex] No se pudo indexar curso ${courseId}:`, err.message);
    return null;
  }
};

/**
 * Busca en el índice del curso las entradas más relevantes para una consulta.
 *
 * Retorna:
 *  {
 *    pageSnippets: string,   // extractos de Páginas relevantes (para inyectar al prompt)
 *    citedResources: string, // lista de archivos/URLs relacionados (para citar al estudiante)
 *    found: boolean,
 *  }
 *
 * @param {{ pages, files, urls }} index
 * @param {string} query
 */
const searchIndex = (index, query) => {
  if (!index) return { pageSnippets: '', citedResources: '', found: false };

  const q = normalize(query);
  // Extraer palabras de búsqueda (≥4 chars para evitar ruido)
  const keywords = q.split(/\s+/).filter(w => w.length >= 4);
  if (keywords.length === 0) return { pageSnippets: '', citedResources: '', found: false };

  const score = (text) =>
    keywords.reduce((acc, kw) => acc + (normalize(text).includes(kw) ? 1 : 0), 0);

  // ── Buscar en Páginas ───────────────────────────────────────────────────
  const matchedPages = index.pages
    .map(p => ({
      ...p,
      score: score(p.title) * 2 + score(p.text),
    }))
    .filter(p => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  // Para cada página relevante, extraer el chunk más pertinente
  const pageSnippets = matchedPages
    .map(p => {
      const bestChunk = p.chunks
        .map(c => ({ c, s: score(c) }))
        .sort((a, b) => b.s - a.s)[0];
      const snippet = bestChunk?.s > 0 ? bestChunk.c : p.chunks[0] || '';
      return `[${p.section} › ${p.title}]\n"${snippet}"`;
    })
    .join('\n\n');

  // ── Buscar en archivos y URLs ───────────────────────────────────────────
  const matchedResources = [
    ...index.files.map(f => ({ ...f, type: 'archivo' })),
    ...index.urls.map(u => ({ ...u, type: 'enlace' })),
  ]
    .map(r => ({ ...r, score: score(r.title) * 2 + score(r.desc) }))
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const citedResources = matchedResources
    .map(r => {
      const ref = r.url ? ` → ${r.url}` : '';
      return `• [${r.type}] "${r.title}" (${r.section})${ref}`;
    })
    .join('\n');

  return {
    pageSnippets,
    citedResources,
    found: matchedPages.length > 0 || matchedResources.length > 0,
  };
};

/** Invalida el caché de un curso (útil si el profesor actualizó contenido). */
const invalidateCache = (courseId) => indexCache.delete(courseId);

module.exports = { getOrBuildIndex, searchIndex, invalidateCache };
