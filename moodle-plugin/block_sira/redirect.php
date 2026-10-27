<?php
// Punto de entrada SSO: valida la sesión de Moodle, genera el token REST del usuario
// para el servicio SIRA y redirige al frontend con el token y rol en los parámetros URL.

require_once('../../config.php');
require_login();

global $DB, $USER, $CFG;

// Validar y limpiar el parámetro de rol
$role = required_param('role', PARAM_ALPHA);
if (!in_array($role, ['student', 'teacher'])) {
    $role = 'student';
}

// Curso desde el que se abrió el plugin (0 = fuera de un curso específico)
$courseId = optional_param('courseId', 0, PARAM_INT);

// Obtener el nombre corto del servicio desde la configuración del plugin
$serviceName = get_config('block_sira', 'servicename') ?: 'sira_service';

// Buscar el servicio externo en la BD de Moodle
$service = $DB->get_record(
    'external_services',
    ['shortname' => $serviceName, 'enabled' => 1],
    '*',
    IGNORE_MISSING
);

if (!$service) {
    print_error('servicenotfound', 'block_sira', '', null,
        "Servicio '$serviceName' no encontrado o deshabilitado. " .
        "Ve a Administración del sitio → Plugins → Servicios web → Servicios externos y habilita 'SIRA Academic Service'.");
}

// Buscar token permanente existente para este usuario+servicio.
// Enfoque directo compatible con Moodle 4.4+ (external_generate_token_for_current_user fue removida en 4.4).
$tokenRecord = $DB->get_record('external_tokens', [
    'userid'            => $USER->id,
    'externalserviceid' => $service->id,
    'tokentype'         => EXTERNAL_TOKEN_PERMANENT,
]);

if (!$tokenRecord) {
    $context = context_system::instance();

    $tokendata                    = new stdClass();
    $tokendata->token             = md5(uniqid(rand(), true));
    $tokendata->privatetoken      = random_string(64);
    $tokendata->tokentype         = EXTERNAL_TOKEN_PERMANENT;
    $tokendata->userid            = $USER->id;
    $tokendata->externalserviceid = $service->id;
    $tokendata->contextid         = $context->id;
    $tokendata->creatorid         = $USER->id;
    $tokendata->timecreated       = time();
    $tokendata->validuntil        = 0;
    $tokendata->iprestriction     = null;
    $tokendata->sid               = null;
    $tokendata->lastaccess        = null;

    $DB->insert_record('external_tokens', $tokendata);
    $tokenRecord = $DB->get_record('external_tokens', ['token' => $tokendata->token]);
}

if (empty($tokenRecord->token)) {
    print_error('nopermission', 'block_sira');
}

// Construir la URL de destino en el frontend de SIRA
$siraUrl = rtrim(get_config('block_sira', 'siraurl') ?: 'http://localhost:5173', '/');

$params = ['moodleToken' => $tokenRecord->token, 'role' => $role];
if ($courseId > 0) {
    $params['courseId'] = $courseId;
}

// Redirigir al login de SIRA con el token, el rol y (si aplica) el curso activo
redirect($siraUrl . '/login?' . http_build_query($params));
