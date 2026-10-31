"use strict";

// ─── Estado central de la aplicación ────────────────────────────────────
let tareas = [];
let filtroEstado = "todas";
let filtroPrioridad = "todas";

// Secuencia de estados posibles, en el orden en que una tarea avanza
const SECUENCIA_ESTADOS = ["pendiente", "en-progreso", "completada"];

// Obtiene el valor de un campo de texto y lo limpia
const leerCampo = (selector) => {
  const campo = document.querySelector(selector);
  const valor = campo.value.trim();
  campo.value = "";
  return valor;
};

// Escapa caracteres especiales para que lo escrito por el usuario
// no se interprete como HTML al usar innerHTML
const escaparHTML = (texto) =>
  texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Referencia al contenedor del tablero
const tablero = document.querySelector("#tablero");

// ─── Generador de IDs (Estrategia A: closure / patrón módulo) ───────────
// El contador vive dentro de crearGeneradorId y solo se puede avanzar
// llamando a la función que se devuelve; ninguna otra parte del archivo
// puede leerlo ni reasignarlo por error.
function crearGeneradorId() {
  let contador = 1; // variable privada, solo visible dentro del closure
  return () => contador++;
}
const generarId = crearGeneradorId();

// ─── Prioridad (switch) ─────────────────────────────────────────────────
// Elegí switch porque todas las ramas revisan la misma variable (prioridad)
// contra unos pocos valores fijos que ya conozco; no hay rangos ni
// condiciones combinadas, así que se lee más ordenado que un if/else-if.
function obtenerConfigPrioridad(prioridad) {
  switch (prioridad) {
    case "alta":
      return { clase: "prioridad-alta", etiqueta: "Alta" };
    case "media":
      return { clase: "prioridad-media", etiqueta: "Media" };
    case "baja":
      return { clase: "prioridad-baja", etiqueta: "Baja" };
    default:
      return { clase: "prioridad-media", etiqueta: "Media" };
  }
}

// ─── Creación de una tarjeta en el DOM ──────────────────────────────────
function crearElementoTarea({ id, titulo, descripcion, prioridad, estado }) {
  const { clase: clasePrioridad, etiqueta: etiquetaPrioridad } = obtenerConfigPrioridad(prioridad);

  const tarea = document.createElement("article");
  tarea.classList.add("tarea", `estado-${estado}`, clasePrioridad);
  tarea.dataset.id = id;

  const puedeAvanzar = estado !== "completada";

  tarea.innerHTML = `
    <span class="badge-prioridad">${etiquetaPrioridad}</span>
    <span class="badge-estado">${estado}</span>
    <h3>${escaparHTML(titulo)}</h3>
    <p>${escaparHTML(descripcion)}</p>
    <div class="acciones-tarea">
      ${puedeAvanzar
        ? `<button class="btn-avanzar" data-id="${id}" data-action="avanzar">Avanzar estado</button>`
        : ""}
      <button class="btn-eliminar" data-id="${id}" data-action="eliminar">Eliminar</button>
    </div>
  `;

  return tarea;
}

// ─── Renderizado (Estrategia B: reconstrucción completa) ────────────────
// Única función que dibuja el tablero: parte siempre del array `tareas`
// y aplica los dos filtros activos en el mismo paso.
function renderizarTablero() {
  tablero.innerHTML = "";
  tareas
    .filter(t => filtroEstado === "todas" || t.estado === filtroEstado)
    .filter(t => filtroPrioridad === "todas" || t.prioridad === filtroPrioridad)
    .forEach(t => tablero.appendChild(crearElementoTarea(t)));
}

// ─── Agregar tareas ─────────────────────────────────────────────────────
function agregarTarea() {
  const titulo = leerCampo("#input-titulo");
  const descripcion = leerCampo("#input-descripcion");
  const prioridad = document.querySelector("#select-prioridad").value;

  // Validación básica: título y descripción son obligatorios
  if (!titulo || !descripcion) {
    alert("El título y la descripción son obligatorios.");
    return;
  }

  // Crear objeto tarea y agregarlo al estado
  const nuevaTarea = { id: generarId(), titulo, descripcion, prioridad, estado: "pendiente" };
  tareas.push(nuevaTarea);

  renderizarTablero();
  actualizarStats();
}

document.querySelector("#btn-agregar").addEventListener("click", agregarTarea);

// ─── Estadísticas con reduce() y for...of ───────────────────────────────
function actualizarStats() {
  // reduce: construye un objeto { estado: cantidad } a partir del array de tareas
  const conteos = tareas.reduce((acumulador, tarea) => {
    acumulador[tarea.estado] = (acumulador[tarea.estado] || 0) + 1;
    return acumulador;
  }, {});

  // for...of: recorre SECUENCIA_ESTADOS para mantener siempre el mismo orden
  const partes = [];
  for (const estado of SECUENCIA_ESTADOS) {
    const cantidad = conteos[estado] || 0;
    partes.push(`${cantidad} ${estado}`);
  }

  document.querySelector("#stats").textContent =
    `Tareas: ${partes.join(" · ")} (total ${tareas.length})`;
}

// ─── Delegación de eventos: un solo listener para avanzar y eliminar ────
// Los botones se crean dinámicamente, así que el listener va en el tablero
// y data-action indica qué acción ejecutar.
tablero.addEventListener("click", (e) => {
  const boton = e.target.closest("button[data-action]");
  if (!boton) return;

  const id = Number(boton.dataset.id);

  if (boton.dataset.action === "eliminar") {
    tareas = tareas.filter(t => t.id !== id);
    renderizarTablero();
    actualizarStats();
    return;
  }

  if (boton.dataset.action === "avanzar") {
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return;
    const indiceActual = SECUENCIA_ESTADOS.indexOf(tarea.estado);
    if (indiceActual < SECUENCIA_ESTADOS.length - 1) {
      tarea.estado = SECUENCIA_ESTADOS[indiceActual + 1];
    }
    renderizarTablero();
    actualizarStats();
  }
});

// ─── Filtrado combinado por estado y prioridad ──────────────────────────
// Como el renderizado ya aplica ambos filtros, cada listener solo
// actualiza su variable y vuelve a llamar a renderizarTablero().
const btnsFiltroEstado = document.querySelectorAll(".btn-filtro-estado");
btnsFiltroEstado.forEach(btn => {
  btn.addEventListener("click", () => {
    btnsFiltroEstado.forEach(b => b.classList.remove("activo"));
    btn.classList.add("activo");
    filtroEstado = btn.dataset.estado;
    renderizarTablero();
  });
});

document.querySelector("#select-filtro-prioridad").addEventListener("change", (e) => {
  filtroPrioridad = e.target.value;
  renderizarTablero();
});

// Estado inicial del resumen (tablero vacío)
actualizarStats();
