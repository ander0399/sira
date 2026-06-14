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
     * Genera el HTML del bloque: botón que abre SIRA en un modal con iframe.
     * El iframe carga redirect.php, que genera el token Moodle y redirige
     * al frontend de SIRA con autenticación automática.
     */
    private function renderContent(moodle_url $redirectUrl, string $role, string $firstname) {
        $isTeacher  = $role === 'teacher';
        $desc       = get_string($isTeacher ? 'sira_description_teacher' : 'sira_description_student', 'block_sira');
        $btnLabel   = get_string('open_sira', 'block_sira');
        $iframeSrc  = htmlspecialchars($redirectUrl->out(false), ENT_QUOTES);

        $html  = '<div style="font-family:inherit;">';

        // Descripción breve
        $html .= '  <p style="font-size:0.8rem; color:#666; margin:0 0 12px; line-height:1.4;">';
        $html .= '    ' . format_string($desc);
        $html .= '  </p>';

        // Botón de apertura del modal
        $html .= '  <button onclick="document.getElementById(\'sira-modal\').style.display=\'flex\'" ';
        $html .= '    style="display:flex; align-items:center; justify-content:center; gap:8px; width:100%; ';
        $html .= '           background:#C8102E; color:#fff; border:none; padding:10px 16px; ';
        $html .= '           border-radius:8px; cursor:pointer; font-weight:600; font-size:0.85rem; ';
        $html .= '           transition:background 0.2s;" ';
        $html .= '    onmouseover="this.style.background=\'#a00d24\'" ';
        $html .= '    onmouseout="this.style.background=\'#C8102E\'">';
        $html .= '    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
        $html .= '    ' . format_string($btnLabel);
        $html .= '  </button>';

        $html .= '</div>';

        // ── Modal con iframe ─────────────────────────────────────────────────────
        // Montado fuera del bloque para que ocupe toda la pantalla del navegador.
        $html .= '<div id="sira-modal" ';
        $html .= '  style="display:none; position:fixed; inset:0; z-index:99999; ';
        $html .= '         background:rgba(0,0,0,0.80); align-items:center; justify-content:center;">';

        $html .= '  <div style="width:96vw; height:94vh; background:#fff; border-radius:14px; ';
        $html .= '              overflow:hidden; position:relative; box-shadow:0 30px 60px rgba(0,0,0,0.5);">';

        // Barra superior del modal
        $html .= '    <div style="display:flex; align-items:center; justify-content:space-between; ';
        $html .= '                padding:10px 16px; background:#C8102E; color:#fff;">';
        $html .= '      <span style="font-weight:700; font-size:0.95rem;">ChatSIRA — UFPS</span>';
        $html .= '      <button onclick="document.getElementById(\'sira-modal\').style.display=\'none\'" ';
        $html .= '        style="background:rgba(255,255,255,0.2); border:none; color:#fff; ';
        $html .= '               border-radius:6px; padding:4px 10px; cursor:pointer; font-size:1.1rem; ';
        $html .= '               line-height:1; font-weight:bold; transition:background 0.2s;" ';
        $html .= '        onmouseover="this.style.background=\'rgba(255,255,255,0.35)\'" ';
        $html .= '        onmouseout="this.style.background=\'rgba(255,255,255,0.2)\'">✕</button>';
        $html .= '    </div>';

        // iframe que carga SIRA con autenticación automática
        $html .= '    <iframe src="' . $iframeSrc . '" ';
        $html .= '      style="width:100%; height:calc(100% - 46px); border:none;" ';
        $html .= '      allow="clipboard-write" title="ChatSIRA"></iframe>';

        $html .= '  </div>';
        $html .= '</div>';

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
