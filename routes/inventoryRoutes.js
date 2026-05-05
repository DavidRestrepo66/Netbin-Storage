const express = require('express');
const router  = express.Router();
const { listRecords, createRecord } = require('../controllers/inventoryController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/:tipo',  listRecords);
router.post('/:tipo', createRecord);

module.exports = router;
