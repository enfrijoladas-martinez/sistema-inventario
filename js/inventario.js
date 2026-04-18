document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://143.198.230.63";

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

  let inventariosCache = [];
  let productosCache = [];
  let almacenesCache = [];

  const norm = (v) => (v ?? "").toString().trim();

  function money(valor) {
    return Number(valor || 0).toFixed(2);
  }

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

    return data;
  }

  async function getInventariosAPI() {
    const res = await apiFetch("/api/inventarios/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getInventarioDetalleAPI(idInventario) {
    const res = await apiFetch(`/api/inventarios/${idInventario}`);
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
    const res = await apiFetch("/api/productos/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getAlmacenesAPI() {
    const res = await apiFetch("/api/almacenes/");
    return Array.isArray(res.data) ? res.data : [];
  }

  function cargarProductos() {
    selectProducto.innerHTML = `
      <option value="">Elegir producto...</option>
    `;

    productosCache.forEach((p) => {
      const option = document.createElement("option");
      option.value = p.id_producto;
      option.textContent =
        p.descripcion_producto || p.nombre_producto || p.descripcion || `Producto ${p.id_producto}`;
      selectProducto.appendChild(option);
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

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted">No hay inventarios registrados.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((i) => `
      <tr data-id="${i.id_inventario}">
        <td>${i.descripcion_producto || ""}</td>
        <td>${i.nombre_almacen || ""}</td>
        <td>${i.stock ?? 0}</td>
        <td>${i.min_stock ?? 0}</td>
        <td>
          <button type="button" class="btn btn-info btn-circle btn-sm btn-detalle" title="Ver detalle">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn btn-danger btn-circle btn-sm btn-eliminar" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }

  function resetFormulario() {
    form.reset();
    tituloModal.textContent = "Registrar Inventario";
  }

  async function abrirDetalle(idInventario) {
    try {
      const inv = await getInventarioDetalleAPI(idInventario);

      if (!inv) {
        alert("No se pudo obtener el detalle del inventario");
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
      alert(error.message);
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

      cargarProductos();
      cargarAlmacenes();
      renderTabla();
    } catch (error) {
      alert(`Error al cargar datos iniciales: ${error.message}`);
    }
  }

  $(modalRegistro).on("show.bs.modal", function () {
    resetFormulario();
  });

  if (btnGuardar) {
    btnGuardar.addEventListener("click", async (e) => {
      e.preventDefault();

      const idProducto = Number(selectProducto.value);
      const idAlmacen = Number(selectAlmacen.value);
      const stock = Number(inpStock.value);
      const minStock = Number(inpMinStock.value);

      if (!idProducto || !idAlmacen) {
        alert("Selecciona producto y almacén");
        return;
      }

      if (isNaN(stock) || stock < 0 || isNaN(minStock) || minStock < 0) {
        alert("Ingresa valores válidos para stock y stock mínimo");
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
        alert("Inventario creado correctamente");
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      const idInventario = Number(tr.getAttribute("data-id"));
      if (!idInventario) return;

      if (e.target.closest(".btn-detalle")) {
        await abrirDetalle(idInventario);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        if (!confirm("¿Eliminar inventario?")) return;

        try {
          await eliminarInventarioAPI(idInventario);
          inventariosCache = await getInventariosAPI();
          renderTabla(inputBuscar ? inputBuscar.value : "");
          alert("Inventario eliminado correctamente");
        } catch (error) {
          alert(error.message);
        }
      }
    });
  }

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }

  cargarDatosIniciales();
});