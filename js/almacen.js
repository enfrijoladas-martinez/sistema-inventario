document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "almacenes_v1";

  const btnGuardar = document.getElementById("btnGuardarAlmacen");
  const btnAbrirCategorias = document.getElementById("btnAbrirCategorias");
  const btnAgregarCategoria = document.getElementById("btnAgregarCategoria");
  const btnCerrarCategorias = document.getElementById("btnCerrarCategorias");
  const btnCerrarCategoriasX = document.getElementById("btnCerrarCategoriasX");

  const form = document.getElementById("formularioAlmacen");
  const tbody = document.querySelector("#dataTable tbody");
  const inputBuscar = document.getElementById("buscarAlmacenes");

  const inpNombre = document.getElementById("nombreAlm");
  const inpFolio = document.getElementById("folioAlm");

  const selectNuevaCategoria = document.getElementById("selectNuevaCategoria");
  const listaCategoriasAlmacen = document.getElementById("listaCategoriasAlmacen");
  const resumenCategorias = document.getElementById("resumenCategorias");

  const catAlmacenFolio = document.getElementById("catAlmacenFolio");
  const catAlmacenNombre = document.getElementById("catAlmacenNombre");

  const modalRegistro = "#modalNuevoAlmacen";
  const modalCategorias = document.getElementById("modalCategoriasAlmacen");
  const tituloModal = document.getElementById("tituloModal");

  let modo = "create";
  let folioEditando = null;
  let categoriasTemporales = [];

  const norm = (v) => (v ?? "").toString().trim();

  const getAlmacenes = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const setAlmacenes = (arr) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  };

  function actualizarResumenCategorias() {
    const total = categoriasTemporales.length;
    resumenCategorias.textContent = `${total} ${total === 1 ? "categoría registrada" : "categorías registradas"}`;
  }

  function renderCategoriasTemporales() {
    if (!listaCategoriasAlmacen) return;

    if (categoriasTemporales.length === 0) {
      listaCategoriasAlmacen.innerHTML = `
        <div class="text-muted small">No hay categorías agregadas.</div>
      `;
      actualizarResumenCategorias();
      return;
    }

    listaCategoriasAlmacen.innerHTML = `
      <ul class="list-group">
        ${categoriasTemporales.map((cat) => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            ${cat}
            <button type="button" class="btn btn-danger btn-sm btn-quitar-categoria" data-categoria="${cat}">
              Quitar
            </button>
          </li>
        `).join("")}
      </ul>
    `;

    actualizarResumenCategorias();
  }

  function actualizarEncabezadoCategorias() {
    catAlmacenFolio.textContent = norm(inpFolio.value) || "Nuevo almacén";
    catAlmacenNombre.textContent = norm(inpNombre.value) || "Sin definir";
  }

  function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();
    const almacenes = getAlmacenes();

    const lista = !f
      ? almacenes
      : almacenes.filter((a) => {
          const texto = `${a.folio} ${a.nombre} ${(a.categorias || []).join(" ")}`.toLowerCase();
          return texto.includes(f);
        });

    tbody.innerHTML = lista.map((a) => `
      <tr data-folio="${a.folio}">
        <td>${a.folio}</td>
        <td>${a.nombre}</td>
        <td>
          <button type="button" class="btn btn-info btn-circle btn-sm btn-detalle" title="Ver detalle">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn btn-warning btn-circle btn-sm btn-editar" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button type="button" class="btn btn-danger btn-circle btn-sm btn-eliminar" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }

  function seedFromHTMLIfEmpty() {
    const current = getAlmacenes();
    if (current.length > 0) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const seeded = rows.map((tr) => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 2) return null;

      return {
        folio: norm(tds[0].textContent),
        nombre: norm(tds[1].textContent),
        categorias: []
      };
    }).filter(Boolean);

    if (seeded.length > 0) {
      setAlmacenes(seeded);
    }
  }

  function resetFormularioAlmacen() {
    form.reset();
    categoriasTemporales = [];
    folioEditando = null;
    inpFolio.disabled = false;
    renderCategoriasTemporales();
    actualizarEncabezadoCategorias();
  }

  function abrirEditar(almacen) {
    modo = "edit";
    folioEditando = almacen.folio;

    inpFolio.value = almacen.folio;
    inpNombre.value = almacen.nombre;

    categoriasTemporales = [...(almacen.categorias || [])];
    renderCategoriasTemporales();
    actualizarEncabezadoCategorias();

    inpFolio.disabled = true;
    tituloModal.textContent = `Editar Almacén ${almacen.folio}`;
    btnGuardar.textContent = "Guardar Cambios";
    $(modalRegistro).modal("show");
  }

  function abrirDetalle(almacen) {
    const detalleFolio = document.getElementById("detalleFolio");
    const detalleNombre = document.getElementById("detalleNombre");
    const detalleCategorias = document.getElementById("detalleCategorias");

    if (!detalleFolio || !detalleNombre || !detalleCategorias) {
      console.error("Faltan elementos del modal de detalle");
      return;
    }

    detalleFolio.textContent = almacen.folio;
    detalleNombre.textContent = almacen.nombre;
    detalleCategorias.textContent = (almacen.categorias || []).join(", ") || "Sin categorías";

    $("#modalDetalleAlmacen").modal("show");
  }

  function cerrarVentanaCategorias() {
    if (modalCategorias) {
      modalCategorias.style.display = "none";
    }
  }

  seedFromHTMLIfEmpty();
  renderTabla();
  renderCategoriasTemporales();
  actualizarResumenCategorias();

  $(modalRegistro).on("show.bs.modal", function () {
    if (modo !== "edit") {
      modo = "create";
      folioEditando = null;
      resetFormularioAlmacen();
      tituloModal.textContent = "Registrar Nuevo Almacén";
      btnGuardar.textContent = "Guardar Almacén";
    }
  });

  $(modalRegistro).on("hidden.bs.modal", function () {
    modo = "create";
    folioEditando = null;
    resetFormularioAlmacen();
  });

  if (btnAbrirCategorias) {
    btnAbrirCategorias.addEventListener("click", () => {
      actualizarEncabezadoCategorias();
      renderCategoriasTemporales();
      if (modalCategorias) {
        modalCategorias.style.display = "flex";
      }
    });
  }

  if (btnCerrarCategorias) {
    btnCerrarCategorias.addEventListener("click", cerrarVentanaCategorias);
  }

  if (btnCerrarCategoriasX) {
    btnCerrarCategoriasX.addEventListener("click", cerrarVentanaCategorias);
  }

  if (btnAgregarCategoria) {
    btnAgregarCategoria.addEventListener("click", () => {
      const nuevaCategoria = norm(selectNuevaCategoria.value);

      if (!nuevaCategoria) {
        alert("Selecciona una categoría");
        return;
      }

      if (categoriasTemporales.includes(nuevaCategoria)) {
        alert("Esa categoría ya fue agregada");
        return;
      }

      categoriasTemporales.push(nuevaCategoria);
      renderCategoriasTemporales();
      selectNuevaCategoria.value = "";
    });
  }

  if (listaCategoriasAlmacen) {
    listaCategoriasAlmacen.addEventListener("click", (e) => {
      const btnQuitar = e.target.closest(".btn-quitar-categoria");
      if (!btnQuitar) return;

      const categoria = btnQuitar.getAttribute("data-categoria");
      categoriasTemporales = categoriasTemporales.filter((cat) => cat !== categoria);
      renderCategoriasTemporales();
    });
  }

  if (btnGuardar) {
    btnGuardar.addEventListener("click", (e) => {
      e.preventDefault();

      const folio = norm(inpFolio.value);
      const nombre = norm(inpNombre.value);

      if (!folio || !nombre) {
        alert("Completa todos los campos obligatorios");
        return;
      }

      if (categoriasTemporales.length === 0) {
        alert("Agrega al menos una categoría");
        return;
      }

      const almacenes = getAlmacenes();

      if (modo === "create") {
        if (almacenes.some((a) => a.folio.toUpperCase() === folio.toUpperCase())) {
          alert("Ese folio ya existe");
          return;
        }

        almacenes.push({
          folio,
          nombre,
          categorias: [...categoriasTemporales]
        });

        setAlmacenes(almacenes);
        renderTabla(inputBuscar ? inputBuscar.value : "");
        resetFormularioAlmacen();
        $(modalRegistro).modal("hide");
        return;
      }

      const idx = almacenes.findIndex((a) => a.folio === folioEditando);
      if (idx === -1) {
        alert("No se encontró el almacén a editar.");
        return;
      }

      almacenes[idx] = {
        ...almacenes[idx],
        folio,
        nombre,
        categorias: [...categoriasTemporales]
      };

      setAlmacenes(almacenes);
      renderTabla(inputBuscar ? inputBuscar.value : "");
      modo = "create";
      folioEditando = null;
      resetFormularioAlmacen();
      $(modalRegistro).modal("hide");
    });
  }

  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      const folio = tr.getAttribute("data-folio");
      const almacenes = getAlmacenes();
      const almacen = almacenes.find((a) => a.folio === folio);

      if (!almacen) return;

      const btnDetalle = e.target.closest(".btn-detalle");
      if (btnDetalle) {
        abrirDetalle(almacen);
        return;
      }

      const btnEditar = e.target.closest(".btn-editar");
      if (btnEditar) {
        abrirEditar(almacen);
        return;
      }

      const btnEliminar = e.target.closest(".btn-eliminar");
      if (btnEliminar) {
        if (!confirm(`¿Eliminar el almacén ${folio}?`)) return;

        const nuevos = almacenes.filter((a) => a.folio !== folio);
        setAlmacenes(nuevos);
        renderTabla(inputBuscar ? inputBuscar.value : "");
      }
    });
  }

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }
});