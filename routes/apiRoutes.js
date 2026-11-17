const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/portalController');

// Configuración de almacenamiento y validación estricta de PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../public/uploads/cv'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `cv_usuario_${req.params.id}_${uniqueSuffix}.pdf`);
  }
});

const uploadPdf = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Máximo 5 MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (file.mimetype === 'application/pdf' && ext === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Formato no válido. Únicamente se permiten archivos PDF (.pdf).'));
    }
  }
});

// Autenticación y Usuario
router.post('/auth/login', ctrl.login);
router.post('/auth/registro', ctrl.registro);
router.put('/usuarios/:id', ctrl.actualizarPerfil);

// Carga de CV en PDF con manejo de error de extensión
router.post('/usuarios/:id/cv', (req, res) => {
  uploadPdf.single('cv')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    ctrl.subirCv(req, res);
  });
});

// Vacantes
router.get('/vacantes', ctrl.listarVacantes);
router.post('/vacantes', ctrl.crearVacante);

// Postulaciones
router.get('/postulaciones', ctrl.listarPostulaciones);
router.post('/postulaciones', ctrl.crearPostulacion);
router.put('/postulaciones/:id/estado', ctrl.cambiarEstadoPostulacion);

// Valoraciones y Foros
router.post('/valoraciones', ctrl.crearValoracion);
router.get('/foros', ctrl.listarForos);
router.post('/foros', ctrl.crearHiloForo);
router.get('/foros/:id/respuestas', ctrl.listarRespuestasForo);
router.post('/foros/:id/respuestas', ctrl.crearRespuestaForo);

// Administración
router.get('/admin/usuarios', ctrl.listarUsuariosAdmin);
router.put('/admin/usuarios/:id/estado', ctrl.alternarEstadoUsuario);

// Módulo Empresarial: Dashboard y Control de Ofertas
router.get('/empresa/dashboard/:idUsuario', ctrl.obtenerDashboardEmpresa);
router.put('/vacantes/:id/estado', ctrl.alternarEstadoVacante);
router.delete('/vacantes/:id', ctrl.eliminarVacanteEmpresa);

module.exports = router;