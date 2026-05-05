const express = require('express');
const router  = express.Router();
const { listReports, generateReport, createReport, deleteReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',                listReports);
router.post('/',               createReport);
router.get('/:id/generate',    generateReport);
router.delete('/:id',          deleteReport);

module.exports = router;
