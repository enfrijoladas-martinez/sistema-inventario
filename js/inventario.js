document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://146.190.165.82";

  const btnGuardar = document.getElementById("btnGuardarInventario");
  const form = document.getElementById("formularioInventario");
  const tbody = document.querySelector("#dataTable tbody");
  const inputBuscar = document.getElementById("buscarInventario");

  const selectProducto = document.getElementById("selectProducto");
  const selectAlmacen = document.getElementById("selectAlmacen");
  const inpStock = document.getElementById("stockInventario");
  const inpMinStock = document.getElementById("minStockInventario");

  const tituloModal = document.getElementById("tituloModal");
  const modalRegistro = "#modalNuevoInventario";

  const usuario = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
  const esEmpleado = (usuario.rol || "").toLowerCase() === "empleado";

  let inventariosCache = [];
  let productosCache = [];
  let almacenesCache = [];

  const norm = (v) => (v ?? "").toString().trim();

  function money(valor) {
    return Number(valor || 0).toFixed(2);
  }

  function showError(texto) {
    return Swal.fire({
      icon: "error",
      title: "Error",
      text: texto,
      confirmButtonText: "Aceptar"
    });
  }

  function showSuccess(texto) {
    return Swal.fire({
      icon: "success",
      title: "Éxito",
      text: texto,
      confirmButtonText: "Aceptar"
    });
  }

  function showWarning(texto) {
    return Swal.fire({
      icon: "warning",
      title: "Atención",
      text: texto,
      confirmButtonText: "Aceptar"
    });
  }

  async function confirmDelete(texto) {
    const result = await Swal.fire({
      icon: "warning",
      title: "¿Estás seguro?",
      text: texto,
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      reverseButtons: true
    });
    return result.isConfirmed;
  }

  async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    if (options.auth === false) {
      delete headers["Authorization"];
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options
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

    return data;
  }

  if (esEmpleado) {
    const btnNuevo = document.querySelector('[data-target="#modalNuevoInventario"]');
    if (btnNuevo) btnNuevo.style.display = "none";
  }

  async function getInventariosAPI() {
    const res = await apiFetch("/api/inventarios/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getInventarioDetalleAPI(idInventario) {
    const res = await apiFetch(`/api/inventarios/${idInventario}`, { auth: false });
    return res.data || null;
  }

  async function crearInventarioAPI(payload) {
    return await apiFetch("/api/inventarios/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function eliminarInventarioAPI(idInventario) {
    return await apiFetch(`/api/inventarios/${idInventario}`, {
      method: "DELETE"
    });
  }

  async function getProductosAPI() {
    const res = await apiFetch("/api/productos/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function buscarProductosAPI(valor) {
    const res = await apiFetch(`/api/productos/${encodeURIComponent(valor)}`, { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getAlmacenesAPI() {
    const res = await apiFetch("/api/almacenes/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  let productoSeleccionadoId = null;
  let timeoutBusqueda = null;

  function crearDropdownResultados() {
    let dropdown = document.getElementById("dropdownProductos");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "dropdownProductos";
      dropdown.className = "dropdown-menu w-100 show";
      dropdown.style.position = "absolute";
      dropdown.style.zIndex = "1000";
      dropdown.style.maxHeight = "300px";
      dropdown.style.overflowY = "auto";
      dropdown.style.display = "none";
      dropdown.style.width = "100%";
      dropdown.style.marginTop = "0px";
      const parent = selectProducto.parentNode;
      if (getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
      }
      parent.appendChild(dropdown);
    }
    return dropdown;
  }

  if (selectProducto) {
    selectProducto.addEventListener("input", () => {
      const valor = selectProducto.value.trim();
      productoSeleccionadoId = null;
      selectAlmacen.innerHTML = '<option value="">Primero seleccione un producto...</option>';
      selectAlmacen.disabled = true;
      clearTimeout(timeoutBusqueda);

      if (!valor || valor.length < 2) {
        const dropdown = document.getElementById("dropdownProductos");
        if (dropdown) dropdown.style.display = "none";
        return;
      }

      timeoutBusqueda = setTimeout(async () => {
        try {
          const productos = await buscarProductosAPI(valor);
          const dropdown = crearDropdownResultados();
          dropdown.innerHTML = "";

          if (productos.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item text-muted">No se encontraron productos</div>';
            dropdown.style.display = "block";
            return;
          }

          productos.slice(0, 10).forEach((p) => {
            const item = document.createElement("a");
            item.className = "dropdown-item";
            item.href = "#";
            item.style.cursor = "pointer";
            const nombre = p.descripcion || p.nombre_producto || `Producto ${p.id_producto}`;
            item.innerHTML = `<strong>${p.folio || ""}</strong> - ${nombre}`;
            item.setAttribute("data-id", p.id_producto);
            item.setAttribute("data-folio", p.folio || "");
            item.setAttribute("data-nombre", nombre);

            item.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              productoSeleccionadoId = Number(p.id_producto);
              selectProducto.value = `${p.folio || ""} - ${nombre}`;
              dropdown.style.display = "none";

              selectAlmacen.innerHTML = '<option value="">Cargando almacenes...</option>';
              selectAlmacen.disabled = true;
              try {
                const almacenes = await getAlmacenesAPI();
                almacenesCache = almacenes;
                selectAlmacen.innerHTML = '<option value="">Elegir almacén...</option>';
                almacenesCache.forEach((a) => {
                  const opt = document.createElement("option");
                  opt.value = a.id_almacen;
                  opt.textContent = a.nombre_almacen || a.nombre || a.descripcion || `Almacén ${a.id_almacen}`;
                  selectAlmacen.appendChild(opt);
                });
              } catch (error) {
                selectAlmacen.innerHTML = '<option value="">Error al cargar almacenes</option>';
              } finally {
                selectAlmacen.disabled = false;
              }
            });

            dropdown.appendChild(item);
          });

          dropdown.style.display = "block";
        } catch (error) {
          console.error("Error al buscar productos:", error);
        }
      }, 300);
    });

    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("dropdownProductos");
      if (dropdown && !selectProducto.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  function cargarAlmacenes() {
    selectAlmacen.innerHTML = `
      <option value="">Elegir almacén...</option>
    `;

    almacenesCache.forEach((a) => {
      const option = document.createElement("option");
      option.value = a.id_almacen;
      option.textContent =
        a.nombre_almacen || a.nombre || a.descripcion || `Almacén ${a.id_almacen}`;
      selectAlmacen.appendChild(option);
    });
  }

  function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();

    const lista = !f
      ? inventariosCache
      : inventariosCache.filter((i) => {
          const texto = `
            ${i.descripcion_producto || ""}
            ${i.nombre_almacen || ""}
            ${i.stock || ""}
            ${i.min_stock || ""}
          `.toLowerCase();

          return texto.includes(f);
        });

    let tablaBody = document.querySelector("#dataTable tbody");
    if (!tablaBody) {
      tablaBody = document.createElement("tbody");
      document.getElementById("dataTable").appendChild(tablaBody);
    }

    if (!lista.length) {
      tablaBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">No hay inventarios registrados.</td>
        </tr>
      `;
      return;
    }

    tablaBody.innerHTML = lista.map((i) => `
      <tr data-id="${i.id_inventario}">
        <td>${i.descripcion_producto || ""}</td>
        <td>${i.nombre_almacen || ""}</td>
        <td>${i.stock ?? 0}</td>
        <td>${i.min_stock ?? 0}</td>
        <td>
          <button type="button" class="btn btn-info btn-circle btn-sm btn-detalle" title="Ver detalle">
            <i class="fas fa-eye"></i>
          </button>
          ${!esEmpleado ? `
          <button type="button" class="btn btn-danger btn-circle btn-sm btn-eliminar" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
          ` : ""}
        </td>
      </tr>
    `).join("");
  }

  function resetFormulario() {
    form.reset();
    productoSeleccionadoId = null;
    selectProducto.value = "";
    const dropdown = document.getElementById("dropdownProductos");
    if (dropdown) dropdown.style.display = "none";
    selectAlmacen.innerHTML = '<option value="">Elegir almacén...</option>';
    selectAlmacen.disabled = false;
    tituloModal.textContent = "Registrar Inventario";
  }

  async function abrirDetalle(idInventario) {
    try {
      const inv = await getInventarioDetalleAPI(idInventario);

      if (!inv) {
        await showError("No se pudo obtener el detalle del inventario");
        return;
      }

      document.getElementById("detalleIdInventario").textContent = inv.id_inventario ?? "";
      document.getElementById("detalleProducto").textContent = inv.descripcion_producto ?? "";
      document.getElementById("detalleFolioProducto").textContent = inv.folio_producto ?? "";
      document.getElementById("detalleAlmacen").textContent = inv.nombre_almacen ?? "";
      document.getElementById("detalleFolioAlmacen").textContent = inv.folio_almacen ?? "";
      document.getElementById("detalleStock").textContent = inv.stock ?? 0;
      document.getElementById("detalleMinStock").textContent = inv.min_stock ?? 0;
      document.getElementById("detalleCostoProducto").textContent = `$${money(inv.costo_producto)}`;
      document.getElementById("detallePrecioProducto").textContent = `$${money(inv.precio_producto)}`;

      $("#modalDetalleInventario").modal("show");
    } catch (error) {
      await showError(error.message);
    }
  }

  async function cargarDatosIniciales() {
    try {
      const [inventarios, productos, almacenes] = await Promise.all([
        getInventariosAPI(),
        getProductosAPI(),
        getAlmacenesAPI()
      ]);

      inventariosCache = inventarios;
      productosCache = productos;
      almacenesCache = almacenes;

      cargarAlmacenes();
      renderTabla();
    } catch (error) {
      await showError(`Error al cargar datos iniciales: ${error.message}`);
    }
  }

  $(modalRegistro).on("show.bs.modal", function () {
    resetFormulario();
    cargarAlmacenes();
  });

  if (btnGuardar) {
    btnGuardar.addEventListener("click", async (e) => {
      e.preventDefault();

      const idProducto = productoSeleccionadoId;
      const idAlmacen = Number(selectAlmacen.value);
      const stock = Number(inpStock.value);
      const minStock = Number(inpMinStock.value);

      if (!idProducto || !idAlmacen) {
        await showWarning("Selecciona producto y almacén");
        return;
      }

      if (isNaN(stock) || stock < 0 || isNaN(minStock) || minStock < 0) {
        await showWarning("Ingresa valores válidos para stock y stock mínimo");
        return;
      }

      try {
        await crearInventarioAPI({
          id_producto: idProducto,
          id_almacen: idAlmacen,
          stock,
          min_stock: minStock
        });

        inventariosCache = await getInventariosAPI();
        renderTabla(inputBuscar ? inputBuscar.value : "");
        resetFormulario();
        $(modalRegistro).modal("hide");
        await showSuccess("Inventario creado correctamente");
      } catch (error) {
        await showError(error.message);
      }
    });
  }

  // Event delegation for table actions
  document.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      if (!tr || !tr.closest("#dataTable")) return;

      const idInventario = Number(tr.getAttribute("data-id"));
      if (!idInventario) return;

      if (e.target.closest(".btn-detalle")) {
        await abrirDetalle(idInventario);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        const confirmar = await confirmDelete("¿Eliminar inventario?");
        if (!confirmar) return;

        try {
          await eliminarInventarioAPI(idInventario);
          inventariosCache = await getInventariosAPI();
          renderTabla(inputBuscar ? inputBuscar.value : "");
          await showSuccess("Inventario eliminado correctamente");
        } catch (error) {
          await showError(error.message);
        }
      }
    });

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }

  cargarDatosIniciales();
});