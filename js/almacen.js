document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://servicioagromundo.be";

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

  const usuario = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
  const esEmpleado = (usuario.rol || "").toLowerCase() === "empleado";

  let modo = "create";
  let idEditando = null;
  let categoriasTemporales = [];
  let categoriasCache = [];
  let almacenesCache = [];
  let productosCache = [];
  let productoFiltroId = null;
  let almacenesPorProducto = null;

  const inputBuscarProducto = document.getElementById("buscarProductoAlmacen");
  const btnLimpiarFiltro = document.getElementById("btnLimpiarFiltroProducto");

  const norm = (v) => (v ?? "").toString().trim();

  async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const { headers: optHeaders, auth, ...restOptions } = options;
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(optHeaders || {})
    };
    
    if (auth === false) {
      delete headers["Authorization"];
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...restOptions
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        Swal.fire({
          icon: 'warning',
          title: 'Sesión expirada o inválida',
          text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
          confirmButtonText: 'Entendido'
        });
      }
      throw new Error(data?.message || "Error en la petición");
    }

    if (data && data.success === false) {
      throw new Error(data?.message || "Operación fallida");
    }

    return data;
  }

  if (esEmpleado) {
    const btnNuevo = document.querySelector('[data-target="#modalNuevoAlmacen"]');
    if (btnNuevo) btnNuevo.style.display = "none";
  }

  async function getAlmacenesAPI() {
    const res = await apiFetch("/api/almacenes/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getAlmacenDetalleAPI(idAlmacen) {
    const res = await apiFetch(`/api/almacenes/${idAlmacen}`, { auth: false });
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

  async function eliminarAlmacenAPI(idAlmacen, destinoId) {
    return await apiFetch(`/api/almacenes/${idAlmacen}`, {
      method: "DELETE",
      body: JSON.stringify({ id_almacen_destino: destinoId ?? null })
    });
  }

  async function actualizarInventarioAPI(idInventario, payload) {
    return await apiFetch(`/api/inventarios/${idInventario}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async function getProductosAPI() {
    const res = await apiFetch("/api/productos/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getAlmacenesPorProductoAPI(idProducto) {
    const res = await apiFetch(`/api/almacenes/por-producto/${idProducto}`, { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getCategoriasAPI() {
    const res = await apiFetch("/api/categorias/", { auth: false });
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
    const thStock = document.getElementById("thStock");
    const hayFiltroProducto = almacenesPorProducto !== null;
    const colspan = hayFiltroProducto ? 4 : 3;

    const fuente = almacenesPorProducto ?? almacenesCache;

    const lista = !f
      ? fuente
      : fuente.filter((a) => {
          const texto = `${a.folio || ""} ${a.nombre || ""}`.toLowerCase();
          return texto.includes(f);
        });

    if (thStock) {
      thStock.style.display = hayFiltroProducto ? "" : "none";
    }

    if (lista.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="${colspan}" class="text-center text-muted">${
            hayFiltroProducto
              ? "Ningún almacén tiene inventario de este producto."
              : "Sin almacenes registrados."
          }</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((a) => `
      <tr data-id="${a.id_almacen}">
        <td>${a.folio || ""}</td>
        <td>${a.nombre || ""}</td>
        ${hayFiltroProducto ? `<td class="font-weight-bold">${a.stock ?? a.cantidad ?? 0}</td>` : ""}
        <td>
          <button type="button" class="btn btn-info btn-circle btn-sm btn-detalle" title="Ver detalle">
            <i class="fas fa-eye"></i>
          </button>
          ${!esEmpleado ? `
          <button type="button" class="btn btn-warning btn-circle btn-sm btn-editar" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          <button type="button" class="btn btn-danger btn-circle btn-sm btn-eliminar" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
          ` : ""}
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
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo cargar el almacén", confirmButtonText: "Aceptar" });
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
      Swal.fire({ icon: "error", title: "Error", text: `Error al cargar el almacén: ${err.message}`, confirmButtonText: "Aceptar" });
    }
  }

  async function abrirDetalle(idAlmacen) {
    try {
      const almacen = await getAlmacenDetalleAPI(idAlmacen);

      if (!almacen) {
        Swal.fire({ icon: "error", title: "Error", text: "No se pudo obtener el detalle del almacén", confirmButtonText: "Aceptar" });
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
      Swal.fire({ icon: "error", title: "Error", text: `Error al cargar el detalle: ${err.message}`, confirmButtonText: "Aceptar" });
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
      Swal.fire({ icon: "warning", title: "Advertencia", text: "Completa todos los campos obligatorios", confirmButtonText: "Aceptar" });
      return;
    }

    if (categoriasTemporales.length === 0) {
      Swal.fire({ icon: "warning", title: "Advertencia", text: "Agrega al menos una categoría", confirmButtonText: "Aceptar" });
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
        Swal.fire({ icon: "success", title: "Éxito", text: "Almacén creado con éxito", confirmButtonText: "Aceptar" });
      } else {
        await editarAlmacenAPI(idEditando, payload);
        Swal.fire({ icon: "success", title: "Éxito", text: "Almacén editado con éxito", confirmButtonText: "Aceptar" });
      }

      almacenesCache = await getAlmacenesAPI();
      renderTabla(inputBuscar ? inputBuscar.value : "");
      resetFormularioAlmacen();
      $(modalRegistro).modal("hide");
    } catch (err) {
      Swal.fire({ icon: "error", title: "Error", text: `Error al guardar: ${err.message}`, confirmButtonText: "Aceptar" });
    }
  }

  async function eliminarAlmacen(idAlmacen, folio) {
    // Find warehouse name for inventory matching (API doesn't return id_almacen on inventory)
    const almacenActual = almacenesCache.find(
      (a) => Number(a.id_almacen) === Number(idAlmacen)
    );
    const nombreAlmacen = almacenActual ? norm(almacenActual.nombre).toLowerCase() : "";

    // Check if warehouse has inventory
    let inventarios = [];
    try {
      const res = await apiFetch("/api/inventarios/", { auth: false });
      inventarios = Array.isArray(res.data) ? res.data : [];
    } catch {
      // proceed assuming no inventory
    }

    const invDelAlmacen = inventarios
      .filter((inv) => nombreAlmacen && norm(inv.nombre_almacen).toLowerCase() === nombreAlmacen)
      .map((inv) => ({
        ...inv,
        stock: inv.stock ?? inv.cantidad ?? 0,
        min_stock: inv.min_stock ?? inv.stock_minimo ?? 0
      }));
    const otrosAlmacenes = almacenesCache.filter(
      (a) => Number(a.id_almacen) !== Number(idAlmacen)
    );

    // No other warehouses available — cannot delete (backend requires a destination warehouse)
    if (otrosAlmacenes.length === 0) {
      const msgInv = invDelAlmacen.length > 0
        ? `tiene <strong>${invDelAlmacen.length} registro(s)</strong> de inventario`
        : `no tiene inventarios registrados`;
      await Swal.fire({
        icon: "error",
        title: "No se puede eliminar",
        html: `El almacén "${folio}" ${msgInv} y <strong>no hay otro almacén al cual mover los inventarios</strong>. Primero debe crear otro almacén.`,
        confirmButtonText: "Entendido"
      });
      return;
    }

    // There are other warehouses — always require destination (backend mandates it)
    const opciones = otrosAlmacenes.map(
      (a) => `<option value="${a.id_almacen}">${a.folio || ""} - ${a.nombre || ""}</option>`
    ).join("");

    const msgInv = invDelAlmacen.length > 0
      ? `<p class="mb-3">Este almacén tiene <strong>${invDelAlmacen.length} registro(s)</strong> de inventario.</p>
         <p class="mb-2 text-warning"><strong>Los inventarios se transferirán al almacén que seleccione.</strong></p>`
      : `<p class="mb-3">Este almacén no tiene inventarios registrados.</p>`;

    const result = await Swal.fire({
      title: `Eliminar "${folio}"`,
      html: `
        ${msgInv}
        <p class="mb-2">Seleccione almacén de destino:</p>
        <select id="destinoAlmacen" class="form-control">
          <option value="">Seleccionar...</option>
          ${opciones}
        </select>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      reverseButtons: true,
      preConfirm: () => {
        const destino = document.getElementById("destinoAlmacen")?.value;
        if (!destino) {
          Swal.showValidationMessage("Seleccione un almacén de destino");
          return false;
        }
        return Number(destino);
      }
    });

    if (!result.isConfirmed) return;

    try {
      await eliminarAlmacenAPI(idAlmacen, result.value);
      almacenesPorProducto = null;
      productoFiltroId = null;
      if (inputBuscarProducto) inputBuscarProducto.value = "";
      if (btnLimpiarFiltro) btnLimpiarFiltro.style.display = "none";
      almacenesCache = await getAlmacenesAPI();
      renderTabla(inputBuscar ? inputBuscar.value : "");
      const msgOk = invDelAlmacen.length > 0
        ? "Almacén eliminado correctamente. Los inventarios fueron transferidos."
        : "Almacén eliminado correctamente.";
      await Swal.fire({
        icon: "success",
        title: "Completado",
        text: msgOk,
        confirmButtonText: "Aceptar"
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Error",
        text: `Error al eliminar: ${err.message}`,
        confirmButtonText: "Aceptar"
      });
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
        Swal.fire({ icon: "warning", title: "Advertencia", text: "Selecciona una categoría", confirmButtonText: "Aceptar" });
        return;
      }

      const categoria = categoriasCache.find((cat) => Number(cat.id_cat) === idCat);

      if (!categoria) {
        Swal.fire({ icon: "error", title: "Error", text: "No se encontró la categoría", confirmButtonText: "Aceptar" });
        return;
      }

      const yaExiste = categoriasTemporales.some((cat) => Number(cat.id_cat) === idCat);

      if (yaExiste) {
        Swal.fire({ icon: "warning", title: "Advertencia", text: "Esa categoría ya fue agregada", confirmButtonText: "Aceptar" });
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

  // Product search dropdown
  let timeoutBusquedaProducto = null;

  function crearDropdownProductosAlmacen() {
    let dropdown = document.getElementById("dropdownProductosAlmacen");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "dropdownProductosAlmacen";
      dropdown.className = "dropdown-menu w-100 show";
      dropdown.style.position = "absolute";
      dropdown.style.zIndex = "1000";
      dropdown.style.maxHeight = "300px";
      dropdown.style.overflowY = "auto";
      dropdown.style.display = "none";
      const parent = inputBuscarProducto.parentNode;
      if (getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
      }
      parent.appendChild(dropdown);
    }
    return dropdown;
  }

  if (inputBuscarProducto) {
    inputBuscarProducto.addEventListener("input", () => {
      const valor = inputBuscarProducto.value.trim();
      clearTimeout(timeoutBusquedaProducto);

      if (!valor || valor.length < 1) {
        const dropdown = document.getElementById("dropdownProductosAlmacen");
        if (dropdown) dropdown.style.display = "none";
        return;
      }

      timeoutBusquedaProducto = setTimeout(() => {
        const filtrados = productosCache.filter(p => {
          const texto = `${p.folio || ""} ${p.descripcion || p.nombre_producto || ""}`.toLowerCase();
          return texto.includes(valor.toLowerCase());
        });

        const dropdown = crearDropdownProductosAlmacen();
        dropdown.innerHTML = "";

        if (filtrados.length === 0) {
          dropdown.innerHTML = '<div class="dropdown-item text-muted">No se encontraron productos</div>';
          dropdown.style.display = "block";
          return;
        }

        filtrados.slice(0, 10).forEach(p => {
          const item = document.createElement("a");
          item.className = "dropdown-item";
          item.href = "#";
          item.style.cursor = "pointer";
          const nombre = p.descripcion || p.nombre_producto || `Producto ${p.id_producto}`;
          item.innerHTML = `<strong>${p.folio || ""}</strong> - ${nombre}`;
          item.setAttribute("data-id", p.id_producto);
          item.setAttribute("data-label", `${p.folio || ""} - ${nombre}`);

          item.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            inputBuscarProducto.value = item.getAttribute("data-label");
            dropdown.style.display = "none";
            productoFiltroId = Number(p.id_producto);

            try {
              const resultado = await getAlmacenesPorProductoAPI(productoFiltroId);
              almacenesPorProducto = resultado;
              if (btnLimpiarFiltro) btnLimpiarFiltro.style.display = "";
              renderTabla(inputBuscar ? inputBuscar.value : "");
            } catch (err) {
              console.error("Error al filtrar por producto:", err);
              await Swal.fire({ icon: "error", title: "Error", text: "Error al consultar almacenes por producto", confirmButtonText: "Aceptar" });
            }
          });

          dropdown.appendChild(item);
        });

        dropdown.style.display = "block";
      }, 300);
    });

    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("dropdownProductosAlmacen");
      if (dropdown && !inputBuscarProducto.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  // Limpiar filtro de producto
  if (btnLimpiarFiltro) {
    btnLimpiarFiltro.addEventListener("click", () => {
      productoFiltroId = null;
      almacenesPorProducto = null;
      inputBuscarProducto.value = "";
      btnLimpiarFiltro.style.display = "none";
      renderTabla(inputBuscar ? inputBuscar.value : "");
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

  try {
    productosCache = await getProductosAPI();
  } catch (err) {
    console.error("Error al cargar productos:", err.message);
  }

  renderCategoriasTemporales();
  actualizarResumenCategorias();
  actualizarEncabezadoCategorias();
}

  cargarDatosIniciales();
});