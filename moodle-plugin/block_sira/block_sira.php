<?php
// Bloque SIRA para Moodle.
// Detecta el rol del usuario y abre ChatSIRA en un modal con iframe,
// permitiendo usar SIRA sin salir de la plataforma Moodle.

class block_sira extends block_base {

    public function init() {
        $this->title = get_string('pluginname', 'block_sira');
    }

    public function get_content() {
        global $USER;

        if ($this->content !== null) {
            return $this->content;
        }

        // No mostrar bloque a usuarios no autenticados o invitados
        if (!isloggedin() || isguestuser()) {
            return null;
        }

        $role        = $this->detectUserRole();
        $redirectUrl = new moodle_url('/blocks/sira/redirect.php', ['role' => $role]);

        $this->content         = new stdClass();
        $this->content->text   = $this->renderContent($redirectUrl, $role, $USER->firstname);
        $this->content->footer = '';

        return $this->content;
    }

    /**
     * Detecta si el usuario tiene rol de docente en cualquier contexto del sitio.
     * Retorna 'teacher' si tiene un rol de edición, 'student' en caso contrario.
     */
    private function detectUserRole() {
        global $USER, $DB;

        $teacherRoles = ['editingteacher', 'teacher', 'manager', 'coursecreator'];

        $sql = 'SELECT DISTINCT r.shortname
                FROM {role_assignments} ra
                JOIN {role} r ON r.id = ra.roleid
                WHERE ra.userid = :userid';

        $roles = $DB->get_records_sql($sql, ['userid' => $USER->id]);

        foreach ($roles as $role) {
            if (in_array($role->shortname, $teacherRoles)) {
                return 'teacher';
            }
        }

        return 'student';
    }

    /**
     * Genera el HTML del bloque: botón que abre SIRA como widget flotante
     * en la esquina inferior derecha, sin bloquear la vista de Moodle.
     * El iframe carga redirect.php de forma diferida (solo al primer clic).
     */
    private function renderContent(moodle_url $redirectUrl, string $role, string $firstname) {
        $isTeacher = $role === 'teacher';
        $desc      = get_string($isTeacher ? 'sira_description_teacher' : 'sira_description_student', 'block_sira');
        $btnLabel  = get_string('open_sira', 'block_sira');
        $iframeSrc = htmlspecialchars($redirectUrl->out(false), ENT_QUOTES);

        // ── Contenido del bloque: descripción + botón de apertura ────────────
        $html  = '<div style="font-family:inherit;">';
        $html .= '  <p style="font-size:0.8rem;color:#666;margin:0 0 12px;line-height:1.4;">';
        $html .= '    ' . format_string($desc);
        $html .= '  </p>';
        $html .= '  <button onclick="openSiraWidget()"';
        $html .= '    style="display:flex;align-items:center;justify-content:center;gap:8px;width:100%;';
        $html .= '           background:#C8102E;color:#fff;border:none;padding:10px 16px;';
        $html .= '           border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;transition:background 0.2s;"';
        $html .= '    onmouseover="this.style.background=\'#a00d24\'"';
        $html .= '    onmouseout="this.style.background=\'#C8102E\'">';
        $html .= '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">';
        $html .= '      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
        $html .= '    </svg>';
        $html .= '    ' . format_string($btnLabel);
        $html .= '  </button>';
        $html .= '</div>';

        // ── Widget flotante (380 × 540 px, esquina inferior derecha) ─────────
        $html .= '<div id="sira-widget"';
        $html .= '  style="display:none;position:fixed;bottom:24px;right:24px;z-index:99999;';
        $html .= '         width:380px;height:540px;border-radius:16px;overflow:hidden;';
        $html .= '         box-shadow:0 8px 40px rgba(0,0,0,0.28);flex-direction:column;">';

        // Barra superior del widget
        $html .= '  <div style="display:flex;align-items:center;justify-content:space-between;';
        $html .= '              padding:10px 14px;background:#C8102E;color:#fff;flex-shrink:0;">';
        $html .= '    <div style="display:flex;align-items:center;gap:8px;">';
        $html .= '      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">';
        $html .= '        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
        $html .= '      </svg>';
        $html .= '      <span style="font-weight:700;font-size:0.9rem;">ChatSIRA — UFPS</span>';
        $html .= '    </div>';
        $html .= '    <div style="display:flex;gap:6px;">';

        // Botón minimizar: oculta el widget y muestra el FAB
        $html .= '      <button onclick="minimizeSiraWidget()" title="Minimizar"';
        $html .= '        style="background:rgba(255,255,255,0.2);border:none;color:#fff;';
        $html .= '               border-radius:4px;width:26px;height:26px;cursor:pointer;';
        $html .= '               font-size:1.1rem;line-height:1;"';
        $html .= '        onmouseover="this.style.background=\'rgba(255,255,255,0.35)\'"';
        $html .= '        onmouseout="this.style.background=\'rgba(255,255,255,0.2)\'">—</button>';

        // Botón cerrar: oculta widget y FAB por completo
        $html .= '      <button onclick="closeSiraWidget()" title="Cerrar"';
        $html .= '        style="background:rgba(255,255,255,0.2);border:none;color:#fff;';
        $html .= '               border-radius:4px;width:26px;height:26px;cursor:pointer;';
        $html .= '               font-size:0.9rem;font-weight:bold;"';
        $html .= '        onmouseover="this.style.background=\'rgba(255,255,255,0.35)\'"';
        $html .= '        onmouseout="this.style.background=\'rgba(255,255,255,0.2)\'">✕</button>';

        $html .= '    </div>';
        $html .= '  </div>';

        // iframe cargado de forma diferida (src vacío; se asigna al primer clic)
        $html .= '  <iframe id="sira-iframe" src="" data-src="' . $iframeSrc . '"';
        $html .= '    style="width:100%;flex:1;border:none;background:#f5f5f5;"';
        $html .= '    allow="clipboard-write" title="ChatSIRA"></iframe>';

        $html .= '</div>';

        // ── FAB (botón burbuja): visible solo cuando el widget está minimizado ─
        $html .= '<button id="sira-fab" onclick="openSiraWidget()" title="Abrir ChatSIRA"';
        $html .= '  style="display:none;position:fixed;bottom:24px;right:24px;z-index:99999;';
        $html .= '         width:56px;height:56px;border-radius:50%;background:#C8102E;';
        $html .= '         border:none;color:#fff;cursor:pointer;';
        $html .= '         box-shadow:0 4px 16px rgba(200,16,46,0.45);';
        $html .= '         align-items:center;justify-content:center;"';
        $html .= '  onmouseover="this.style.background=\'#a00d24\'"';
        $html .= '  onmouseout="this.style.background=\'#C8102E\'">';
        $html .= '  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">';
        $html .= '    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>';
        $html .= '  </svg>';
        $html .= '</button>';

        // ── JavaScript: carga diferida del iframe + control del widget ────────
        $html .= '<script>';
        $html .= '(function(){';
        $html .= '  var loaded = false;';

        $html .= '  window.openSiraWidget = function() {';
        $html .= '    var w = document.getElementById("sira-widget");';
        $html .= '    var fab = document.getElementById("sira-fab");';
        $html .= '    var iframe = document.getElementById("sira-iframe");';
        $html .= '    if (!loaded) { iframe.src = iframe.dataset.src; loaded = true; }';
        $html .= '    w.style.display = "flex";';
        $html .= '    fab.style.display = "none";';
        $html .= '  };';

        $html .= '  window.minimizeSiraWidget = function() {';
        $html .= '    document.getElementById("sira-widget").style.display = "none";';
        $html .= '    document.getElementById("sira-fab").style.display = "flex";';
        $html .= '  };';

        $html .= '  window.closeSiraWidget = function() {';
        $html .= '    document.getElementById("sira-widget").style.display = "none";';
        $html .= '    document.getElementById("sira-fab").style.display = "none";';
        $html .= '  };';

        $html .= '})();';
        $html .= '</script>';

        return $html;
    }

    public function applicable_formats() {
        return ['all' => true];
    }

    public function has_config() {
        return true;
    }

    public function instance_allow_multiple() {
        return false;
    }
}
