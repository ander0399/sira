const { Router } = require('express');
const { verifyToken, requireAdmin } = require('../middleware/auth.middleware');
const { getStats, getUsers, getTeachersReport } = require('../controllers/admin.controller');

const router = Router();

router.use(verifyToken, requireAdmin);

router.get('/stats',           getStats);
router.get('/users',           getUsers);
router.get('/teachers/report', getTeachersReport);

module.exports = router;
