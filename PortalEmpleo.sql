CREATE DATABASE IF NOT EXISTS portal_empleo_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE portal_empleo_db;

-- 1. Tabla de Usuarios (Candidatos, Empresas y Administradores)
CREATE TABLE usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido_razon VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    telefono VARCHAR(25),
    rol ENUM('CANDIDATO', 'EMPRESA', 'ADMIN') NOT NULL DEFAULT 'CANDIDATO',
    cv_nombre_archivo VARCHAR(255),
    visitas_perfil INT DEFAULT 0,
    estado ENUM('ACTIVO', 'SUSPENDIDO') DEFAULT 'ACTIVO',
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=INNODB;

-- 2. Tabla de Empresas
CREATE TABLE empresas (
    id_empresa INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario_dueno INT NOT NULL,
    nombre_empresa VARCHAR(150) NOT NULL,
    sector VARCHAR(100),
    ubicacion VARCHAR(150),
    descripcion TEXT,
    verificada TINYINT(1) DEFAULT 0,
    CONSTRAINT fk_empresa_usuario FOREIGN KEY (id_usuario_dueno)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=INNODB;

-- 3. Tabla de Vacantes / Empleos
CREATE TABLE vacantes (
    id_vacante INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    titulo VARCHAR(150) NOT NULL,
    ubicacion VARCHAR(120) NOT NULL,
    modalidad ENUM('Remoto', 'Híbrido', 'Presencial') NOT NULL DEFAULT 'Presencial',
    tipo_contrato VARCHAR(50) DEFAULT 'Tiempo Completo',
    nivel_experiencia VARCHAR(50),
    sector VARCHAR(100),
    salario_min DECIMAL(10,2),
    salario_max DECIMAL(10,2),
    descripcion TEXT NOT NULL,
    requisitos TEXT NOT NULL,
    estado ENUM('ACTIVA', 'CERRADA') DEFAULT 'ACTIVA',
    fecha_publicacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_vacante_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa) ON DELETE CASCADE
) ENGINE=INNODB;

-- 4. Tabla de Postulaciones
CREATE TABLE postulaciones (
    id_postulacion INT AUTO_INCREMENT PRIMARY KEY,
    id_vacante INT NOT NULL,
    id_candidato INT NOT NULL,
    carta_presentacion TEXT,
    estado ENUM('En Revisión', 'Preseleccionada', 'Rechazada') DEFAULT 'En Revisión',
    fecha_postulacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_vacante_candidato (id_vacante, id_candidato),
    CONSTRAINT fk_postulacion_vacante FOREIGN KEY (id_vacante)
        REFERENCES vacantes(id_vacante) ON DELETE CASCADE,
    CONSTRAINT fk_postulacion_candidato FOREIGN KEY (id_candidato)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=INNODB;

-- 5. Tabla de Valoraciones de Empresas
CREATE TABLE valoraciones (
    id_valoracion INT AUTO_INCREMENT PRIMARY KEY,
    id_empresa INT NOT NULL,
    id_usuario INT NOT NULL,
    calificacion INT NOT NULL,
    comentario TEXT NOT NULL,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_valoracion_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa) ON DELETE CASCADE,
    CONSTRAINT fk_valoracion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=INNODB;

-- 6. Tabla de Alertas de Empleo
CREATE TABLE alertas_empleo (
    id_alerta INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    criterio_busqueda VARCHAR(150) NOT NULL,
    activa TINYINT(1) DEFAULT 1,
    CONSTRAINT fk_alerta_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=INNODB;

-- 7. Tabla de Foros de Discusión
CREATE TABLE foros_hilos (
    id_hilo INT AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT NOT NULL,
    categoria VARCHAR(80) NOT NULL,
    titulo VARCHAR(200) NOT NULL,
    contenido TEXT NOT NULL,
    total_respuestas INT DEFAULT 0,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_foro_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=INNODB;

-- =========================================================
-- DATOS INICIALES (SEED DATA)
-- =========================================================
INSERT INTO usuarios (nombre, apellido_razon, email, password_hash, telefono, rol, visitas_perfil, estado) VALUES
('Joseph', 'Gómez', 'joseph@portal.sv', '123456', '7000-0000', 'CANDIDATO', 1245, 'ACTIVO'),
('TechNova', 'S.A. de C.V.', 'rrhh@technova.sv', '123456', '2200-1100', 'EMPRESA', 0, 'ACTIVO'),
('Admin', 'General', 'admin@portal.sv', 'admin123', '2200-0000', 'ADMIN', 0, 'ACTIVO'),
('Eduardo Manuel', 'Castro', 'eduardo.castro@mail.com', '123456', '7111-2222', 'CANDIDATO', 320, 'ACTIVO');

INSERT INTO empresas (id_usuario_dueno, nombre_empresa, sector, ubicacion, descripcion, verificada) VALUES
(2, 'TechNova S.A.', 'Tecnología y Software', 'San Salvador, SV', 'Empresa líder en desarrollo de software financiero y cloud.', 1);

INSERT INTO vacantes (id_empresa, titulo, ubicacion, modalidad, tipo_contrato, nivel_experiencia, sector, salario_min, salario_max, descripcion, requisitos) VALUES
(1, 'Desarrollador Full Stack (Java Spring Boot + React)', 'San Salvador, SV', 'Híbrido', 'Tiempo Completo', 'Intermedio (3 - 5 años)', 'Tecnología y Software', 1600.00, 2200.00, 'Creación y mantenimiento de microservicios REST, esquemas SQL en MySQL y componentes de interfaz reactivos.', 'Mínimo 2 años de experiencia en Java, Spring Boot, React y SQL.'),
(1, 'Desarrollador Frontend Senior', 'San Salvador, SV', 'Remoto', 'Tiempo Completo', 'Senior (5+ años)', 'Tecnología y Software', 1800.00, 2400.00, 'Buscamos ingeniero con experiencia sólida en React, TypeScript y Tailwind para plataforma SaaS financiera.', 'Dominio de React, TypeScript y arquitectura frontend.'),
(1, 'Analista de QA & Automatización', 'Santa Ana, SV', 'Remoto', 'Tiempo Completo', 'Junior (0 - 2 años)', 'Tecnología y Software', 1200.00, 1700.00, 'Diseño y ejecución de planes de prueba funcional, pruebas automatizadas en Cypress/Selenium y reportes de incidencias.', 'Conocimientos en pruebas automatizadas y SQL.');

INSERT INTO postulaciones (id_vacante, id_candidato, carta_presentacion, estado) VALUES
(1, 1, 'Cuento con experiencia desarrollando APIs REST y bases de datos relacionales.', 'En Revisión'),
(2, 4, 'Apasionado por el desarrollo frontend con 3 años de experiencia.', 'Preseleccionada');

INSERT INTO alertas_empleo (id_usuario, criterio_busqueda, activa) VALUES
(1, 'Desarrollador Web (Remoto)', 1),
(1, 'Diseñador UI/UX (San Salvador)', 1),
(1, 'Administrador MySQL / Base de Datos', 0);

INSERT INTO valoraciones (id_empresa, id_usuario, calificacion, comentario) VALUES
(1, 1, 5, 'Excelente balance vida-trabajo y gran cultura técnica. Los líderes respetan los tiempos de entrega sin microgestión.');

INSERT INTO foros_hilos (id_usuario, categoria, titulo, contenido, total_respuestas) VALUES
(1, 'Tecnología y Código', '¿Cómo negociar salario en una oferta remota internacional desde El Salvador?', 'Consejos sobre retenciones, transferencias y acuerdos bajo contrato de servicios profesionales.', 45),
(4, 'Transición de Carrera', 'De soporte técnico a desarrollo web: ¿Qué proyectos pesan más en el portafolio?', 'Discusión sobre la importancia de bases de datos relacionales frente a herramientas NoSQL en prim
eras entrevistas.', 28);


USE portal_empleo_db;

ALTER TABLE vacantes
ADD COLUMN responsabilidades TEXT AFTER descripcion,
ADD COLUMN beneficios TEXT AFTER requisitos;




CREATE TABLE IF NOT EXISTS foros_respuestas (
    id_respuesta INT AUTO_INCREMENT PRIMARY KEY,
    id_hilo INT NOT NULL,
    id_usuario INT NOT NULL,
    mensaje TEXT NOT NULL,
    fecha_respuesta DATETIME DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_respuesta_hilo FOREIGN KEY (id_hilo)
        REFERENCES foros_hilos(id_hilo) ON DELETE CASCADE,
    CONSTRAINT fk_respuesta_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE CASCADE
) ENGINE=INNODB;

-- Respuestas iniciales de ejemplo
INSERT INTO foros_respuestas (id_hilo, id_usuario, mensaje) VALUES
(1, 2, 'Recomendamos solicitar el formulario W-8BEN y utilizar transferencias internacionales SWIFT o plataformas con respaldo bancario local.'),
(2, 1, 'Un proyecto completo con autenticación, base de datos relacional y despliegue funcional pesa mucho más que varios ejercicios sueltos.');