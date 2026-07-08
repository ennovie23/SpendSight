const express = require('express');
const router = express.Router();
const txController = require('../controllers/tx.controller');

router.post('/', txController.addExpense);
router.get('/', txController.getExpenses);
router.put('/:id', txController.updateExpense);
router.delete('/:id', txController.deleteExpense);

// New Trash bin endpoints
router.get('/trash', txController.getTrashedExpenses);
router.post('/restore/:id', txController.restoreExpense);
router.delete('/purge/:id', txController.purgeExpense);
router.delete('/trash/clear', txController.clearTrash);
router.get('/analytics', txController.getAnalytics);

module.exports = router;
