const router = require('express').Router();
const auth = require('../middleware/auth');
const upload = require('../middleware/upload.js');
const ctrl = require('../controllers/authController');

router.post('/register', ctrl.register);
router.post('/login', ctrl.login);
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

router.get('/me', auth, ctrl.me);
router.put('/company', auth, ctrl.updateCompany);
router.post('/logo', auth, upload.single('logo'), ctrl.uploadLogo);
router.get('/next-invoice-number', auth, ctrl.nextInvoiceNumber);

module.exports = router;
