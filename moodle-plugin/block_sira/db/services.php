<?php
// Define el servicio externo de Moodle que SIRA utiliza para las llamadas REST.
// Al instalar el plugin, Moodle crea automáticamente este servicio.

defined('MOODLE_INTERNAL') || die();

$services = [
    'SIRA Academic Service' => [
        'shortname'          => 'sira_service',
        'functions'          => [
            'core_webservice_get_site_info',       // Validar token e info del usuario
            'core_enrol_get_users_courses',        // Cursos inscritos del estudiante
            'gradereport_user_get_grades_table',   // Calificaciones del estudiante
            'core_course_get_contents',            // Contenidos de un curso
            'mod_assign_get_submissions',          // Entregas de tareas
            'core_enrol_get_enrolled_users',       // Estudiantes de un curso (para docentes)
        ],
        'requiredcapability' => '',   // Sin restricción adicional de capacidad
        'restrictedusers'    => 0,    // Todos los usuarios pueden usar el servicio
        'enabled'            => 1,
        'downloadfiles'      => 0,
        'uploadfiles'        => 0,
    ],
];
