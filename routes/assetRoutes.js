const express = require('express');
const router  = express.Router();
const { listAssets, createAsset, updateAsset, deactivateAsset } = require('../controllers/assetController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/',           listAssets);
router.post('/',          createAsset);
router.put('/:id',        updateAsset);
router.patch('/:id/baja', deactivateAsset);

module.exports = router;
