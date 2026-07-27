const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/google', authController.googleLogin);
router.post('/password', authController.passwordLogin);
router.post('/password/update', authController.updatePassword);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);
router.get('/status', authController.getStatus);

module.exports = router;
