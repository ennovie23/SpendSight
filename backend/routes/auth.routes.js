const express = require('express');
const {
  googleLogin,
  passwordLogin,
  updatePassword,
  getStatus,
  forgotPassword,
  resetPassword,
} = require('../controllers/auth.controller');

const router = express.Router();

router.post('/google', googleLogin);
router.post('/password', passwordLogin);
router.post('/password/update', updatePassword);
router.get('/status', getStatus);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;