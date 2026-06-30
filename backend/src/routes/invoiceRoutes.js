const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/invoiceController');

router.use(auth);
router.get('/stats/dashboard', ctrl.dashboardStats);
router.get('/', ctrl.list);
router.get('/:id', ctrl.getOne);
router.get('/:id/pdf', ctrl.downloadPdf);
router.post('/:id/send', ctrl.sendByEmail);
router.post('/:id/duplicate', ctrl.duplicate);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
