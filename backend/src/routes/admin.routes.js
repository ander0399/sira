const { Router } = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');
const {
  getStats, getUsers, getTeachersReport,
  getSystemHealth, getAdmins, createAdmin, deleteAdmin,
  sendAdminMessage,
} = require('../controllers/admin.controller');

const router = Router();

router.use(verifyToken, requireAdmin);

router.get('/stats',           getStats);
router.get('/users',           getUsers);
router.get('/teachers/report', getTeachersReport);
router.get('/system-health',   getSystemHealth);
router.get('/admins',          getAdmins);
router.post('/admins',         createAdmin);
router.delete('/admins/:id',   deleteAdmin);
router.post('/chat',           sendAdminMessage);

module.exports = router;
