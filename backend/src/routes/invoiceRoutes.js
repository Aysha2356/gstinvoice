const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/invoiceController');

// Protect all routes
router.use(auth);

// Dashboard stats
router.get('/stats/dashboard', ctrl.dashboardStats);

// Invoice CRUD
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

// PDF & Email
router.get('/:id/pdf', ctrl.downloadPdf);
router.post('/:id/send', ctrl.sendByEmail);

module.exports = router;