const express = require('express');
const router  = express.Router();
const { listUsers, createUser, updateUser, disableUser } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',                   listUsers);
router.post('/',                  createUser);
router.put('/:id',                updateUser);
router.patch('/:id/deshabilitar', disableUser);

module.exports = router;
