const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = 8080;

app.use(cors());
app.use(express.json());

// Servir el frontend (index.html, css, js) desde la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Rutas de la API REST
app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Servidor PortalEmpleo corriendo en http://localhost:${PORT}`);
});