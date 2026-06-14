<?php
// Punto de entrada SSO: valida la sesión de Moodle, genera el token REST del usuario
// para el servicio SIRA y redirige al frontend con el token y rol en los parámetros URL.

require_once('../../config.php');
require_login();

global $DB, $USER;

// Validar y limpiar el parámetro de rol
$role = required_param('role', PARAM_ALPHA);
if (!in_array($role, ['student', 'teacher'])) {
    $role = 'student';
}

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
    print_error('servicenotfound', 'block_sira', '', null, "Servicio '$serviceName' no encontrado o deshabilitado.");
}

// Generar (o recuperar) el token REST del usuario para este servicio.
// external_generate_token_for_current_user() crea uno nuevo si no existe,
// o devuelve el vigente si ya fue generado para este usuario+servicio.
$tokenRecord = external_generate_token_for_current_user($service);

if (empty($tokenRecord->token)) {
    print_error('nopermission', 'block_sira');
}

// Construir la URL de destino en el frontend de SIRA
$siraUrl = rtrim(get_config('block_sira', 'siraurl') ?: 'http://localhost:5173', '/');

$params = http_build_query([
    'moodleToken' => $tokenRecord->token,
    'role'        => $role,
]);

// Redirigir al login de SIRA con el token y el rol
redirect($siraUrl . '/login?' . $params);
