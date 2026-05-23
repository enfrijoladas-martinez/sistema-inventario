document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://146.190.165.82";

  const btnGuardar = document.getElementById("btnGuardarMovimiento");
  const form = document.getElementById("formularioMovimiento");
  const tbody = document.querySelector("#dataTable tbody");
  const inputBuscar = document.getElementById("buscarMovimiento");

  const inpFecha = document.getElementById("fechaMovimiento");
  const selectTipo = document.getElementById("tipoMovimiento");
  const selectInventario = document.getElementById("selectInventarioMovimiento");
  const inpCantidad = document.getElementById("cantidadMovimiento");

  const tituloModal = document.getElementById("tituloModal");
  const modalRegistro = "#modalNuevoMovimiento";

  const usuario = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
  const esEmpleado = (usuario.rol || "").toLowerCase() === "empleado";

  let modo = "create";
  let idEditando = null;

  let movimientosCache = [];
  let inventariosCache = [];
  let productosCache = [];
  let almacenesCache = [];

  const norm = (v) => (v ?? "").toString().trim();

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

  function textoTipo(tipo) {
    return tipo ? "Entrada" : "Salida";
  }

  function formatearFecha(fechaRaw) {
    if (!fechaRaw) return "";

    let fechaObj;

    if (/^\d{2}-\d{2}-\d{4}/.test(fechaRaw)) {
      const [fechaParte, horaParte = "00:00:00"] = fechaRaw.split(" ");
      const [dd, mm, yyyy] = fechaParte.split("-");
      const [hh = "00", mi = "00"] = horaParte.split(":");
      fechaObj = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00`);
    } else {
      fechaObj = new Date(fechaRaw);
    }

    if (isNaN(fechaObj.getTime())) return fechaRaw;

    const yyyy = fechaObj.getFullYear();
    const mm = String(fechaObj.getMonth() + 1).padStart(2, "0");
    const dd = String(fechaObj.getDate()).padStart(2, "0");
    const hh = String(fechaObj.getHours()).padStart(2, "0");
    const mi = String(fechaObj.getMinutes()).padStart(2, "0");

    return `${dd}-${mm}-${yyyy} ${hh}:${mi}`;
  }

  function fechaInputValue(fecha) {
    if (!fecha) return new Date().toISOString().slice(0, 16);

    const d = new Date(fecha);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().slice(0, 16);
    }

    return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  }

  function resetFormulario() {
    if (form) form.reset();
    if (inpFecha) {
      inpFecha.value = new Date().toISOString().slice(0, 16);
      inpFecha.disabled = false;
    }
    modo = "create";
    idEditando = null;
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

    if (data?.success === false) {
      throw new Error(data.message || "Ocurrió un error");
    }

    return data;
  }

  if (esEmpleado) {
    const btnNuevo = document.querySelector('[data-target="#modalNuevoMovimiento"]');
    if (btnNuevo) btnNuevo.style.display = "none";
  }

  async function getMovimientosAPI() {
    const res = await apiFetch("/api/movimientos/", { auth: false });
    const data = Array.isArray(res.data) ? res.data : [];
    return data.map(m => ({
      ...m,
      fecha: m.fecha || m.fecha_creacion || m.fecha_movimiento || ""
    }));
  }

  async function getMovimientoDetalleAPI(idMovimiento) {
    const res = await apiFetch(`/api/movimientos/${idMovimiento}`, { auth: false });
    return res.data || null;
  }

  async function crearMovimientoAPI(payload) {
    return await apiFetch("/api/movimientos/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function actualizarMovimientoAPI(idMovimiento, payload) {
    return await apiFetch(`/api/movimientos/${idMovimiento}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async function eliminarMovimientoAPI(idMovimiento) {
    return await apiFetch(`/api/movimientos/${idMovimiento}`, {
      method: "DELETE"
    });
  }

  async function getInventariosAPI() {
    const res = await apiFetch("/api/inventarios/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getInventarioDetalleAPI(idInventario) {
    const res = await apiFetch(`/api/inventarios/${idInventario}`, { auth: false });
    return res.data || null;
  }

  async function getProductosAPI() {
    const res = await apiFetch("/api/productos/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getAlmacenesAPI() {
    const res = await apiFetch("/api/almacenes/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function cargarCatalogos() {
    const [inventarios, productos, almacenes] = await Promise.all([
      getInventariosAPI(),
      getProductosAPI(),
      getAlmacenesAPI()
    ]);

    inventariosCache = inventarios;
    productosCache = productos;
    almacenesCache = almacenes;
  }

  async function cargarInventarios() {
    await cargarCatalogos();

    selectInventario.innerHTML = `
      <option value="">Elegir producto y almacén...</option>
    `;

    inventariosCache.forEach((inv) => {
      const descripcionProducto =
        inv.descripcion_producto ||
        inv.nombre_producto ||
        inv.descripcion ||
        `Producto ${inv.id_producto ?? ""}`;

      const nombreAlmacen =
        inv.nombre_almacen ||
        inv.nombre ||
        inv.descripcion_almacen ||
        `Almacén ${inv.id_almacen ?? ""}`;

      selectInventario.innerHTML += `
        <option value="${inv.id_inventario}">
          ${descripcionProducto} - ${nombreAlmacen}
        </option>
      `;
    });
  }

  function buscarProductoPorCoincidencia({ idProducto, folioProducto, descripcionProducto }) {
    if (Number.isFinite(Number(idProducto))) {
      const porId = productosCache.find(
        (p) => Number(p.id_producto) === Number(idProducto)
      );
      if (porId) return porId;
    }

    const folioNorm = norm(folioProducto).toLowerCase();
    if (folioNorm) {
      const porFolio = productosCache.find((p) => {
        const posiblesFolios = [
          p.folio,
          p.folio_producto,
          p.codigo,
          p.cod_producto
        ]
          .map((x) => norm(x).toLowerCase())
          .filter(Boolean);

        return posiblesFolios.includes(folioNorm);
      });
      if (porFolio) return porFolio;
    }

    const descNorm = norm(descripcionProducto).toLowerCase();
    if (descNorm) {
      const porDescripcion = productosCache.find((p) => {
        const posiblesDescripciones = [
          p.descripcion,
          p.descripcion_producto,
          p.nombre_producto,
          p.nombre
        ]
          .map((x) => norm(x).toLowerCase())
          .filter(Boolean);

        return posiblesDescripciones.includes(descNorm);
      });
      if (porDescripcion) return porDescripcion;
    }

    return null;
  }

  function buscarAlmacenPorCoincidencia({ idAlmacen, folioAlmacen, nombreAlmacen }) {
    if (Number.isFinite(Number(idAlmacen))) {
      const porId = almacenesCache.find(
        (a) => Number(a.id_almacen) === Number(idAlmacen)
      );
      if (porId) return porId;
    }

    const folioNorm = norm(folioAlmacen).toLowerCase();
    if (folioNorm) {
      const porFolio = almacenesCache.find((a) => {
        const posiblesFolios = [
          a.folio,
          a.folio_almacen,
          a.codigo
        ]
          .map((x) => norm(x).toLowerCase())
          .filter(Boolean);

        return posiblesFolios.includes(folioNorm);
      });
      if (porFolio) return porFolio;
    }

    const nombreNorm = norm(nombreAlmacen).toLowerCase();
    if (nombreNorm) {
      const porNombre = almacenesCache.find((a) => {
        const posiblesNombres = [
          a.nombre,
          a.nombre_almacen,
          a.descripcion
        ]
          .map((x) => norm(x).toLowerCase())
          .filter(Boolean);

        return posiblesNombres.includes(nombreNorm);
      });
      if (porNombre) return porNombre;
    }

    return null;
  }

  async function resolverIdsDesdeInventario(idInventario) {
    const inventarioLista = inventariosCache.find(
      (inv) => String(inv.id_inventario) === String(idInventario)
    );

    let inventarioDetalle = null;

    try {
      inventarioDetalle = await getInventarioDetalleAPI(idInventario);
    } catch (error) {
      console.warn("No se pudo obtener detalle del inventario:", error.message);
    }

    let idProducto = Number(
      inventarioDetalle?.id_producto ?? inventarioLista?.id_producto
    );

    let idAlmacen = Number(
      inventarioDetalle?.id_almacen ?? inventarioLista?.id_almacen
    );

    if (!Number.isFinite(idProducto)) {
      const producto = buscarProductoPorCoincidencia({
        idProducto: inventarioDetalle?.id_producto ?? inventarioLista?.id_producto,
        folioProducto:
          inventarioDetalle?.folio_producto ??
          inventarioLista?.folio_producto,
        descripcionProducto:
          inventarioDetalle?.descripcion_producto ??
          inventarioLista?.descripcion_producto ??
          inventarioLista?.nombre_producto
      });

      if (producto) {
        idProducto = Number(producto.id_producto);
      }
    }

    if (!Number.isFinite(idAlmacen)) {
      const almacen = buscarAlmacenPorCoincidencia({
        idAlmacen: inventarioDetalle?.id_almacen ?? inventarioLista?.id_almacen,
        folioAlmacen:
          inventarioDetalle?.folio_almacen ??
          inventarioLista?.folio_almacen,
        nombreAlmacen:
          inventarioDetalle?.nombre_almacen ??
          inventarioLista?.nombre_almacen
      });

      if (almacen) {
        idAlmacen = Number(almacen.id_almacen);
      }
    }

    if (!Number.isFinite(idProducto) || !Number.isFinite(idAlmacen)) {
      console.log("inventarioDetalle", inventarioDetalle);
      console.log("inventarioLista", inventarioLista);
      console.log("productosCache", productosCache);
      console.log("almacenesCache", almacenesCache);

      throw new Error(
        "No se pudieron resolver los ids del producto o almacén desde el inventario seleccionado."
      );
    }

    return {
      id_producto: idProducto,
      id_almacen: idAlmacen
    };
  }

  function buscarInventarioPorProductoYAlmacen(idProducto, idAlmacen) {
    return inventariosCache.find(
      (inv) =>
        String(inv.id_producto) === String(idProducto) &&
        String(inv.id_almacen) === String(idAlmacen)
    );
  }

  async function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();

    movimientosCache = await getMovimientosAPI();

    const lista = !f
      ? movimientosCache
      : movimientosCache.filter((m) => {
          const texto = `
            ${m.id_mov || ""}
            ${m.fecha || ""}
            ${textoTipo(m.tipo)}
            ${m.descripcion_producto || ""}
            ${m.nombre_almacen || ""}
            ${m.cantidad || ""}
          `.toLowerCase();

          return texto.includes(f);
        });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">No hay movimientos registrados.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((m) => `
      <tr data-id="${m.id_mov}">
        <td>${formatearFecha(m.fecha) || ""}</td>
        <td>${textoTipo(m.tipo)}</td>
        <td>${m.descripcion_producto || ""}</td>
        <td>${m.nombre_almacen || ""}</td>
        <td>${m.cantidad ?? 0}</td>
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

  async function abrirDetalle(mov) {
    try {
      const detalle = await getMovimientoDetalleAPI(mov.id_mov);

      if (!detalle) {
        await showError("No se pudo obtener el detalle del movimiento");
        return;
      }

      const detalleIdMovimiento = document.getElementById("detalleIdMovimiento");
      const detalleTipoMovimiento = document.getElementById("detalleTipoMovimiento");
      const detalleIdVentaMovimiento = document.getElementById("detalleIdVentaMovimiento");
      const detalleProductoMovimiento = document.getElementById("detalleProductoMovimiento");
      const detalleAlmacenMovimiento = document.getElementById("detalleAlmacenMovimiento");
      const detalleCantidadMovimiento = document.getElementById("detalleCantidadMovimiento");

      if (detalleIdMovimiento) detalleIdMovimiento.textContent = detalle.id_mov ?? "";
      if (detalleTipoMovimiento) detalleTipoMovimiento.textContent = textoTipo(detalle.tipo);
      if (detalleIdVentaMovimiento) {
        const folioVenta = detalle.venta?.folio || detalle.folio_venta || null;
        detalleIdVentaMovimiento.textContent = folioVenta || "No aplica";
      }
      if (detalleProductoMovimiento) detalleProductoMovimiento.textContent = detalle.descripcion_producto || "";
      if (detalleAlmacenMovimiento) detalleAlmacenMovimiento.textContent = detalle.nombre_almacen || "";
      if (detalleCantidadMovimiento) detalleCantidadMovimiento.textContent = detalle.cantidad ?? "";

      $("#modalDetalleMovimiento").modal("show");
    } catch (error) {
      await showError(error.message);
    }
  }

  async function abrirEditar(mov) {
    try {
      const detalle = await getMovimientoDetalleAPI(mov.id_mov);

      if (!detalle) {
        await showError("No se pudo obtener el detalle del movimiento");
        return;
      }

      modo = "edit";
      idEditando = detalle.id_mov;

      if (inpFecha) {
        inpFecha.value = fechaInputValue(detalle.fecha);
        inpFecha.disabled = true;
      }
      selectTipo.value = detalle.tipo ? "entrada" : "salida";
      inpCantidad.value = detalle.cantidad ?? "";

      await cargarInventarios();

      const inventarioRelacionado = buscarInventarioPorProductoYAlmacen(
        detalle.id_producto,
        detalle.id_almacen
      );

      selectInventario.value = inventarioRelacionado
        ? inventarioRelacionado.id_inventario
        : "";

      tituloModal.textContent = `Editar Movimiento ${detalle.id_mov}`;
      btnGuardar.textContent = "Guardar Cambios";
      $(modalRegistro).modal("show");
    } catch (error) {
      await showError(error.message);
    }
  }

  $(modalRegistro).on("show.bs.modal", async function () {
    try {
      await cargarInventarios();

      if (modo !== "edit") {
        resetFormulario();
        tituloModal.textContent = "Registrar Movimiento";
        btnGuardar.textContent = "Guardar Movimiento";
      }
    } catch (error) {
      await showError(error.message);
    }
  });

  $(modalRegistro).on("hidden.bs.modal", function () {
    resetFormulario();
    tituloModal.textContent = "Registrar Movimiento";
    btnGuardar.textContent = "Guardar Movimiento";
  });

  if (btnGuardar) {
    btnGuardar.addEventListener("click", async (e) => {
      e.preventDefault();

      const fecha = norm(inpFecha.value);
      const tipoTexto = norm(selectTipo.value).toLowerCase();
      const idInventario = norm(selectInventario.value);
      const cantidad = Number(inpCantidad.value);

      if (!fecha || !tipoTexto || !idInventario) {
        await showWarning("Completa fecha, tipo e inventario");
        return;
      }

      if (isNaN(cantidad) || cantidad <= 0) {
        await showWarning("Ingresa una cantidad válida");
        return;
      }

      const textoOriginalBoton = btnGuardar.textContent;
      btnGuardar.disabled = true;
      btnGuardar.textContent = "Guardando...";

      try {
        const idsInventario = await resolverIdsDesdeInventario(idInventario);

        const payload = {
          tipo: tipoTexto === "entrada",
          cantidad,
          id_producto: idsInventario.id_producto,
          id_almacen: idsInventario.id_almacen
        };

        if (modo === "create") {
          await crearMovimientoAPI(payload);
          await showSuccess("Movimiento registrado correctamente");
        } else {
          await actualizarMovimientoAPI(idEditando, payload);
          await showSuccess("Movimiento actualizado correctamente");
        }

        await cargarInventarios();
        await renderTabla(inputBuscar ? inputBuscar.value : "");
        resetFormulario();
        $(modalRegistro).modal("hide");
      } catch (error) {
        console.error(error);
        await showError(error.message || "Error al guardar movimiento");
      } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = textoOriginalBoton;
      }
    });
  }

  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      const id = Number(tr.getAttribute("data-id"));
      const mov = movimientosCache.find((m) => Number(m.id_mov) === id);

      if (!mov) return;

      if (e.target.closest(".btn-detalle")) {
        await abrirDetalle(mov);
        return;
      }

      if (e.target.closest(".btn-editar")) {
        await abrirEditar(mov);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        const confirmar = await confirmDelete(`¿Eliminar el movimiento ${mov.id_mov}?`);
        if (!confirmar) return;

        try {
          await eliminarMovimientoAPI(mov.id_mov);
          await cargarInventarios();
          await renderTabla(inputBuscar ? inputBuscar.value : "");
          await showSuccess("Movimiento eliminado correctamente");
        } catch (error) {
          console.error(error);
          await showError(error.message || "Error al eliminar movimiento");
        }
      }
    });
  }

  if (inputBuscar) {
    inputBuscar.addEventListener("input", async () => {
      try {
        await renderTabla(inputBuscar.value);
      } catch (error) {
        await showError(error.message);
      }
    });
  }

  (async function init() {
    try {
      await cargarInventarios();
      await renderTabla();
      resetFormulario();
    } catch (error) {
      await showError(`Error al cargar datos iniciales: ${error.message}`);
    }
  })();
});