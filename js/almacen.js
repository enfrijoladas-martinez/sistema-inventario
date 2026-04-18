document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://143.198.230.63";

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
  let idEditando = null;
  let categoriasTemporales = [];
  let categoriasCache = [];
  let almacenesCache = [];

  const norm = (v) => (v ?? "").toString().trim();

  async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {})
      },
      ...options
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || "Error en la petición");
    }

    if (data && data.success === false) {
      throw new Error(data?.message || "Operación fallida");
    }

    return data;
  }

  async function getAlmacenesAPI() {
    const res = await apiFetch("/api/almacenes/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getAlmacenDetalleAPI(idAlmacen) {
    const res = await apiFetch(`/api/almacenes/${idAlmacen}`);
    return res.data || null;
  }

  async function crearAlmacenAPI(payload) {
    return await apiFetch("/api/almacenes/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function editarAlmacenAPI(idAlmacen, payload) {
    return await apiFetch(`/api/almacenes/${idAlmacen}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async function eliminarAlmacenAPI(idAlmacen) {
    return await apiFetch(`/api/almacenes/${idAlmacen}`, {
      method: "DELETE"
    });
  }

  async function getCategoriasAPI() {
    const res = await apiFetch("/api/categorias/");
    return Array.isArray(res.data) ? res.data : [];
  }

  function actualizarResumenCategorias() {
    if (!resumenCategorias) return;
    const total = categoriasTemporales.length;
    resumenCategorias.textContent =
      `${total} ${total === 1 ? "categoría registrada" : "categorías registradas"}`;
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
        ${categoriasTemporales.map((cat, index) => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            ${cat.nombre}
            <button
              type="button"
              class="btn btn-danger btn-sm btn-quitar-categoria"
              data-index="${index}"
            >
              Quitar
            </button>
          </li>
        `).join("")}
      </ul>
    `;

    actualizarResumenCategorias();
  }

  function actualizarEncabezadoCategorias() {
    if (catAlmacenFolio) {
      catAlmacenFolio.textContent = norm(inpFolio?.value) || "Nuevo almacén";
    }
    if (catAlmacenNombre) {
      catAlmacenNombre.textContent = norm(inpNombre?.value) || "Sin definir";
    }
  }

  function cargarCategoriasSelect() {
    if (!selectNuevaCategoria) return;

    selectNuevaCategoria.innerHTML = `
      <option value="" selected>Elegir categoría...</option>
    `;

    categoriasCache.forEach((cat) => {
      const option = document.createElement("option");
      option.value = cat.id_cat;
      option.textContent = cat.nombre;
      selectNuevaCategoria.appendChild(option);
    });
  }

  function renderTabla(filtro = "") {
    if (!tbody) return;

    const f = norm(filtro).toLowerCase();

    const lista = !f
      ? almacenesCache
      : almacenesCache.filter((a) => {
          const texto = `${a.folio || ""} ${a.nombre || ""}`.toLowerCase();
          return texto.includes(f);
        });

    if (lista.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-muted">Sin almacenes registrados.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((a) => `
      <tr data-id="${a.id_almacen}">
        <td>${a.folio || ""}</td>
        <td>${a.nombre || ""}</td>
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

  function resetFormularioAlmacen() {
    if (form) form.reset();
    categoriasTemporales = [];
    idEditando = null;
    modo = "create";

    if (inpFolio) inpFolio.disabled = false;
    if (selectNuevaCategoria) selectNuevaCategoria.value = "";

    renderCategoriasTemporales();
    actualizarEncabezadoCategorias();

    if (tituloModal) tituloModal.textContent = "Registrar Nuevo Almacén";
    if (btnGuardar) btnGuardar.textContent = "Guardar Almacén";
  }

  async function abrirEditar(idAlmacen) {
    try {
      const almacen = await getAlmacenDetalleAPI(idAlmacen);

      if (!almacen) {
        alert("No se pudo cargar el almacén");
        return;
      }

      modo = "edit";
      idEditando = almacen.id_almacen;

      if (inpFolio) {
        inpFolio.value = almacen.folio || "";
        inpFolio.disabled = true;
      }

      if (inpNombre) {
        inpNombre.value = almacen.nombre || "";
      }

      categoriasTemporales = (almacen.categorias || []).map((cat) => ({
        id_cat: cat.id_cat,
        nombre: cat.nombre
      }));

      renderCategoriasTemporales();
      actualizarEncabezadoCategorias();

      if (tituloModal) tituloModal.textContent = `Editar Almacén ${almacen.folio || ""}`;
      if (btnGuardar) btnGuardar.textContent = "Guardar Cambios";

      $(modalRegistro).modal("show");
    } catch (err) {
      alert(`Error al cargar el almacén: ${err.message}`);
    }
  }

  async function abrirDetalle(idAlmacen) {
    try {
      const almacen = await getAlmacenDetalleAPI(idAlmacen);

      if (!almacen) {
        alert("No se pudo obtener el detalle del almacén");
        return;
      }

      const detalleFolio = document.getElementById("detalleFolio");
      const detalleNombre = document.getElementById("detalleNombre");
      const detalleCategorias = document.getElementById("detalleCategorias");

      if (detalleFolio) detalleFolio.textContent = almacen.folio || "";
      if (detalleNombre) detalleNombre.textContent = almacen.nombre || "";
      if (detalleCategorias) {
        detalleCategorias.textContent = (almacen.categorias || []).length
          ? almacen.categorias.map((cat) => cat.nombre).join(", ")
          : "Sin categorías";
      }

      $("#modalDetalleAlmacen").modal("show");
    } catch (err) {
      alert(`Error al cargar el detalle: ${err.message}`);
    }
  }

  function cerrarVentanaCategorias() {
    if (modalCategorias) {
      modalCategorias.style.display = "none";
    }
  }

  async function guardarAlmacen() {
    const folio = norm(inpFolio?.value);
    const nombre = norm(inpNombre?.value);

    if (!folio || !nombre) {
      alert("Completa todos los campos obligatorios");
      return;
    }

    if (categoriasTemporales.length === 0) {
      alert("Agrega al menos una categoría");
      return;
    }

    let payload;

    if (modo === "create") {
      payload = {
      folio,
      nombre,
      categorias_ids: categoriasTemporales.map((cat) => cat.id_cat)
    };
    } else {
      payload = {
      nombre,
      categorias_ids: categoriasTemporales.map((cat) => cat.id_cat)
    };
    }

    try {
      if (modo === "create") {
        await crearAlmacenAPI(payload);
      } else {
        await editarAlmacenAPI(idEditando, payload);
      }

      almacenesCache = await getAlmacenesAPI();
      renderTabla(inputBuscar ? inputBuscar.value : "");
      resetFormularioAlmacen();
      $(modalRegistro).modal("hide");
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    }
  }

  async function eliminarAlmacen(idAlmacen, folio) {
    if (!confirm(`¿Eliminar el almacén ${folio}?`)) return;

    try {
      await eliminarAlmacenAPI(idAlmacen);
      almacenesCache = await getAlmacenesAPI();
      renderTabla(inputBuscar ? inputBuscar.value : "");
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  }

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
      const idCat = Number(selectNuevaCategoria?.value || 0);

      if (!idCat) {
        alert("Selecciona una categoría");
        return;
      }

      const categoria = categoriasCache.find((cat) => Number(cat.id_cat) === idCat);

      if (!categoria) {
        alert("No se encontró la categoría");
        return;
      }

      const yaExiste = categoriasTemporales.some((cat) => Number(cat.id_cat) === idCat);

      if (yaExiste) {
        alert("Esa categoría ya fue agregada");
        return;
      }

      categoriasTemporales.push({
        id_cat: categoria.id_cat,
        nombre: categoria.nombre
      });

      renderCategoriasTemporales();
      selectNuevaCategoria.value = "";
    });
  }

  if (listaCategoriasAlmacen) {
    listaCategoriasAlmacen.addEventListener("click", (e) => {
      const btnQuitar = e.target.closest(".btn-quitar-categoria");
      if (!btnQuitar) return;

      const index = Number(btnQuitar.getAttribute("data-index"));
      categoriasTemporales.splice(index, 1);
      renderCategoriasTemporales();
    });
  }

  if (btnGuardar) {
    btnGuardar.addEventListener("click", (e) => {
      e.preventDefault();
      guardarAlmacen();
    });
  }

  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      const idAlmacen = Number(tr.getAttribute("data-id"));
      if (!idAlmacen) return;

      if (e.target.closest(".btn-detalle")) {
        await abrirDetalle(idAlmacen);
        return;
      }

      if (e.target.closest(".btn-editar")) {
        await abrirEditar(idAlmacen);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        const almacen = almacenesCache.find((a) => Number(a.id_almacen) === idAlmacen);
        const folio = almacen ? almacen.folio : idAlmacen;
        await eliminarAlmacen(idAlmacen, folio);
      }
    });
  }

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }

  $(modalRegistro).on("show.bs.modal", function () {
    if (modo !== "edit") {
      resetFormularioAlmacen();
    }
  });

  $(modalRegistro).on("hidden.bs.modal", function () {
    resetFormularioAlmacen();
  });

  async function cargarDatosIniciales() {
  try {
    almacenesCache = await getAlmacenesAPI();
    renderTabla();
  } catch (err) {
    console.error("Error al cargar almacenes:", err.message);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="3" class="text-center text-danger">
            Error al cargar almacenes: ${err.message}
          </td>
        </tr>
      `;
    }
  }

  try {
    categoriasCache = await getCategoriasAPI();
    cargarCategoriasSelect();
  } catch (err) {
    console.error("Error al cargar categorías:", err.message);
  }

  renderCategoriasTemporales();
  actualizarResumenCategorias();
  actualizarEncabezadoCategorias();
}

  cargarDatosIniciales();
});