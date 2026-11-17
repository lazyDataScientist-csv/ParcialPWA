const db = require('../config/db');

// --- AUTENTICACIÓN Y PERFIL ---
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query(
      'SELECT * FROM usuarios WHERE email = ? AND password_hash = ?',
      [email, password]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Correo o contraseña incorrectos.' });
    }

    const usuario = rows[0];
    if (usuario.estado === 'SUSPENDIDO') {
      return res.status(403).json({ error: 'Tu cuenta se encuentra suspendida.' });
    }

    res.json({
      idUsuario: usuario.id_usuario,
      nombre: usuario.nombre,
      apellidoRazon: usuario.apellido_razon,
      email: usuario.email,
      telefono: usuario.telefono,
      rol: usuario.rol,
      cvNombreArchivo: usuario.cv_nombre_archivo,
      visitasPerfil: usuario.visitas_perfil,
      estado: usuario.estado
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.registro = async (req, res) => {
  try {
    const { nombre, apellidoRazon, email, passwordHash, rol } = req.body;
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, apellido_razon, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
      [nombre, apellidoRazon, email, passwordHash, rol || 'CANDIDATO']
    );

    const idUsuario = result.insertId;

    if (rol === 'EMPRESA') {
      await db.query(
        'INSERT INTO empresas (id_usuario_dueno, nombre_empresa, ubicacion, verificada) VALUES (?, ?, ?, 1)',
        [idUsuario, `${nombre} ${apellidoRazon}`, 'El Salvador']
      );
    }

    res.status(201).json({
      idUsuario,
      nombre,
      apellidoRazon,
      email,
      rol: rol || 'CANDIDATO'
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.actualizarPerfil = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellidoRazon, email, telefono } = req.body;

    await db.query(
      'UPDATE usuarios SET nombre = ?, apellido_razon = ?, email = ?, telefono = ? WHERE id_usuario = ?',
      [nombre, apellidoRazon, email, telefono, id]
    );

    res.json({ idUsuario: Number(id), nombre, apellidoRazon, email, telefono });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.subirCv = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'Debes seleccionar un archivo en formato PDF (.pdf).' });
    }

    const nombreArchivo = req.file.filename;
    await db.query(
      'UPDATE usuarios SET cv_nombre_archivo = ? WHERE id_usuario = ?',
      [nombreArchivo, id]
    );

    res.json({
      cvNombreArchivo: nombreArchivo,
      originalName: req.file.originalname
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- VACANTES CON FILTROS AVANZADOS ---
exports.listarVacantes = async (req, res) => {
  try {
    const { q, ubicacion, modalidad, experiencia, contratos, sector, salarioMin, orden } = req.query;
    let sql = `
      SELECT v.*, e.nombre_empresa 
      FROM vacantes v 
      LEFT JOIN empresas e ON v.id_empresa = e.id_empresa 
      WHERE v.estado = 'ACTIVA'
    `;
    const params = [];

    if (q) {
      sql += ' AND (v.titulo LIKE ? OR v.descripcion LIKE ?)';
      params.push(`%${q}%`, `%${q}%`);
    }
    if (ubicacion) {
      sql += ' AND v.ubicacion LIKE ?';
      params.push(`%${ubicacion}%`);
    }
    if (modalidad) {
      sql += ' AND v.modalidad = ?';
      params.push(modalidad);
    }
    if (experiencia && experiencia !== 'Cualquier nivel') {
      sql += ' AND v.nivel_experiencia = ?';
      params.push(experiencia);
    }
    if (sector && sector !== 'Todos los sectores') {
      sql += ' AND v.sector = ?';
      params.push(sector);
    }
    if (salarioMin && Number(salarioMin) > 500) {
      sql += ' AND v.salario_max >= ?';
      params.push(Number(salarioMin));
    }
    if (contratos) {
      const listaContratos = contratos.split(',').filter(Boolean);
      if (listaContratos.length > 0) {
        const placeholders = listaContratos.map(() => '?').join(',');
        sql += ` AND v.tipo_contrato IN (${placeholders})`;
        params.push(...listaContratos);
      }
    }

    if (orden === 'salario') {
      sql += ' ORDER BY v.salario_max DESC';
    } else {
      sql += ' ORDER BY v.fecha_publicacion DESC';
    }

    const [rows] = await db.query(sql, params);

    const formateadas = rows.map((r) => ({
      idVacante: r.id_vacante,
      titulo: r.titulo,
      ubicacion: r.ubicacion,
      modalidad: r.modalidad,
      tipoContrato: r.tipo_contrato,
      nivelExperiencia: r.nivel_experiencia,
      sector: r.sector,
      salarioMin: r.salario_min,
      salarioMax: r.salario_max,
      descripcion: r.descripcion,
      responsabilidades: r.responsabilidades,
      requisitos: r.requisitos,
      beneficios: r.beneficios,
      fechaPublicacion: r.fecha_publicacion,
      empresa: { nombreEmpresa: r.nombre_empresa || 'TechNova S.A.' }
    }));

    res.json(formateadas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.crearVacante = async (req, res) => {
  try {
    const {
      titulo,
      ubicacion,
      modalidad,
      tipoContrato,
      nivelExperiencia,
      sector,
      salarioMin,
      salarioMax,
      descripcion,
      responsabilidades,
      requisitos,
      beneficios
    } = req.body;

    const [result] = await db.query(
      `INSERT INTO vacantes (id_empresa, titulo, ubicacion, modalidad, tipo_contrato, nivel_experiencia, sector, salario_min, salario_max, descripcion, responsabilidades, requisitos, beneficios)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo,
        ubicacion,
        modalidad,
        tipoContrato || 'Tiempo Completo',
        nivelExperiencia,
        sector || 'Tecnología y Software',
        salarioMin,
        salarioMax,
        descripcion,
        responsabilidades,
        requisitos,
        beneficios
      ]
    );
    res.status(201).json({ idVacante: result.insertId, titulo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- POSTULACIONES ---
exports.listarPostulaciones = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, v.titulo, u.id_usuario, u.nombre, u.apellido_razon, u.cv_nombre_archivo
      FROM postulaciones p
      JOIN vacantes v ON p.id_vacante = v.id_vacante
      JOIN usuarios u ON p.id_candidato = u.id_usuario
      ORDER BY p.fecha_postulacion DESC
    `);

    const formateadas = rows.map((r) => ({
      idPostulacion: r.id_postulacion,
      cartaPresentacion: r.carta_presentacion,
      estado: r.estado,
      fechaPostulacion: r.fecha_postulacion,
      vacante: { titulo: r.titulo },
      candidato: {
        idUsuario: r.id_usuario,
        nombre: r.nombre,
        apellidoRazon: r.apellido_razon,
        cvNombreArchivo: r.cv_nombre_archivo
      }
    }));

    res.json(formateadas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.crearPostulacion = async (req, res) => {
  try {
    const { idVacante, idCandidato, cartaPresentacion } = req.body;
    const [result] = await db.query(
      'INSERT INTO postulaciones (id_vacante, id_candidato, carta_presentacion) VALUES (?, ?, ?)',
      [idVacante, idCandidato, cartaPresentacion]
    );
    res.status(201).json({ idPostulacion: result.insertId });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Ya te has postulado anteriormente a esta vacante.' });
    }
    res.status(500).json({ error: err.message });
  }
};

exports.cambiarEstadoPostulacion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;
    await db.query('UPDATE postulaciones SET estado = ? WHERE id_postulacion = ?', [estado, id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- VALORACIONES Y FOROS ---
// --- VALORACIONES Y FOROS ---
exports.crearValoracion = async (req, res) => {
  try {
    const { idEmpresa, idUsuario, calificacion, comentario } = req.body;
    const [result] = await db.query(
      'INSERT INTO valoraciones (id_empresa, id_usuario, calificacion, comentario) VALUES (?, ?, ?, ?)',
      [idEmpresa, idUsuario, calificacion, comentario]
    );
    res.status(201).json({ idValoracion: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarForos = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT f.*, u.nombre, u.apellido_razon, u.rol
      FROM foros_hilos f 
      LEFT JOIN usuarios u ON f.id_usuario = u.id_usuario 
      ORDER BY f.fecha_creacion DESC
    `);

    const formateados = rows.map((r) => ({
      idHilo: r.id_hilo,
      categoria: r.categoria,
      titulo: r.titulo,
      contenido: r.contenido,
      totalRespuestas: r.total_respuestas,
      fechaCreacion: r.fecha_creacion,
      usuario: {
        nombre: r.nombre ? `${r.nombre} ${r.apellido_razon || ''}`.trim() : 'Usuario',
        rol: r.rol || 'CANDIDATO'
      }
    }));

    res.json(formateados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.crearHiloForo = async (req, res) => {
  try {
    const { idUsuario, categoria, titulo, contenido } = req.body;
    const [result] = await db.query(
      'INSERT INTO foros_hilos (id_usuario, categoria, titulo, contenido, total_respuestas) VALUES (?, ?, ?, ?, 0)',
      [idUsuario, categoria, titulo, contenido]
    );
    res.status(201).json({ idHilo: result.insertId, titulo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.listarRespuestasForo = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(`
      SELECT r.*, u.nombre, u.apellido_razon, u.rol
      FROM foros_respuestas r
      JOIN usuarios u ON r.id_usuario = u.id_usuario
      WHERE r.id_hilo = ?
      ORDER BY r.fecha_respuesta ASC
    `, [id]);

    const formateadas = rows.map((r) => ({
      idRespuesta: r.id_respuesta,
      mensaje: r.mensaje,
      fechaRespuesta: r.fecha_respuesta,
      autor: `${r.nombre} ${r.apellido_razon || ''}`.trim(),
      rol: r.rol
    }));

    res.json(formateadas);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.crearRespuestaForo = async (req, res) => {
  try {
    const { id } = req.params;
    const { idUsuario, mensaje } = req.body;

    await db.query(
      'INSERT INTO foros_respuestas (id_hilo, id_usuario, mensaje) VALUES (?, ?, ?)',
      [id, idUsuario, mensaje]
    );

    await db.query(
      'UPDATE foros_hilos SET total_respuestas = total_respuestas + 1 WHERE id_hilo = ?',
      [id]
    );

    res.status(201).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// --- PANEL ADMINISTRATIVO ---
exports.listarUsuariosAdmin = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM usuarios');
    const formateados = rows.map((u) => ({
      idUsuario: u.id_usuario,
      nombre: u.nombre,
      apellidoRazon: u.apellido_razon,
      email: u.email,
      rol: u.rol,
      estado: u.estado
    }));
    res.json(formateados);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.alternarEstadoUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    await db.query(
      "UPDATE usuarios SET estado = IF(estado = 'ACTIVO', 'SUSPENDIDO', 'ACTIVO') WHERE id_usuario = ?",
      [id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};