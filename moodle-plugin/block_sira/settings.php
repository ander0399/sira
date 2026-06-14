<?php
// Configuración del plugin SIRA para administradores de Moodle.
// Se muestra en Administración del sitio → Plugins → Bloques → SIRA.

defined('MOODLE_INTERNAL') || die();

if ($ADMIN->fulltree) {

    // URL del frontend React de SIRA
    $settings->add(new admin_setting_configtext(
        'block_sira/siraurl',
        get_string('setting_siraurl', 'block_sira'),
        get_string('setting_siraurl_desc', 'block_sira'),
        'http://localhost:5173',
        PARAM_URL
    ));

    // Nombre corto del servicio externo de Moodle para SIRA
    $settings->add(new admin_setting_configtext(
        'block_sira/servicename',
        get_string('setting_servicename', 'block_sira'),
        get_string('setting_servicename_desc', 'block_sira'),
        'sira_service',
        PARAM_ALPHANUMEXT
    ));
}
