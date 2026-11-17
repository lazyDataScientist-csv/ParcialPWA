const API_URL = 'http://localhost:8080/api';
let vacanteSeleccionadaId = 1;
let calificacionSeleccionada = 5;
let filtrosBusqueda = {
  q: '',
  ubicacion: '',
  modalidad: '',
  experiencia: '',
  contratos: [],
  sector: '',
  salarioMin: 500,
  orden: 'recientes'
};

// Mapa de secciones permitidas por rol
const PERMISOS_POR_ROL = {
  INVITADO: ['vista-inicio', 'vista-busqueda', 'vista-detalle-empleo', 'vista-recursos', 'vista-foros'],
  CANDIDATO: ['vista-inicio', 'vista-busqueda', 'vista-detalle-empleo', 'vista-recursos', 'vista-foros', 'vista-perfil'],
  EMPRESA: ['vista-inicio', 'vista-busqueda', 'vista-detalle-empleo', 'vista-empresarial', 'vista-recursos', 'vista-foros'],
  ADMIN: ['vista-inicio', 'vista-busqueda', 'vista-detalle-empleo', 'vista-recursos', 'vista-foros', 'vista-admin']
};

function obtenerRolActual() {
  const sesion = JSON.parse(localStorage.getItem('usuarioPortal'));
  return sesion && sesion.rol ? sesion.rol : 'INVITADO';
}

function mostrarSeccion(idSeccion) {
  const rol = obtenerRolActual();
  const permitidas = PERMISOS_POR_ROL[rol] || PERMISOS_POR_ROL.INVITADO;

  if (!permitidas.includes(idSeccion)) {
    alert(`Acceso denegado: Tu rol (${rol}) no tiene permisos para acceder a esta sección.`);
    idSeccion = 'vista-inicio';
  }

  document.querySelectorAll('.seccion-vista').forEach((sec) => sec.classList.add('d-none'));
  const destino = document.getElementById(idSeccion);
  if (destino) {
    destino.classList.remove('d-none');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (idSeccion === 'vista-busqueda' || idSeccion === 'vista-inicio') cargarVacantes();
  if (idSeccion === 'vista-empresarial') cargarPostulacionesEmpresa();
  if (idSeccion === 'vista-foros') cargarForos();
  if (idSeccion === 'vista-perfil') cargarPerfilCompleto();
  if (idSeccion === 'vista-admin') cargarPanelAdmin();
}

document.addEventListener('DOMContentLoaded', () => {
  actualizarNavbarSesion();
  inicializarFiltrosLaterales();
  cargarVacantes();
  inicializarFormularios();
  inicializarForos();
  inicializarEstrellas();
  inicializarCargaCv();
});

// ==========================================
// 1. FILTROS INTERACTIVOS Y LISTADO DE VACANTES
// ==========================================
function inicializarFiltrosLaterales() {
  const aside = document.querySelector('#vista-busqueda aside');
  if (!aside) return;

  // Checkboxes: Tipo de Contrato
  const checkboxes = aside.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((cb) => {
    cb.checked = false;
    cb.addEventListener('change', aplicarFiltrosLaterales);
  });

  // Select: Sector Laboral
  const selectSector = aside.querySelector('select');
  if (selectSector) {
    selectSector.addEventListener('change', aplicarFiltrosLaterales);
  }

  // Radios: Nivel de Experiencia
  const radiosExp = aside.querySelectorAll('input[type="radio"][name="exp"]');
  radiosExp.forEach((radio) => {
    radio.addEventListener('change', aplicarFiltrosLaterales);
  });

  // Range: Rango Salarial Mensual
  const rangoSalario = document.getElementById('rangoSalario');
  if (rangoSalario) {
    rangoSalario.value = 500;
    const etiquetasRango = rangoSalario.parentElement.querySelectorAll('.d-flex span');
    rangoSalario.addEventListener('input', () => {
      if (etiquetasRango[0]) {
        etiquetasRango[0].textContent = `Mín: $${Number(rangoSalario.value).toLocaleString()}`;
      }
      aplicarFiltrosLaterales();
    });
  }

  // Botón Restablecer Filtros
  const btnReset = aside.querySelector('button');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      checkboxes.forEach((cb) => (cb.checked = false));
      if (selectSector) selectSector.selectedIndex = 0;
      if (radiosExp[0]) radiosExp[0].checked = true;
      if (rangoSalario) {
        rangoSalario.value = 500;
        const etiquetasRango = rangoSalario.parentElement.querySelectorAll('.d-flex span');
        if (etiquetasRango[0]) etiquetasRango[0].textContent = '$500';
      }
      filtrosBusqueda = {
        q: '',
        ubicacion: '',
        modalidad: '',
        experiencia: '',
        contratos: [],
        sector: '',
        salarioMin: 500,
        orden: 'recientes'
      };
      cargarVacantes();
    });
  }

  // Selector "Ordenar por"
  const selectOrden = document.querySelector('#vista-busqueda main select');
  if (selectOrden) {
    selectOrden.addEventListener('change', () => {
      filtrosBusqueda.orden = selectOrden.selectedIndex === 1 ? 'salario' : 'recientes';
      cargarVacantes();
    });
  }
}

function aplicarFiltrosLaterales() {
  const aside = document.querySelector('#vista-busqueda aside');
  if (!aside) return;

  // 1. Contratos marcados
  const checkboxes = aside.querySelectorAll('input[type="checkbox"]');
  const contratosMarcados = [];
  checkboxes.forEach((cb) => {
    if (cb.checked) {
      const label = aside.querySelector(`label[for="${cb.id}"]`);
      if (label) contratosMarcados.push(label.textContent.trim());
    }
  });
  filtrosBusqueda.contratos = contratosMarcados;

  // 2. Sector seleccionado
  const selectSector = aside.querySelector('select');
  filtrosBusqueda.sector = selectSector ? selectSector.value : '';

  // 3. Experiencia seleccionada
  const radioMarcado = aside.querySelector('input[type="radio"][name="exp"]:checked');
  if (radioMarcado) {
    const labelExp = aside.querySelector(`label[for="${radioMarcado.id}"]`);
    filtrosBusqueda.experiencia = labelExp ? labelExp.textContent.trim() : '';
  }

  // 4. Salario mínimo
  const rangoSalario = document.getElementById('rangoSalario');
  filtrosBusqueda.salarioMin = rangoSalario ? Number(rangoSalario.value) : 500;

  cargarVacantes();
}

async function cargarVacantes() {
  try {
    const params = new URLSearchParams();
    if (filtrosBusqueda.q) params.append('q', filtrosBusqueda.q);
    if (filtrosBusqueda.ubicacion) params.append('ubicacion', filtrosBusqueda.ubicacion);
    if (filtrosBusqueda.modalidad) params.append('modalidad', filtrosBusqueda.modalidad);
    if (filtrosBusqueda.experiencia) params.append('experiencia', filtrosBusqueda.experiencia);
    if (filtrosBusqueda.sector) params.append('sector', filtrosBusqueda.sector);
    if (filtrosBusqueda.salarioMin > 500) params.append('salarioMin', filtrosBusqueda.salarioMin);
    if (filtrosBusqueda.contratos.length > 0) params.append('contratos', filtrosBusqueda.contratos.join(','));
    if (filtrosBusqueda.orden) params.append('orden', filtrosBusqueda.orden);

    const res = await fetch(`${API_URL}/vacantes?${params.toString()}`);
    const vacantes = await res.json();

    const listaBusqueda = document.querySelector('#vista-busqueda main .d-flex.flex-column');
    const tituloContador = document.querySelector('#vista-busqueda main h5');
    if (tituloContador) {
      tituloContador.textContent = `Resultados encontrados (${vacantes.length} ${vacantes.length === 1 ? 'vacante' : 'vacantes'})`;
    }

    if (listaBusqueda) {
      if (vacantes.length === 0) {
        listaBusqueda.innerHTML = `
          <div class="card card-custom p-4 text-center text-muted">
            <i class="bi bi-search fs-2 mb-2 d-block"></i>
            <p class="mb-0">No se encontraron empleos con los filtros seleccionados. Intenta ajustar los criterios.</p>
          </div>
        `;
        return;
      }

      listaBusqueda.innerHTML = vacantes.map((v) => `
        <div class="card card-custom p-3">
          <div class="d-flex justify-content-between">
            <div>
              <h5 class="mb-1">
                <a href="#" class="text-decoration-none text-dark" onclick="verDetalleVacante(${v.idVacante})">${v.titulo}</a>
              </h5>
              <p class="text-secondary small mb-2">
                ${v.empresa ? v.empresa.nombreEmpresa : 'TechNova S.A.'} &bull; ${v.ubicacion} &bull;
                <span class="badge bg-light text-dark border">${v.modalidad}</span>
                <span class="badge bg-light text-secondary border ms-1">${v.tipoContrato || 'Tiempo Completo'}</span>
              </p>
            </div>
            <span class="fw-bold text-success">$${v.salarioMin} - $${v.salarioMax}</span>
          </div>
          <p class="small text-muted mb-2">${v.descripcion}</p>
          <div class="d-flex justify-content-between align-items-center">
            <small class="text-muted">Nivel: ${v.nivelExperiencia || 'General'} &bull; ${v.sector || 'Tecnología'}</small>
            <button class="btn btn-primary-custom btn-sm" onclick="verDetalleVacante(${v.idVacante})">Ver Detalles y Aplicar</button>
          </div>
        </div>
      `).join('');
    }
  } catch (err) {
    console.error('Error al cargar vacantes:', err);
  }
}

// Convierte texto separado por saltos de línea en elementos <li> reales
function convertirTextoAListaHtml(texto, textoPorDefecto) {
  const contenido = (texto && texto.trim()) ? texto : textoPorDefecto;
  return contenido
    .split('\n')
    .map((linea) => linea.trim())
    .filter((linea) => linea.length > 0)
    .map((linea) => `<li>${linea.replace(/^[-•*]\s*/, '')}</li>`)
    .join('');
}

async function verDetalleVacante(idVacante) {
  vacanteSeleccionadaId = idVacante;
  const res = await fetch(`${API_URL}/vacantes`);
  const vacantes = await res.json();
  const v = vacantes.find((item) => item.idVacante === idVacante);
  if (!v) return;

  const vista = document.getElementById('vista-detalle-empleo');
  vista.querySelector('h3').textContent = v.titulo;
  vista.querySelector('h4.text-success').textContent = `$${v.salarioMin} - $${v.salarioMax} / mes`;
  vista.querySelector('.badge-remote').textContent = `${v.modalidad} / ${v.ubicacion}`;

  const elDesc = document.getElementById('detalle-descripcion');
  if (elDesc) elDesc.textContent = v.descripcion;

  const elResp = document.getElementById('lista-responsabilidades');
  if (elResp) {
    elResp.innerHTML = convertirTextoAListaHtml(
      v.responsabilidades,
      'Cumplir con las funciones técnicas asignadas al puesto.'
    );
  }

  const elReq = document.getElementById('lista-requisitos');
  if (elReq) {
    elReq.innerHTML = convertirTextoAListaHtml(
      v.requisitos,
      'Experiencia comprobable en el área solicitada.'
    );
  }

  const elBen = document.getElementById('lista-beneficios');
  if (elBen) {
    elBen.innerHTML = convertirTextoAListaHtml(
      v.beneficios,
      'Prestaciones de ley y ambiente colaborativo.'
    );
  }

  const btnAplicarDetalle = vista.querySelector('[data-bs-target="#modalPostulacion"]');
  const rol = obtenerRolActual();
  if (btnAplicarDetalle) {
    if (rol === 'EMPRESA' || rol === 'ADMIN') {
      btnAplicarDetalle.classList.add('d-none');
    } else {
      btnAplicarDetalle.classList.remove('d-none');
    }
  }

  mostrarSeccion('vista-detalle-empleo');
}

// ==========================================
// 2. FORMULARIOS (LOGIN, REGISTRO, VACANTE, POSTULAR)
// ==========================================
function inicializarFormularios() {
  // Buscador Inicio
  const formInicio = document.querySelector('#vista-inicio form');
  if (formInicio) {
    formInicio.onsubmit = (e) => {
      e.preventDefault();
      const inputs = formInicio.querySelectorAll('input');
      const selects = formInicio.querySelectorAll('select');
      filtrosBusqueda.q = inputs[0].value.trim();
      filtrosBusqueda.ubicacion = inputs[1].value.trim();
      filtrosBusqueda.modalidad = selects[0].selectedIndex > 0 ? selects[0].value : '';
      filtrosBusqueda.experiencia = selects[1].selectedIndex > 0 ? selects[1].value : '';
      mostrarSeccion('vista-busqueda');
    };
  }

  // Login
  const formLogin = document.querySelector('#modalLogin form');
  if (formLogin) {
    formLogin.onsubmit = async (e) => {
      e.preventDefault();
      const email = formLogin.querySelector('input[type="email"]').value;
      const password = formLogin.querySelector('input[type="password"]').value;

      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (res.ok) {
        localStorage.setItem('usuarioPortal', JSON.stringify(data));
        bootstrap.Modal.getInstance(document.getElementById('modalLogin')).hide();
        actualizarNavbarSesion();

        if (data.rol === 'EMPRESA') mostrarSeccion('vista-empresarial');
        else if (data.rol === 'ADMIN') mostrarSeccion('vista-admin');
        else mostrarSeccion('vista-inicio');
      } else {
        alert(data.error || 'Error al iniciar sesión.');
      }
    };
  }

  // Registro
  const formRegistro = document.querySelector('#modalRegistro form');
  if (formRegistro) {
    formRegistro.onsubmit = async (e) => {
      e.preventDefault();
      const inputs = formRegistro.querySelectorAll('input');
      const rol = formRegistro.querySelector('select').selectedIndex === 0 ? 'CANDIDATO' : 'EMPRESA';

      const res = await fetch(`${API_URL}/auth/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: inputs[0].value,
          apellidoRazon: inputs[1].value,
          email: inputs[2].value,
          passwordHash: inputs[3].value,
          rol
        })
      });

      if (res.ok) {
        const usuario = await res.json();
        localStorage.setItem('usuarioPortal', JSON.stringify(usuario));
        bootstrap.Modal.getInstance(document.getElementById('modalRegistro')).hide();
        actualizarNavbarSesion();
        alert('¡Cuenta creada con éxito!');
        mostrarSeccion(usuario.rol === 'EMPRESA' ? 'vista-empresarial' : 'vista-inicio');
      }
    };
  }

  // Publicar Vacante con plantilla completa
  const formPublicar = document.getElementById('form-publicar-vacante');
  if (formPublicar) {
    formPublicar.onsubmit = async (e) => {
      e.preventDefault();
      const salarioBase = parseFloat(document.getElementById('vac-salario').value) || 1200;

      const res = await fetch(`${API_URL}/vacantes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: document.getElementById('vac-titulo').value.trim(),
          ubicacion: document.getElementById('vac-ubicacion').value.trim(),
          modalidad: document.getElementById('vac-modalidad').value,
          nivelExperiencia: document.getElementById('vac-experiencia').value,
          salarioMin: salarioBase,
          salarioMax: salarioBase + 600,
          descripcion: document.getElementById('vac-descripcion').value.trim(),
          responsabilidades: document.getElementById('vac-responsabilidades').value.trim(),
          requisitos: document.getElementById('vac-requisitos').value.trim(),
          beneficios: document.getElementById('vac-beneficios').value.trim()
        })
      });

      if (res.ok) {
        alert('¡Vacante publicada con éxito!');
        formPublicar.reset();
        cargarVacantes();
      }
    };
  }

  // Confirmar Postulación
  const btnPostular = document.querySelector('#modalPostulacion .btn-primary-custom');
  if (btnPostular) {
    btnPostular.onclick = async () => {
      const sesion = JSON.parse(localStorage.getItem('usuarioPortal'));
      if (!sesion || sesion.rol !== 'CANDIDATO') {
        alert('Debes iniciar sesión con una cuenta de candidato para postularte.');
        return;
      }
      const carta = document.querySelector('#modalPostulacion textarea').value;
      const res = await fetch(`${API_URL}/postulaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idVacante: vacanteSeleccionadaId,
          idCandidato: sesion.idUsuario,
          cartaPresentacion: carta
        })
      });
      if (res.ok) {
        alert('¡Postulación enviada con éxito!');
      } else {
        const err = await res.json();
        alert(err.error || 'No se pudo completar la postulación.');
      }
    };
  }
}

// ==========================================
// 3. MÓDULO EMPRESARIAL (POSTULACIONES Y CV REAL)
// ==========================================
async function cargarPostulacionesEmpresa() {
  const tbody = document.querySelector('#tab-postulaciones tbody');
  if (!tbody) return;
  const res = await fetch(`${API_URL}/postulaciones`);
  const lista = await res.json();

  tbody.innerHTML = lista.map((p) => {
    const enlaceCv = p.candidato.cvNombreArchivo
      ? `<a href="/uploads/cv/${p.candidato.cvNombreArchivo}" target="_blank" class="text-danger text-decoration-none fw-medium"><i class="bi bi-file-earmark-pdf-fill me-1"></i>Ver CV (.pdf)</a>`
      : `<span class="text-muted small">Sin CV adjunto</span>`;

    return `
      <tr>
        <td class="fw-bold">${p.candidato.nombre} ${p.candidato.apellidoRazon}</td>
        <td>${p.vacante.titulo}</td>
        <td>${new Date(p.fechaPostulacion).toLocaleDateString()}</td>
        <td>${enlaceCv}</td>
        <td><span class="badge ${p.estado === 'Preseleccionada' ? 'bg-success' : 'bg-warning text-dark'}">${p.estado}</span></td>
        <td>
          <button class="btn btn-outline-success btn-sm py-0" onclick="cambiarEstadoPostulacion(${p.idPostulacion}, 'Preseleccionada')">Preseleccionar</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function cambiarEstadoPostulacion(id, estado) {
  await fetch(`${API_URL}/postulaciones/${id}/estado`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado })
  });
  alert('¡Estado de postulación actualizado con éxito!');
  cargarPostulacionesEmpresa();
}

// ==========================================
// 4. FOROS DE DISCUSIÓN INTERACTIVOS
// ==========================================
let hiloActivoId = null;

function inicializarForos() {
  // Crear nuevo tópico
  const formNuevoTema = document.getElementById('form-nuevo-tema');
  if (formNuevoTema) {
    formNuevoTema.onsubmit = async (e) => {
      e.preventDefault();
      const sesion = JSON.parse(localStorage.getItem('usuarioPortal'));
      if (!sesion) {
        alert('Debes iniciar sesión para publicar un tema en el foro.');
        return;
      }

      const res = await fetch(`${API_URL}/foros`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUsuario: sesion.idUsuario,
          categoria: document.getElementById('foro-categoria').value,
          titulo: document.getElementById('foro-titulo').value.trim(),
          contenido: document.getElementById('foro-contenido').value.trim()
        })
      });

      if (res.ok) {
        bootstrap.Modal.getInstance(document.getElementById('modalNuevoTema')).hide();
        formNuevoTema.reset();
        alert('¡Tema publicado con éxito!');
        cargarForos();
      }
    };
  }

  // Responder dentro de un hilo
  const formResponder = document.getElementById('form-responder-foro');
  if (formResponder) {
    formResponder.onsubmit = async (e) => {
      e.preventDefault();
      const sesion = JSON.parse(localStorage.getItem('usuarioPortal'));
      if (!sesion) {
        alert('Debes iniciar sesión para responder en el foro.');
        return;
      }

      const inputResp = document.getElementById('foro-nueva-respuesta');
      const mensaje = inputResp.value.trim();
      if (!mensaje || !hiloActivoId) return;

      const res = await fetch(`${API_URL}/foros/${hiloActivoId}/respuestas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idUsuario: sesion.idUsuario,
          mensaje
        })
      });

      if (res.ok) {
        inputResp.value = '';
        await cargarRespuestasHilo(hiloActivoId);
        cargarForos();
      }
    };
  }
}

async function cargarForos() {
  const contenedor = document.getElementById('lista-hilos-foro');
  if (!contenedor) return;

  const filtroCat = document.getElementById('filtro-categoria-foro')?.value || '';
  const res = await fetch(`${API_URL}/foros`);
  let hilos = await res.json();

  if (filtroCat) {
    hilos = hilos.filter((h) => h.categoria === filtroCat);
  }

  if (hilos.length === 0) {
    contenedor.innerHTML = `
      <div class="card card-custom p-4 text-center text-muted">
        <p class="mb-0">Aún no hay temas publicados en esta categoría. ¡Sé el primero en abrir uno!</p>
      </div>
    `;
    return;
  }

  contenedor.innerHTML = hilos.map((h) => `
    <div class="card card-custom p-3 mb-3">
      <div class="d-flex justify-content-between align-items-center border-bottom-glass pb-2 mb-2">
        <span class="badge badge-glass-pill">${h.categoria}</span>
        <small class="text-muted">
          <i class="bi bi-chat-dots me-1"></i>${h.totalRespuestas} respuestas &bull; Por <strong>${h.usuario.nombre}</strong>
        </small>
      </div>
      <h5 class="mb-1">
        <a href="#" class="text-decoration-none text-dark" onclick="abrirHiloForo(${h.idHilo})">${h.titulo}</a>
      </h5>
      <p class="small text-secondary mb-3">${h.contenido}</p>
      <div class="text-end">
        <button class="btn btn-outline-custom btn-sm" onclick="abrirHiloForo(${h.idHilo})">
          <i class="bi bi-reply me-1"></i>Ver Discusión y Responder
        </button>
      </div>
    </div>
  `).join('');
}

async function abrirHiloForo(idHilo) {
  hiloActivoId = idHilo;
  const res = await fetch(`${API_URL}/foros`);
  const hilos = await res.json();
  const hilo = hilos.find((h) => h.idHilo === idHilo);
  if (!hilo) return;

  document.getElementById('detalle-foro-categoria').textContent = hilo.categoria;
  document.getElementById('detalle-foro-titulo').textContent = hilo.titulo;
  document.getElementById('detalle-foro-autor').textContent = `Publicado por ${hilo.usuario.nombre} (${hilo.usuario.rol})`;
  document.getElementById('detalle-foro-contenido').textContent = hilo.contenido;

  await cargarRespuestasHilo(idHilo);
  new bootstrap.Modal(document.getElementById('modalDetalleForo')).show();
}

async function cargarRespuestasHilo(idHilo) {
  const lista = document.getElementById('lista-respuestas-foro');
  if (!lista) return;

  const res = await fetch(`${API_URL}/foros/${idHilo}/respuestas`);
  const respuestas = await res.json();

  if (respuestas.length === 0) {
    lista.innerHTML = `<p class="small text-muted fst-italic mb-0">Sin respuestas todavía. ¡Deja el primer comentario!</p>`;
    return;
  }

  lista.innerHTML = respuestas.map((r) => `
    <div class="card glass-subtle p-2 px-3">
      <div class="d-flex justify-content-between align-items-center mb-1">
        <span class="small fw-bold text-primary">${r.autor} <span class="badge bg-light text-dark border ms-1">${r.rol}</span></span>
        <small class="text-muted" style="font-size: 0.75rem;">${new Date(r.fechaRespuesta).toLocaleString()}</small>
      </div>
      <p class="small text-dark mb-0">${r.mensaje}</p>
    </div>
  `).join('');
}

// ==========================================
// 5. PERFIL, CARGA DE CV (.PDF) Y VALORACIONES
// ==========================================
function inicializarCargaCv() {
  const inputCv = document.getElementById('archivoCv');
  const textoCv = document.getElementById('texto-cv-actual');
  if (!inputCv) return;

  inputCv.addEventListener('change', () => {
    const archivo = inputCv.files[0];
    if (!archivo) return;

    const esPdf = archivo.type === 'application/pdf' || archivo.name.toLowerCase().endsWith('.pdf');
    if (!esPdf) {
      alert('Archivo no válido. Únicamente se permiten archivos con extensión .pdf');
      inputCv.value = '';
      return;
    }

    if (archivo.size > 5 * 1024 * 1024) {
      alert('El archivo supera el tamaño máximo permitido de 5 MB.');
      inputCv.value = '';
      return;
    }

    if (textoCv) {
      textoCv.innerHTML = `<span class="text-success fw-bold"><i class="bi bi-check-circle me-1"></i>Seleccionado: ${archivo.name}</span>`;
    }
  });
}

function inicializarEstrellas() {
  const estrellas = document.querySelectorAll('#vista-perfil .star-rating i');
  estrellas.forEach((estrella, index) => {
    estrella.style.cursor = 'pointer';
    estrella.onclick = () => {
      calificacionSeleccionada = index + 1;
      estrellas.forEach((s, i) => {
        s.className = i <= index ? 'bi bi-star-fill' : 'bi bi-star';
      });
    };
  });

  const btnValoracion = document.querySelector('#vista-perfil .btn-outline-custom');
  if (btnValoracion) {
    btnValoracion.onclick = async () => {
      const sesion = JSON.parse(localStorage.getItem('usuarioPortal'));
      if (!sesion) return alert('Inicia sesión para enviar una valoración.');
      const comentario = document.querySelector('#vista-perfil textarea').value;
      if (!comentario.trim()) return alert('Escribe un comentario antes de enviar.');

      const res = await fetch(`${API_URL}/valoraciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idEmpresa: 1,
          idUsuario: sesion.idUsuario,
          calificacion: calificacionSeleccionada,
          comentario
        })
      });
      if (res.ok) {
        alert('¡Valoración enviada con éxito!');
        document.querySelector('#vista-perfil textarea').value = '';
      }
    };
  }
}

async function cargarPerfilCompleto() {
  const sesion = JSON.parse(localStorage.getItem('usuarioPortal'));
  if (!sesion) return;

  const textoCv = document.getElementById('texto-cv-actual');
  if (textoCv && sesion.cvNombreArchivo) {
    textoCv.innerHTML = `<span class="text-primary fw-medium">CV guardado: ${sesion.cvNombreArchivo}</span> (Haz clic para reemplazar)`;
  }

  const formPerfil = document.querySelector('#vista-perfil form');
  if (formPerfil) {
    const inputs = formPerfil.querySelectorAll('input');
    inputs[0].value = sesion.nombre;
    inputs[1].value = sesion.apellidoRazon;
    inputs[2].value = sesion.email;
    inputs[3].value = sesion.telefono || '';

    formPerfil.onsubmit = async (e) => {
      e.preventDefault();

      // 1. Actualizar datos de texto del perfil
      const res = await fetch(`${API_URL}/usuarios/${sesion.idUsuario}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: inputs[0].value,
          apellidoRazon: inputs[1].value,
          email: inputs[2].value,
          telefono: inputs[3].value
        })
      });

      let sesionActualizada = { ...sesion };
      if (res.ok) {
        const actualizado = await res.json();
        sesionActualizada = { ...sesionActualizada, ...actualizado };
      }

      // 2. Si seleccionó un archivo PDF nuevo, subirlo
      const inputCv = document.getElementById('archivoCv');
      if (inputCv && inputCv.files.length > 0) {
        const formData = new FormData();
        formData.append('cv', inputCv.files[0]);

        const resCv = await fetch(`${API_URL}/usuarios/${sesion.idUsuario}/cv`, {
          method: 'POST',
          body: formData
        });

        const dataCv = await resCv.json();
        if (!resCv.ok) {
          alert(dataCv.error || 'Error al subir el CV.');
          return;
        }
        sesionActualizada.cvNombreArchivo = dataCv.cvNombreArchivo;
        inputCv.value = '';
        if (textoCv) {
          textoCv.innerHTML = `<span class="text-primary fw-medium">CV guardado: ${dataCv.cvNombreArchivo}</span>`;
        }
      }

      localStorage.setItem('usuarioPortal', JSON.stringify(sesionActualizada));
      actualizarNavbarSesion();
      alert('¡Perfil actualizado con éxito!');
    };
  }
}

// ==========================================
// 6. PANEL ADMINISTRATIVO
// ==========================================
async function cargarPanelAdmin() {
  const tbodyUsuarios = document.querySelector('#admin-usuarios tbody');
  if (!tbodyUsuarios) return;

  const res = await fetch(`${API_URL}/admin/usuarios`);
  const usuarios = await res.json();

  tbodyUsuarios.innerHTML = usuarios.map((u) => `
    <tr>
      <td>#USR-${u.idUsuario}</td>
      <td>${u.nombre} ${u.apellidoRazon}</td>
      <td>${u.email}</td>
      <td>${u.rol}</td>
      <td><span class="badge ${u.estado === 'ACTIVO' ? 'bg-success' : 'bg-danger'}">${u.estado}</span></td>
      <td>
        <button class="btn btn-outline-danger btn-sm py-0" onclick="alternarEstadoUsuario(${u.idUsuario})">
          ${u.estado === 'ACTIVO' ? 'Suspender' : 'Activar'}
        </button>
      </td>
    </tr>
  `).join('');
}

async function alternarEstadoUsuario(idUsuario) {
  await fetch(`${API_URL}/admin/usuarios/${idUsuario}/estado`, { method: 'PUT' });
  alert('¡Estado de usuario actualizado con éxito!');
  cargarPanelAdmin();
}

// ==========================================
// 7. CONTROL DE NAVBAR Y PERMISOS POR ROL
// ==========================================
function aplicarPermisosNavbar(rol) {
  const itemEmpresa = document.getElementById('nav-item-empresa');
  const itemPerfil = document.getElementById('nav-item-perfil');
  const itemAdmin = document.getElementById('nav-item-admin');

  if (itemEmpresa) itemEmpresa.classList.add('d-none');
  if (itemPerfil) itemPerfil.classList.add('d-none');
  if (itemAdmin) itemAdmin.classList.add('d-none');

  if (rol === 'CANDIDATO' && itemPerfil) {
    itemPerfil.classList.remove('d-none');
  } else if (rol === 'EMPRESA' && itemEmpresa) {
    itemEmpresa.classList.remove('d-none');
  } else if (rol === 'ADMIN' && itemAdmin) {
    itemAdmin.classList.remove('d-none');
  }
}

function actualizarNavbarSesion() {
  const sesion = JSON.parse(localStorage.getItem('usuarioPortal'));
  const rol = sesion ? sesion.rol : 'INVITADO';
  aplicarPermisosNavbar(rol);

  const navRight = document.querySelector('#navPrincipal .d-flex');
  if (!sesion || !navRight) return;

  navRight.innerHTML = `
    <span class="small fw-bold text-dark me-2"><i class="bi bi-person-circle me-1"></i>${sesion.nombre} (${sesion.rol})</span>
    <button class="btn btn-outline-danger btn-sm" onclick="cerrarSesion()">Cerrar Sesión</button>
  `;
}

function cerrarSesion() {
  localStorage.removeItem('usuarioPortal');
  location.reload();
}