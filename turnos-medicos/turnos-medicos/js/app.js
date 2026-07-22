/* =====================================================
   MediTurno — lógica de la aplicación
   Todo el estado vive en localStorage. Sin dependencias externas.
   ===================================================== */
(function () {
  "use strict";

  /* ---------- Configuración del dominio ---------- */
  const ESPECIALIDADES = [
    { codigo: "MG",  nombre: "Medicina General", doctor: "Dr. Ana Peña",       minutos: 15 },
    { codigo: "PED", nombre: "Pediatría",        doctor: "Dra. Carmen Ruiz",   minutos: 15 },
    { codigo: "CAR", nombre: "Cardiología",      doctor: "Dr. Luis Ortega",    minutos: 25 },
    { codigo: "DER", nombre: "Dermatología",     doctor: "Dra. Rosa Fermín",   minutos: 20 },
    { codigo: "GIN", nombre: "Ginecología",      doctor: "Dra. Elena Vargas",  minutos: 20 },
    { codigo: "ODO", nombre: "Odontología",      doctor: "Dr. Iván Castillo",  minutos: 30 },
  ];

  const HORARIOS = { manana: [8, 12], tarde: [14, 17] }; // horas de atención
  const INTERVALO_MIN = 20; // minutos entre turnos disponibles

  const STORAGE_KEYS = { pacientes: "mediturno.pacientes", turnos: "mediturno.turnos" };

  /* ---------- Estado ---------- */
  let pacientes = cargar(STORAGE_KEYS.pacientes, []);
  let turnos = cargar(STORAGE_KEYS.turnos, []);

  function cargar(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      console.warn("No se pudo leer " + key, e);
      return fallback;
    }
  }
  function guardar(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      mostrarToast("No se pudo guardar en este navegador. Verifique el espacio de almacenamiento.");
    }
  }
  function guardarPacientes() { guardar(STORAGE_KEYS.pacientes, pacientes); }
  function guardarTurnos() { guardar(STORAGE_KEYS.turnos, turnos); }

  /* ---------- Utilidades ---------- */
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  function hoyISO() {
    const d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }
  function pad(n) { return String(n).padStart(2, "0"); }

  function calcularEdad(fechaISO) {
    const nacimiento = new Date(fechaISO + "T00:00:00");
    if (isNaN(nacimiento)) return "—";
    const hoy = new Date();
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const m = hoy.getMonth() - nacimiento.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
    return edad >= 0 ? edad : "—";
  }

  function especialidadPorCodigo(codigo) {
    return ESPECIALIDADES.find((e) => e.codigo === codigo);
  }

  let toastTimer = null;
  function mostrarToast(mensaje) {
    const toast = $("#toast");
    toast.textContent = mensaje;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  /* ---------- Reloj de cabecera ---------- */
  function iniciarReloj() {
    const opcionesFecha = { weekday: "long", year: "numeric", month: "long", day: "numeric" };
    function tick() {
      const ahora = new Date();
      $("#headerDate").textContent = ahora.toLocaleDateString("es-DO", opcionesFecha);
      $("#headerClock").textContent = ahora.toLocaleTimeString("es-DO", { hour: "2-digit", minute: "2-digit" });
    }
    tick();
    setInterval(tick, 15000);
  }

  /* ---------- Pestañas ---------- */
  function iniciarTabs() {
    $$(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        $$(".tab-btn").forEach((b) => { b.classList.remove("is-active"); b.setAttribute("aria-selected", "false"); });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        $$(".tab-panel").forEach((p) => p.classList.remove("is-active"));
        $("#panel-" + btn.dataset.tab).classList.add("is-active");
        if (btn.dataset.tab === "fila") renderFila();
        if (btn.dataset.tab === "asignar") refrescarSelectPacientes();
      });
    });
  }

  /* ---------- Validación y máscaras ---------- */
  function enmascararCedula(valor) {
    const digitos = valor.replace(/\D/g, "").slice(0, 11);
    let out = digitos.slice(0, 3);
    if (digitos.length > 3) out += "-" + digitos.slice(3, 10);
    if (digitos.length > 10) out += "-" + digitos.slice(10, 11);
    return out;
  }
  function enmascararTelefono(valor) {
    const digitos = valor.replace(/\D/g, "").slice(0, 10);
    let out = digitos.slice(0, 3);
    if (digitos.length > 3) out += "-" + digitos.slice(3, 6);
    if (digitos.length > 6) out += "-" + digitos.slice(6, 10);
    return out;
  }

  function marcarError(input, mensaje) {
    input.classList.toggle("is-invalid", Boolean(mensaje));
    const err = document.getElementById("err-" + input.id);
    if (err) err.textContent = mensaje || "";
    return !mensaje;
  }

  /* ---------- Formulario: registrar paciente ---------- */
  function iniciarFormPaciente() {
    const form = $("#formPaciente");
    const cedula = $("#pCedula");
    const telefono = $("#pTelefono");

    cedula.addEventListener("input", () => { cedula.value = enmascararCedula(cedula.value); });
    telefono.addEventListener("input", () => { telefono.value = enmascararTelefono(telefono.value); });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const nombre = $("#pNombre").value.trim();
      const cedulaVal = cedula.value.trim();
      const telVal = telefono.value.trim();
      const nacimiento = $("#pNacimiento").value;
      const sexo = $("#pSexo").value;

      let valido = true;
      valido = marcarError($("#pNombre"), nombre.length >= 3 ? "" : "Ingrese el nombre completo (mínimo 3 caracteres).") && valido;
      valido = marcarError(cedula, /^\d{3}-\d{7}-\d{1}$/.test(cedulaVal) ? "" : "Formato requerido: 000-0000000-0.") && valido;
      valido = marcarError(telefono, /^\d{3}-\d{3}-\d{4}$/.test(telVal) ? "" : "Formato requerido: 000-000-0000.") && valido;
      valido = marcarError($("#pNacimiento"), nacimiento && nacimiento <= hoyISO() ? "" : "Ingrese una fecha de nacimiento válida.") && valido;
      valido = marcarError($("#pSexo"), sexo ? "" : "Seleccione una opción.") && valido;

      const yaExiste = pacientes.some((p) => p.cedula === cedulaVal);
      if (valido && yaExiste) {
        marcarError(cedula, "Ya existe un paciente registrado con esta cédula.");
        valido = false;
      }

      const feedback = $("#feedbackPaciente");
      if (!valido) {
        feedback.textContent = "Revise los campos marcados en rojo.";
        feedback.className = "form-feedback error";
        return;
      }

      const paciente = {
        id: "P" + Date.now(),
        nombre, cedula: cedulaVal, telefono: telVal, nacimiento, sexo,
        seguro: $("#pSeguro").value.trim() || "Ninguno",
        creado: new Date().toISOString(),
      };
      pacientes.push(paciente);
      guardarPacientes();
      form.reset();
      $$(".is-invalid", form).forEach((el) => el.classList.remove("is-invalid"));
      feedback.textContent = "Paciente \"" + nombre + "\" registrado correctamente.";
      feedback.className = "form-feedback success";
      renderPacientes();
      refrescarSelectPacientes();
      mostrarToast("Paciente registrado: " + nombre);
    });
  }

  function renderPacientes(filtro) {
    const tbody = $("#tbodyPacientes");
    const texto = (filtro || "").toLowerCase();
    const lista = pacientes.filter((p) =>
      !texto || p.nombre.toLowerCase().includes(texto) || p.cedula.includes(texto)
    );
    tbody.innerHTML = lista.map((p) => `
      <tr>
        <td>${escapeHTML(p.nombre)}</td>
        <td><span style="font-family:var(--font-mono)">${p.cedula}</span></td>
        <td><span style="font-family:var(--font-mono)">${p.telefono}</span></td>
        <td>${calcularEdad(p.nacimiento)}</td>
        <td><button class="mini-btn" data-eliminar-paciente="${p.id}">Eliminar</button></td>
      </tr>
    `).join("");
    $("#emptyPacientes").style.display = lista.length ? "none" : "block";
    $("#tablaPacientes").style.display = lista.length ? "table" : "none";

    tbody.querySelectorAll("[data-eliminar-paciente]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.eliminarPaciente;
        const tieneTurnos = turnos.some((t) => t.pacienteId === id && t.estado === "pendiente");
        if (tieneTurnos) {
          mostrarToast("No se puede eliminar: el paciente tiene turnos pendientes.");
          return;
        }
        pacientes = pacientes.filter((p) => p.id !== id);
        guardarPacientes();
        renderPacientes($("#buscarPaciente").value);
        refrescarSelectPacientes();
      });
    });
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ---------- Formulario: asignar turno ---------- */
  function iniciarSelectsEspecialidad() {
    const opciones = ESPECIALIDADES.map((e) => `<option value="${e.codigo}">${e.nombre}</option>`).join("");
    $("#tEspecialidad").insertAdjacentHTML("beforeend", opciones);
    $("#filtroEspecialidad").insertAdjacentHTML("beforeend", opciones);
  }

  function refrescarSelectPacientes() {
    const select = $("#tPaciente");
    const seleccionActual = select.value;
    select.innerHTML = '<option value="" disabled selected>Seleccione un paciente&hellip;</option>' +
      pacientes.map((p) => `<option value="${p.id}">${escapeHTML(p.nombre)} — ${p.cedula}</option>`).join("");
    if (pacientes.some((p) => p.id === seleccionActual)) select.value = seleccionActual;
    if (!pacientes.length) {
      select.innerHTML = '<option value="" disabled selected>Registre un paciente primero&hellip;</option>';
    }
  }

  function fechaEsDomingo(iso) {
    const d = new Date(iso + "T00:00:00");
    return d.getDay() === 0;
  }

  function generarHorasDisponibles(codigoEspecialidad, fechaISO) {
    const esp = especialidadPorCodigo(codigoEspecialidad);
    if (!esp || !fechaISO) return [];
    const ocupadas = new Set(
      turnos
        .filter((t) => t.especialidad === codigoEspecialidad && t.fecha === fechaISO && t.estado !== "cancelado")
        .map((t) => t.hora)
    );
    const slots = [];
    [HORARIOS.manana, HORARIOS.tarde].forEach(([inicio, fin]) => {
      for (let mins = inicio * 60; mins < fin * 60; mins += INTERVALO_MIN) {
        const h = Math.floor(mins / 60), m = mins % 60;
        const hora = pad(h) + ":" + pad(m);
        if (fechaISO === hoyISO()) {
          const ahora = new Date();
          const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
          if (mins <= minutosAhora) continue;
        }
        if (!ocupadas.has(hora)) slots.push(hora);
      }
    });
    return slots;
  }

  function iniciarFormTurno() {
    const selEsp = $("#tEspecialidad");
    const inputFecha = $("#tFecha");
    const selHora = $("#tHora");
    const preview = $("#doctorPreview");

    inputFecha.min = hoyISO();

    function actualizarHoras() {
      const codigo = selEsp.value;
      const fecha = inputFecha.value;

      if (codigo) {
        const esp = especialidadPorCodigo(codigo);
        $("#doctorNombre").textContent = esp.doctor + " (" + esp.nombre + ")";
        preview.hidden = false;
      } else {
        preview.hidden = true;
      }

      if (!codigo || !fecha) {
        selHora.innerHTML = '<option value="">Elija fecha y especialidad primero</option>';
        selHora.disabled = true;
        return;
      }
      if (fechaEsDomingo(fecha)) {
        selHora.innerHTML = '<option value="">Cerrado los domingos — elija otra fecha</option>';
        selHora.disabled = true;
        return;
      }
      const slots = generarHorasDisponibles(codigo, fecha);
      if (!slots.length) {
        selHora.innerHTML = '<option value="">Sin horas disponibles ese día</option>';
        selHora.disabled = true;
        return;
      }
      selHora.innerHTML = '<option value="" disabled selected>Seleccione una hora&hellip;</option>' +
        slots.map((h) => `<option value="${h}">${h}</option>`).join("");
      selHora.disabled = false;
    }

    selEsp.addEventListener("change", actualizarHoras);
    inputFecha.addEventListener("change", actualizarHoras);

    $("#formTurno").addEventListener("submit", (e) => {
      e.preventDefault();
      const pacienteId = $("#tPaciente").value;
      const codigo = selEsp.value;
      const fecha = inputFecha.value;
      const hora = selHora.value;

      let valido = true;
      valido = marcarError($("#tPaciente"), pacienteId ? "" : "Seleccione un paciente.") && valido;
      valido = marcarError(selEsp, codigo ? "" : "Seleccione una especialidad.") && valido;

      let mensajeFecha = "";
      if (!fecha || fecha < hoyISO()) mensajeFecha = "Elija una fecha válida (hoy o futura).";
      else if (fechaEsDomingo(fecha)) mensajeFecha = "El centro no atiende los domingos.";
      valido = marcarError(inputFecha, mensajeFecha) && valido;

      valido = marcarError(selHora, hora ? "" : "Seleccione una hora disponible.") && valido;

      const feedback = $("#feedbackTurno");
      if (!valido) {
        feedback.textContent = "Revise los campos marcados en rojo.";
        feedback.className = "form-feedback error";
        return;
      }

      const paciente = pacientes.find((p) => p.id === pacienteId);
      const esp = especialidadPorCodigo(codigo);
      const numeroDelDia = turnos.filter((t) => t.especialidad === codigo && t.fecha === fecha).length + 1;
      const ticket = esp.codigo + "-" + pad(numeroDelDia);

      const turno = {
        id: "T" + Date.now(),
        ticket,
        pacienteId,
        pacienteNombre: paciente.nombre,
        pacienteCedula: paciente.cedula,
        especialidad: codigo,
        especialidadNombre: esp.nombre,
        doctor: esp.doctor,
        fecha, hora,
        motivo: $("#tMotivo").value.trim(),
        estado: "pendiente",
        creado: new Date().toISOString(),
      };
      turnos.push(turno);
      guardarTurnos();

      feedback.textContent = "Turno " + ticket + " confirmado para " + fecha + " a las " + hora + ".";
      feedback.className = "form-feedback success";
      mostrarStub(turno);
      $("#formTurno").reset();
      selHora.innerHTML = '<option value="">Elija fecha y especialidad primero</option>';
      selHora.disabled = true;
      preview.hidden = true;
      actualizarContadorGlobal();
      mostrarToast("Turno asignado: " + ticket);
    });
  }

  function calcularEsperaEstimada(turno) {
    const esp = especialidadPorCodigo(turno.especialidad);
    const posicion = turnos.filter((t) =>
      t.especialidad === turno.especialidad && t.fecha === turno.fecha &&
      t.estado === "pendiente" && t.hora <= turno.hora
    ).length;
    return Math.max(0, (posicion - 1)) * esp.minutos;
  }

  function stubHTML(turno, opciones) {
    opciones = opciones || {};
    const espera = turno.estado === "pendiente" ? calcularEsperaEstimada(turno) : null;
    return `
      <article class="ticket-stub">
        <div class="ticket-stub-head">
          <span class="ticket-stub-number">${turno.ticket}</span>
          <span class="ticket-stub-status status-${turno.estado}">${turno.estado}</span>
        </div>
        <div class="ticket-stub-body">
          <p><strong>${escapeHTML(turno.pacienteNombre)}</strong> · ${turno.pacienteCedula}</p>
          <p>${escapeHTML(turno.especialidadNombre)} — ${escapeHTML(turno.doctor)}</p>
          <p>${turno.fecha} a las ${turno.hora}${turno.motivo ? " · " + escapeHTML(turno.motivo) : ""}</p>
        </div>
        <hr class="ticket-stub-divider">
        <div class="ticket-stub-foot">
          <span>${espera !== null ? `Espera estimada: <span class="ticket-wait">${espera} min</span>` : "&nbsp;"}</span>
          <span class="ticket-stub-actions">
            ${opciones.conAcciones && turno.estado === "pendiente" ? `
              <button class="mini-btn" data-atender="${turno.id}">Marcar atendido</button>
              <button class="mini-btn" data-cancelar="${turno.id}">Cancelar</button>
            ` : ""}
          </span>
        </div>
      </article>
    `;
  }

  function mostrarStub(turno) {
    $("#ticketHint").textContent = "Comprobante generado. Puede marcarlo como atendido desde la pestaña \"Turnos pendientes\".";
    $("#ticketStubHost").innerHTML = stubHTML(turno, { conAcciones: false });
  }

  function actualizarContadorGlobal() {
    const siguiente = turnos.length + 1;
    $("#nextGlobalNumber").textContent = pad(siguiente % 1000 || 0).padStart(3, "0");
  }

  /* ---------- Fila de turnos pendientes ---------- */
  function renderFila() {
    const busqueda = $("#filtroBusqueda").value.trim().toLowerCase();
    const especialidad = $("#filtroEspecialidad").value;
    const estado = $("#filtroEstado").value;
    const orden = $("#filtroOrden").value;

    let lista = turnos.filter((t) => {
      if (especialidad && t.especialidad !== especialidad) return false;
      if (estado && t.estado !== estado) return false;
      if (busqueda && !(t.pacienteNombre.toLowerCase().includes(busqueda) || t.pacienteCedula.includes(busqueda))) return false;
      return true;
    });

    lista.sort((a, b) => {
      if (orden === "numero") return a.ticket.localeCompare(b.ticket);
      if (orden === "nombre") return a.pacienteNombre.localeCompare(b.pacienteNombre);
      return (a.fecha + a.hora).localeCompare(b.fecha + b.hora);
    });

    const host = $("#queueList");
    host.innerHTML = lista.map((t) => stubHTML(t, { conAcciones: true })).join("");
    $("#emptyQueue").style.display = lista.length ? "none" : "block";

    host.querySelectorAll("[data-atender]").forEach((btn) => {
      btn.addEventListener("click", () => cambiarEstado(btn.dataset.atender, "atendido"));
    });
    host.querySelectorAll("[data-cancelar]").forEach((btn) => {
      btn.addEventListener("click", () => cambiarEstado(btn.dataset.cancelar, "cancelado"));
    });

    renderStats();
  }

  function cambiarEstado(turnoId, nuevoEstado) {
    const turno = turnos.find((t) => t.id === turnoId);
    if (!turno) return;
    turno.estado = nuevoEstado;
    guardarTurnos();
    renderFila();
    mostrarToast("Turno " + turno.ticket + " marcado como " + nuevoEstado + ".");
  }

  function renderStats() {
    const hoy = hoyISO();
    const pendientes = turnos.filter((t) => t.estado === "pendiente");
    const atendidosHoy = turnos.filter((t) => t.estado === "atendido" && t.fecha === hoy);
    const cancelados = turnos.filter((t) => t.estado === "cancelado");
    const esperaPromedio = pendientes.length
      ? Math.round(pendientes.reduce((sum, t) => sum + calcularEsperaEstimada(t), 0) / pendientes.length)
      : 0;

    $("#statPendientes").textContent = pendientes.length;
    $("#statAtendidos").textContent = atendidosHoy.length;
    $("#statCancelados").textContent = cancelados.length;
    $("#statEspera").textContent = esperaPromedio + " min";
  }

  function iniciarFiltros() {
    ["#filtroBusqueda", "#filtroEspecialidad", "#filtroEstado", "#filtroOrden"].forEach((sel) => {
      $(sel).addEventListener("input", renderFila);
      $(sel).addEventListener("change", renderFila);
    });
    $("#buscarPaciente").addEventListener("input", (e) => renderPacientes(e.target.value));
  }

  /* ---------- Arranque ---------- */
  function init() {
    iniciarReloj();
    iniciarTabs();
    iniciarSelectsEspecialidad();
    iniciarFormPaciente();
    iniciarFormTurno();
    iniciarFiltros();
    renderPacientes();
    refrescarSelectPacientes();
    renderFila();
    actualizarContadorGlobal();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
