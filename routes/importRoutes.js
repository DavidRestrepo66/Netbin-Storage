const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const { importData } = require('../controllers/importController');
const { protect }    = require('../middleware/authMiddleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(csv|xlsx|xls)$/i.test(file.originalname);
    if (!ok) return cb(new Error('Solo se aceptan archivos .csv, .xlsx o .xls.'));
    cb(null, true);
  }
});

// Wrapper para que los errores de multer (tamaño, tipo) caigan como JSON.
const handleUpload = (req, res, next) =>
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ success: false, message: err.message });
    next();
  });

router.post('/', protect, handleUpload, importData);

module.exports = router;
