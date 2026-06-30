const router = require('express').Router();
const auth = require('../middleware/auth');
const ctrl = require('../controllers/reminderController');

router.use(auth);
router.post('/:invoiceId/draft', ctrl.draftReminder);

module.exports = router;
