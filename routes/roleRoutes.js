const express = require('express');
const router  = express.Router();
const { listRoles, createRole, updateRole } = require('../controllers/roleController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',    listRoles);
router.post('/',   createRole);
router.put('/:id', updateRole);

module.exports = router;
