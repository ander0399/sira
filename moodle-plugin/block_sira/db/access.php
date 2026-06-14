<?php
// Capacidades (permisos) del bloque SIRA.

defined('MOODLE_INTERNAL') || die();

$capabilities = [

    // Permite agregar el bloque a páginas de curso/sitio (admins y docentes)
    'block/sira:addinstance' => [
        'riskbitmask'  => RISK_SPAM | RISK_XSS,
        'captype'      => 'write',
        'contextlevel' => CONTEXT_BLOCK,
        'archetypes'   => [
            'editingteacher' => CAP_ALLOW,
            'manager'        => CAP_ALLOW,
        ],
        'clonepermissionsfrom' => 'moodle/site:manageblocks',
    ],

    // Permite agregar el bloque al dashboard personal (todos los usuarios)
    'block/sira:myaddinstance' => [
        'captype'      => 'write',
        'contextlevel' => CONTEXT_SYSTEM,
        'archetypes'   => [
            'user' => CAP_ALLOW,
        ],
        'clonepermissionsfrom' => 'moodle/my:manageblocks',
    ],
];
