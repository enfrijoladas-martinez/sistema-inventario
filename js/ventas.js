document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://146.190.165.82/api";

  const btnGuardar = document.getElementById("btnGuardarVenta");
  const btnAgregarDetalle = document.getElementById("btnAgregarDetalleVenta");

  const form = document.getElementById("formularioVenta");
  const tbody = document.querySelector("#dataTable tbody");
  const tbodyDetalleVenta = document.getElementById("tbodyDetalleVenta");
  const inputBuscar =
    document.getElementById("buscarVenta") ||
    document.getElementById("buscarVentas");

  const inpFolio = document.getElementById("folioVenta");
  const selectEstado = document.getElementById("selectEstadoVenta");
  const selectMunicipio = document.getElementById("selectMunicipioVenta");

  const selectProductoVenta = document.getElementById("selectProductoVenta");
  const selectAlmacenVenta = document.getElementById("selectAlmacenVenta");
  const inpCantidadVenta = document.getElementById("cantidadVenta");
  const inpPrecioVenta = document.getElementById("precioVenta");
  const totalVenta = document.getElementById("totalVenta");

  const tituloModal = document.getElementById("tituloModal");
  const modalRegistro = "#modalNuevaVenta";

  const IVA = 0.16;

  let modo = "create";
  let idVentaEditando = null;
  let detalleVentaTemporal = [];

  let ventasCache = [];
  let productosCache = [];
  let almacenesCache = [];
  let inventariosCache = [];
  let estadosCache = [];
  let municipiosCache = [];

  const norm = (v) => (v ?? "").toString().trim();

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

  function money(valor) {
    return Number(valor || 0).toFixed(2);
  }

  function calcularPrecioConIVA(precio) {
    return Number(precio || 0) * (1 + IVA);
  }

  function showSuccess(texto) {
    return Swal.fire({
      icon: "success",
      title: "Éxito",
      text: texto,
      confirmButtonText: "Aceptar"
    });
  }

  function showError(texto) {
    return Swal.fire({
      icon: "error",
      title: "Error",
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

    const url = `${API_BASE}${endpoint}`;
    console.log("Request URL:", url);
    const response = await fetch(url, {
      headers,
      ...options
    });

    const data = await response.json().catch(() => null);

    if (!data) {
      throw new Error(`Error del servidor (${response.status})`);
    }

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        Swal.fire({
          icon: 'warning',
          title: 'Sesión expirada o inválida',
          text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
          confirmButtonText: 'Entendido'
        });
      }
      const mensaje = (data?.message || data?.error || data?.msg || "Error en la petición");
      throw new Error(mensaje || `Error del servidor (${response.status})`);
    }

    if (data?.success === false) {
      const mensaje = data?.message || data?.error || data?.msg || "Ocurrió un error";
      throw new Error(mensaje);
    }

    return data;
  }

  async function getVentasAPI() {
    const res = await apiFetch("/ventas/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getVentaAPI(idVenta) {
    const res = await apiFetch(`/ventas/${idVenta}`);
    return res.data || null;
  }

  async function crearVentaAPI(payload) {
    console.log("Payload enviado:", JSON.stringify(payload, null, 2));
    return await apiFetch("/ventas/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function actualizarVentaAPI(idVenta, payload) {
    return await apiFetch(`/ventas/${idVenta}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async function eliminarVentaAPI(idVenta) {
    return await apiFetch(`/ventas/${idVenta}`, {
      method: "DELETE"
    });
  }

  async function getProductosAPI() {
    const res = await apiFetch("/productos/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getProductoAPI(folio) {
    const res = await apiFetch(`/productos/${folio}`);
    return res.data || null;
  }

  async function getAlmacenesAPI() {
    const res = await apiFetch("/almacenes/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getInventariosAPI() {
    const res = await apiFetch("/inventarios/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getInventarioDetalleAPI(idInventario) {
    const res = await apiFetch(`/inventarios/${idInventario}`);
    return res.data || null;
  }

  async function getEstadosAPI() {
    const res = await apiFetch("/estados_municipios/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getMunicipiosPorEstadoAPI(idEstado) {
    if (!idEstado) return [];
    const res = await apiFetch(`/estados_municipios/${idEstado}`);
    return Array.isArray(res.data) ? res.data : [];
  }

  function normalizarVenta(v) {
    return {
      id_venta: Number(v.id_venta),
      folio: v.folio || "",
      fecha_creacion: v.fecha_creacion || v.fecha || "",
      precio_venta_final: Number(v.precio_venta_final || 0),
      id_estado: v.id_estado ? Number(v.id_estado) : null,
      id_municipio: v.id_municipio ? Number(v.id_municipio) : null,
      estado: v.estado ?? v.nombre_estado ?? null,
      municipio: v.municipio ?? v.nombre_municipio ?? null
    };
  }

  function normalizarDetalleVenta(det) {
    return {
      id_detalle_venta: det.id_detalle_venta ?? null,
      id_producto: Number(det.id_producto),
      nombre_producto:
        det.descripcion ||
        det.descripcion_producto ||
        det.nombre_producto ||
        det.folio_producto ||
        `Producto ${det.id_producto}`,
      cantidad_vendida: Number(det.cantidad_vendida || 0),
      precio_venta: Number(det.precio_venta || 0),
      id_almacen: Number(det.id_almacen) || null,
      nombre_almacen: det.nombre_almacen ?? null
    };
  }

  function obtenerCodigoEstadoPorNombre(nombreEstado) {
    if (!nombreEstado) return "";
    const encontrado = estadosCache.find(
      (e) => norm(e.nombre).toLowerCase() === norm(nombreEstado).toLowerCase()
    );
    return encontrado ? Number(encontrado.id_estado) : "";
  }

  function obtenerCodigoMunicipioPorNombre(nombreMunicipio) {
    if (!nombreMunicipio) return "";
    const encontrado = municipiosCache.find(
      (m) => norm(m.nombre).toLowerCase() === norm(nombreMunicipio).toLowerCase()
    );
    return encontrado ? Number(encontrado.id_municipio) : "";
  }

  async function cargarEstados(estadoSeleccionado = "") {
    if (!selectEstado) return;

    estadosCache = await getEstadosAPI();

    selectEstado.innerHTML = `<option value="">Elegir estado...</option>`;

    estadosCache.forEach((estado) => {
      const option = document.createElement("option");
      option.value = estado.id_estado;
      option.textContent = estado.nombre;

      if (String(estado.id_estado) === String(estadoSeleccionado)) {
        option.selected = true;
      }

      selectEstado.appendChild(option);
    });
  }

  async function cargarMunicipios(idEstado, municipioSeleccionado = "") {
    if (!selectMunicipio) return;

    selectMunicipio.innerHTML = `<option value="">Elegir municipio...</option>`;
    selectMunicipio.disabled = true;
    municipiosCache = [];

    if (!idEstado) return;

    municipiosCache = await getMunicipiosPorEstadoAPI(idEstado);

    municipiosCache.forEach((municipio) => {
      const option = document.createElement("option");
      option.value = municipio.id_municipio;
      option.textContent = municipio.nombre;

      if (String(municipio.id_municipio) === String(municipioSeleccionado)) {
        option.selected = true;
      }

      selectMunicipio.appendChild(option);
    });

    selectMunicipio.disabled = false;
  }

  function cargarProductos() {
    // No longer needed - now using API search endpoint
  }

  function cargarAlmacenes(almacenSeleccionado = "") {
    if (!selectAlmacenVenta) return;

    selectAlmacenVenta.innerHTML = `<option value="">Primero elija un producto...</option>`;
    selectAlmacenVenta.disabled = true;
  }

  function getOpcionesProductosHTML(idSeleccionado = "") {
    return `
      <option value="">Elegir producto...</option>
      ${productosCache.map((p) => `
        <option
          value="${p.id_producto}"
          data-precio="${Number(p.precio ?? p.precio_producto ?? 0)}"
          ${String(p.id_producto) === String(idSeleccionado) ? "selected" : ""}
        >
          ${p.descripcion || p.descripcion_producto || p.nombre_producto || `Producto ${p.id_producto}`}
        </option>
      `).join("")}
    `;
  }

  function getOpcionesAlmacenesHTML(idSeleccionado = "") {
    return `
      <option value="">Elegir almacén...</option>
      ${almacenesCache.map((a) => `
        <option
          value="${a.id_almacen}"
          ${String(a.id_almacen) === String(idSeleccionado) ? "selected" : ""}
        >
          ${a.nombre || a.nombre_almacen || `Almacén ${a.id_almacen}`}
        </option>
      `).join("")}
    `;
  }

  function calcularTotalTemporal() {
    const total = detalleVentaTemporal.reduce((acc, item) => {
      const precioConIVA = calcularPrecioConIVA(item.precio_venta);
      return acc + Number(item.cantidad_vendida) * precioConIVA;
    }, 0);

    totalVenta.textContent = money(total);
    return total;
  }

  function renderDetalleTemporal() {
    if (!tbodyDetalleVenta) return;

    if (detalleVentaTemporal.length === 0) {
      tbodyDetalleVenta.innerHTML = `
        <tr>
          <td colspan="7" class="text-muted">No hay productos agregados.</td>
        </tr>
      `;
      calcularTotalTemporal();
      return;
    }

    tbodyDetalleVenta.innerHTML = detalleVentaTemporal.map((item, index) => {
      const precioBase = Number(item.precio_venta) || 0;
      const precioConIVA = calcularPrecioConIVA(precioBase);
      const importe = Number(item.cantidad_vendida) * precioConIVA;

return `
          <tr data-index="${index}">
            <td>${item.nombre_producto}</td>
            <td>
              <select class="form-control form-control-sm detalle-almacen">
                ${getOpcionesAlmacenesHTML(item.id_almacen)}
              </select>
            </td>
            <td>
              <input
                type="number"
                class="form-control form-control-sm detalle-cantidad"
                value="${Number(item.cantidad_vendida) || 0}"
              >
            </td>
            <td>
              <input
                type="number"
                step="0.01"
                class="form-control form-control-sm detalle-precio"
                value="${precioBase}"
              >
            </td>
            <td class="detalle-precio-iva">$${money(precioConIVA)}</td>
            <td class="detalle-importe">$${money(importe)}</td>
          <td>
            <button type="button" class="btn btn-danger btn-sm btn-quitar-detalle">
              Quitar
            </button>
          </td>
        </tr>
      `;
    }).join("");

    calcularTotalTemporal();
  }

  function recalcularImporteFila(tr) {
    const index = Number(tr.getAttribute("data-index"));
    const item = detalleVentaTemporal[index];
    if (!item) return;

    const precioBase = Number(item.precio_venta) || 0;
    const precioConIVA = calcularPrecioConIVA(precioBase);
    const importe = Number(item.cantidad_vendida) * precioConIVA;

    const celdaPrecioIVA = tr.querySelector(".detalle-precio-iva");
    const celdaImporte = tr.querySelector(".detalle-importe");

    if (celdaPrecioIVA) celdaPrecioIVA.textContent = `$${money(precioConIVA)}`;
    if (celdaImporte) celdaImporte.textContent = `$${money(importe)}`;

    calcularTotalTemporal();
  }

  function actualizarDetalleDesdeFila(tr) {
    const index = Number(tr.getAttribute("data-index"));
    const item = detalleVentaTemporal[index];
    if (!item) return;

    const selectAlmacen = tr.querySelector(".detalle-almacen");
    const inputCantidad = tr.querySelector(".detalle-cantidad");
    const inputPrecio = tr.querySelector(".detalle-precio");

    if (selectAlmacen) {
      item.id_almacen = Number(selectAlmacen.value) || null;
      const almacen = almacenesCache.find(
        (a) => Number(a.id_almacen) === item.id_almacen
      );
      item.nombre_almacen = almacen
        ? (almacen.nombre || almacen.nombre_almacen || `Almacén ${almacen.id_almacen}`)
        : null;
    }

    if (inputCantidad) {
      item.cantidad_vendida = Number(inputCantidad.value) || 0;
    }

    if (inputPrecio) {
      item.precio_venta = Number(inputPrecio.value) || 0;
    }

    recalcularImporteFila(tr);
  }

  function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();

    const lista = !f
      ? ventasCache
      : ventasCache.filter((v) => {
          const texto = `
            ${v.folio}
            ${formatearFecha(v.fecha_creacion)}
            ${v.precio_venta_final}
            ${v.estado || ""}
            ${v.municipio || ""}
          `.toLowerCase();

          return texto.includes(f);
        });

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted">No hay ventas registradas.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = lista.map((v) => `
      <tr data-id="${v.id_venta}">
        <td>${v.folio}</td>
        <td>${formatearFecha(v.fecha_creacion)}</td>
        <td>$${money(v.precio_venta_final)}</td>
        <td>${v.estado || ""}</td>
        <td>${v.municipio || ""}</td>
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

  function generarFolioVenta() {
    const numero = ventasCache.length + 1;
    return `VTA-${String(numero).padStart(3, "0")}`;
  }

  function resetFormulario() {
    detalleVentaTemporal = [];
    modo = "create";
    idVentaEditando = null;

    if (form) form.reset();

    totalVenta.textContent = "0.00";
    renderDetalleTemporal();

    inpFolio.value = generarFolioVenta();

    if (selectEstado) selectEstado.value = "";
    if (selectMunicipio) {
      selectMunicipio.innerHTML = `<option value="">Elegir municipio...</option>`;
      selectMunicipio.disabled = true;
    }

    if (selectProductoVenta) {
      cargarProductos();
      selectProductoVenta.value = "";
      const dropdown = document.getElementById("dropdownProductosVenta");
      if (dropdown) dropdown.style.display = "none";
    }

    if (selectAlmacenVenta) {
      cargarAlmacenes();
      selectAlmacenVenta.value = "";
    }

    if (inpCantidadVenta) inpCantidadVenta.value = "";
    if (inpPrecioVenta) inpPrecioVenta.value = "";
  }

  function resolverProductoPorCoincidencia({ idProducto, folioProducto, descripcionProducto }) {
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
          p.codigo
        ].map((x) => norm(x).toLowerCase()).filter(Boolean);

        return posiblesFolios.includes(folioNorm);
      });
      if (porFolio) return porFolio;
    }

    const descripcionNorm = norm(descripcionProducto).toLowerCase();
    if (descripcionNorm) {
      const porDescripcion = productosCache.find((p) => {
        const posiblesDescripciones = [
          p.descripcion,
          p.descripcion_producto,
          p.nombre_producto,
          p.nombre
        ].map((x) => norm(x).toLowerCase()).filter(Boolean);

        return posiblesDescripciones.includes(descripcionNorm);
      });
      if (porDescripcion) return porDescripcion;
    }

    return null;
  }

  function resolverAlmacenPorCoincidencia({ idAlmacen, folioAlmacen, nombreAlmacen }) {
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
        ].map((x) => norm(x).toLowerCase()).filter(Boolean);

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
        ].map((x) => norm(x).toLowerCase()).filter(Boolean);

        return posiblesNombres.includes(nombreNorm);
      });
      if (porNombre) return porNombre;
    }

    return null;
  }

  function enriquecerInventario(base, detalle) {
    const idProductoDirecto = Number(detalle?.id_producto ?? base?.id_producto);
    const idAlmacenDirecto = Number(detalle?.id_almacen ?? base?.id_almacen);

    let producto = null;
    let almacen = null;

    if (Number.isFinite(idProductoDirecto)) {
      producto = productosCache.find(
        (p) => Number(p.id_producto) === idProductoDirecto
      );
    }

    if (!producto) {
      producto = resolverProductoPorCoincidencia({
        idProducto: detalle?.id_producto ?? base?.id_producto,
        folioProducto: detalle?.folio_producto ?? base?.folio_producto,
        descripcionProducto:
          detalle?.descripcion_producto ??
          base?.descripcion_producto ??
          base?.nombre_producto
      });
    }

    if (Number.isFinite(idAlmacenDirecto)) {
      almacen = almacenesCache.find(
        (a) => Number(a.id_almacen) === idAlmacenDirecto
      );
    }

    if (!almacen) {
      almacen = resolverAlmacenPorCoincidencia({
        idAlmacen: detalle?.id_almacen ?? base?.id_almacen,
        folioAlmacen: detalle?.folio_almacen ?? base?.folio_almacen,
        nombreAlmacen:
          detalle?.nombre_almacen ??
          base?.nombre_almacen
      });
    }

    return {
      ...base,
      ...detalle,
      id_producto: producto ? Number(producto.id_producto) : Number(base?.id_producto),
      id_almacen: almacen ? Number(almacen.id_almacen) : Number(base?.id_almacen),
      descripcion_producto:
        detalle?.descripcion_producto ??
        base?.descripcion_producto ??
        producto?.descripcion ??
        producto?.descripcion_producto ??
        producto?.nombre_producto ??
        "",
      nombre_almacen:
        detalle?.nombre_almacen ??
        base?.nombre_almacen ??
        almacen?.nombre ??
        almacen?.nombre_almacen ??
        "",
      stock: Number(base?.stock ?? detalle?.stock ?? 0)
    };
  }

  async function refrescarCatalogos() {
    const [productos, almacenes, inventariosBase] = await Promise.all([
      getProductosAPI(),
      getAlmacenesAPI(),
      getInventariosAPI()
    ]);

    productosCache = productos;
    almacenesCache = almacenes;

    const detallesInventario = await Promise.all(
      inventariosBase.map((inv) =>
        getInventarioDetalleAPI(inv.id_inventario).catch(() => null)
      )
    );

    inventariosCache = inventariosBase.map((inv, index) =>
      enriquecerInventario(inv, detallesInventario[index])
    );
  }

  async function refrescarVentas() {
    const ventas = await getVentasAPI();
    ventasCache = ventas.map(normalizarVenta);
  }

  function construirPayloadDetalle() {
    return detalleVentaTemporal.map((item) => {
      const cantidad = Number(item.cantidad_vendida || 0);
      const idProducto = Number(item.id_producto || 0);
      const idAlmacen = Number(item.id_almacen) || null;

      if (!idAlmacen) {
        throw new Error(
          `Selecciona un almacén para el producto "${item.nombre_producto}".`
        );
      }

      return {
        id_producto: idProducto,
        cantidad_vendida: cantidad,
        precio_venta: Number(item.precio_venta || 0),
        id_almacen: idAlmacen
      };
    });
  }

  function buildVentaPayload() {
    const folio = norm(inpFolio.value);
    const total = calcularTotalTemporal();

    const idEstado = selectEstado?.value ? Number(selectEstado.value) : null;
    const idMunicipio = selectMunicipio?.value ? Number(selectMunicipio.value) : null;

    return {
      folio,
      precio_venta_final: total,
      id_estado: idEstado,
      id_municipio: idMunicipio,
      detalle: construirPayloadDetalle()
    };
  }

  async function abrirDetalle(venta) {
    try {
      const ventaDetalle = await getVentaAPI(venta.id_venta);

      if (!ventaDetalle) {
        await showWarning("No se pudo obtener el detalle de la venta");
        return;
      }

      const ventaNormalizada = normalizarVenta(ventaDetalle);
      const detalles = Array.isArray(ventaDetalle.detalle)
        ? ventaDetalle.detalle.map(normalizarDetalleVenta)
        : [];

      const detalleFolioVenta = document.getElementById("detalleFolioVenta");
      const detalleTotalVenta = document.getElementById("detalleTotalVenta");
      const detalleEstadoVenta = document.getElementById("detalleEstadoVenta");
      const detalleMunicipioVenta = document.getElementById("detalleMunicipioVenta");
      const detalleItemsVenta = document.getElementById("detalleItemsVenta");

      detalleFolioVenta.textContent = ventaNormalizada.folio || "";
      detalleTotalVenta.textContent = money(ventaNormalizada.precio_venta_final);
      detalleEstadoVenta.textContent = ventaNormalizada.estado || "";
      detalleMunicipioVenta.textContent = ventaNormalizada.municipio || "";

      if (!detalles.length) {
        detalleItemsVenta.innerHTML = `<div class="text-muted">No hay productos registrados.</div>`;
      } else {
        detalleItemsVenta.innerHTML = `
          <div class="table-responsive">
            <table class="table table-bordered table-sm text-center mb-0">
              <thead class="thead-light">
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th>Precio con IVA</th>
                  <th>Importe</th>
                </tr>
              </thead>
              <tbody>
                ${detalles.map((d) => {
                  const precioBase = Number(d.precio_venta) || 0;
                  const precioConIVA = calcularPrecioConIVA(precioBase);
                  const importe = Number(d.cantidad_vendida) * precioConIVA;

                  return `
                    <tr>
                      <td>${d.nombre_producto}</td>
                      <td>${d.cantidad_vendida}</td>
                      <td>$${money(precioBase)}</td>
                      <td>$${money(precioConIVA)}</td>
                      <td>$${money(importe)}</td>
                    </tr>
                  `;
                }).join("")}
              </tbody>
            </table>
          </div>
        `;
      }

      $("#modalDetalleVenta").modal("show");
    } catch (error) {
      await showError(error.message || "Error al cargar el detalle");
    }
  }

  async function abrirEditar(venta) {
    try {
      const ventaDetalle = await getVentaAPI(venta.id_venta);

      if (!ventaDetalle) {
        await showWarning("No se pudo obtener el detalle de la venta");
        return;
      }

      modo = "edit";
      idVentaEditando = Number(ventaDetalle.id_venta);

      const ventaNormalizada = normalizarVenta(ventaDetalle);
      const detalles = Array.isArray(ventaDetalle.detalle)
        ? ventaDetalle.detalle.map(normalizarDetalleVenta)
        : [];

      inpFolio.value = ventaNormalizada.folio || "";

      let codigoEstado = ventaNormalizada.id_estado || "";
      let codigoMunicipio = ventaNormalizada.id_municipio || "";

      await cargarEstados(codigoEstado || "");

      if (!codigoEstado && ventaNormalizada.estado) {
        codigoEstado = obtenerCodigoEstadoPorNombre(ventaNormalizada.estado);
        if (codigoEstado) {
          selectEstado.value = codigoEstado;
        }
      }

      if (codigoEstado) {
        await cargarMunicipios(codigoEstado);

        if (!codigoMunicipio && ventaNormalizada.municipio) {
          codigoMunicipio = obtenerCodigoMunicipioPorNombre(ventaNormalizada.municipio);
        }

        if (codigoMunicipio) {
          selectMunicipio.value = codigoMunicipio;
        }
      } else {
        await cargarMunicipios("");
      }

      detalleVentaTemporal = detalles.map((d) => {
        const almacen = almacenesCache.find(
          (a) => Number(a.id_almacen) === Number(d.id_almacen)
        );
        return {
          id_producto: Number(d.id_producto),
          nombre_producto: d.nombre_producto,
          id_almacen: Number(d.id_almacen) || null,
          nombre_almacen: almacen
            ? (almacen.nombre || almacen.nombre_almacen || `Almacén ${almacen.id_almacen}`)
            : (d.nombre_almacen || null),
          cantidad_vendida: Number(d.cantidad_vendida),
          precio_venta: Number(d.precio_venta)
        };
      });

      renderDetalleTemporal();

      tituloModal.textContent = `Editar Venta ${ventaNormalizada.folio}`;
      btnGuardar.textContent = "Guardar Cambios";

      $("#modalNuevaVenta").modal("show");
    } catch (error) {
      await showError(error.message || "Error al cargar la venta");
    }
  }

  if (selectEstado) {
    selectEstado.addEventListener("change", async () => {
      const idEstado = selectEstado.value;
      await cargarMunicipios(idEstado || "");
    });
  }

  let timeoutBusqueda = null;

  function crearDropdownResultados() {
    let dropdown = document.getElementById("dropdownProductosVenta");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "dropdownProductosVenta";
      dropdown.className = "dropdown-menu w-100 show";
      dropdown.style.position = "absolute";
      dropdown.style.zIndex = "1000";
      dropdown.style.maxHeight = "300px";
      dropdown.style.overflowY = "auto";
      dropdown.style.display = "block";
      dropdown.style.width = "100%";
      dropdown.style.marginTop = "0px";
      
      // Ensure parent has position relative
      const parent = selectProductoVenta.parentNode;
      if (getComputedStyle(parent).position === "static") {
        parent.style.position = "relative";
      }
      parent.appendChild(dropdown);
    }
    return dropdown;
  }

  if (selectProductoVenta) {
    selectProductoVenta.addEventListener("input", async () => {
      const valor = selectProductoVenta.value.trim();

      clearTimeout(timeoutBusqueda);

      if (!valor || valor.length < 2) {
        inpPrecioVenta.value = "";
        const dropdown = document.getElementById("dropdownProductosVenta");
        if (dropdown) dropdown.style.display = "none";
        return;
      }

      timeoutBusqueda = setTimeout(async () => {
        try {
          // Use cached products or fetch if not available
          let productos = productosCache.length > 0 ? productosCache : [];
          
          if (productos.length === 0) {
            const res = await apiFetch("/productos/");
            productos = Array.isArray(res.data) ? res.data : [];
          }

          // Filter by search text
          const valorLower = valor.toLowerCase();
          productos = productos.filter(p => {
            const nombre = (p.descripcion || p.nombre_producto || "").toLowerCase();
            const folio = (p.folio || "").toLowerCase();
            return nombre.includes(valorLower) || folio.includes(valorLower);
          });

          const dropdown = crearDropdownResultados();
          dropdown.innerHTML = "";

          if (productos.length === 0) {
            dropdown.innerHTML = '<div class="dropdown-item text-muted">No se encontraron productos</div>';
            dropdown.style.display = "block";
            return;
          }

          productos.slice(0, 10).forEach(p => {
            const item = document.createElement("a");
            item.className = "dropdown-item";
            item.href = "#";
            item.style.cursor = "pointer";
            const nombre = p.descripcion || p.nombre_producto || `Producto ${p.id_producto}`;
            item.innerHTML = `<strong>${p.folio || ""}</strong> - ${nombre}`;
            item.setAttribute("data-id", p.id_producto);
            item.setAttribute("data-folio", p.folio || "");
            item.setAttribute("data-nombre", nombre);
            item.setAttribute("data-precio", p.precio || 0);

            item.addEventListener("click", async (e) => {
              e.preventDefault();
              e.stopPropagation();
              selectProductoVenta.value = `${p.folio || ""} - ${nombre}`;
              inpPrecioVenta.value = money(p.precio || 0);
              dropdown.style.display = "none";
              
              // Load warehouses that have stock for this product
              selectAlmacenVenta.innerHTML = `<option value="">Cargando almacenes...</option>`;
              selectAlmacenVenta.disabled = true;
              
              try {
                const resStock = await apiFetch(`/almacenes/por-producto/${p.id_producto}`);
                const almacenesStock = resStock.data || [];
                
                selectAlmacenVenta.innerHTML = `<option value="">Elegir almacén...</option>`;
                
                if (almacenesStock.length === 0) {
                  selectAlmacenVenta.innerHTML += `<option value="" disabled>Sin stock en ningún almacén</option>`;
                } else {
                  almacenesStock.forEach((a) => {
                    const option = document.createElement("option");
                    option.value = a.id_almacen;
                    const stock = a.stock !== undefined ? a.stock : (a.cantidad || 0);
                    option.textContent = `${a.nombre || a.nombre_almacen || 'Almacén ' + a.id_almacen} (Stock: ${stock})`;
                    selectAlmacenVenta.appendChild(option);
                  });
                }
              } catch (error) {
                console.error("Error al obtener stock por almacén:", error);
                selectAlmacenVenta.innerHTML = `<option value="">Error al cargar almacenes</option>`;
              } finally {
                selectAlmacenVenta.disabled = false;
              }
            });

            dropdown.appendChild(item);
          });

          dropdown.style.display = "block";
          console.log("Dropdown shown with", productos.length, "items");
        } catch (error) {
          console.error("Error al buscar productos:", error);
        }
      }, 300);
    });

    document.addEventListener("click", (e) => {
      const dropdown = document.getElementById("dropdownProductosVenta");
      if (dropdown && !selectProductoVenta.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.style.display = "none";
      }
    });
  }

  function obtenerIdProductoSeleccionado() {
    const valor = selectProductoVenta?.value;
    if (!valor) return null;

    const dropdown = document.getElementById("dropdownProductosVenta");
    if (!dropdown) return null;

    const items = dropdown.querySelectorAll(".dropdown-item");
    for (const item of items) {
      const nombre = item.getAttribute("data-nombre");
      const folio = item.getAttribute("data-folio");
      const textoCompleto = `${folio} - ${nombre}`;
      if (valor === textoCompleto) {
        return Number(item.getAttribute("data-id"));
      }
    }
    return null;
  }

  if (btnAgregarDetalle) {
    btnAgregarDetalle.addEventListener("click", async (e) => {
      e.preventDefault();

      const idProducto = obtenerIdProductoSeleccionado();
      const idAlmacen = Number(selectAlmacenVenta.value);
      const cantidad = Number(inpCantidadVenta.value);
      const precio = Number(inpPrecioVenta.value);

      if (!idProducto || idProducto === 0) {
        await showWarning("Selecciona un producto");
        return;
      }

      if (!idAlmacen || idAlmacen === 0) {
        await showWarning("Selecciona un almacén");
        return;
      }

      if (!cantidad || cantidad <= 0) {
        await showWarning("Ingresa una cantidad válida mayor a 0");
        return;
      }

      const nombreProducto = (() => {
        const valor = selectProductoVenta.value;
        const dropdown = document.getElementById("dropdownProductosVenta");
        const items = dropdown?.querySelectorAll(".dropdown-item") || [];
        for (const item of items) {
          const nombre = item.getAttribute("data-nombre");
          const folio = item.getAttribute("data-folio");
          const textoCompleto = `${folio} - ${nombre}`;
          if (valor === textoCompleto) {
            return nombre || "";
          }
        }
        return "";
      })();

      const nombreAlmacen =
        selectAlmacenVenta.options[selectAlmacenVenta.selectedIndex]?.text || "";

      const idxExistente = detalleVentaTemporal.findIndex(
        (item) => Number(item.id_producto) === Number(idProducto) && Number(item.id_almacen) === Number(idAlmacen)
      );

      if (idxExistente !== -1) {
        detalleVentaTemporal[idxExistente].cantidad_vendida =
          Number(detalleVentaTemporal[idxExistente].cantidad_vendida) + (Number.isFinite(cantidad) ? cantidad : 0);
        detalleVentaTemporal[idxExistente].precio_venta =
          Number.isFinite(precio) ? precio : 0;
      } else {
        detalleVentaTemporal.push({
          id_producto: Number.isFinite(idProducto) ? idProducto : 0,
          nombre_producto: nombreProducto,
          id_almacen: Number.isFinite(idAlmacen) ? idAlmacen : 0,
          nombre_almacen: nombreAlmacen,
          cantidad_vendida: Number.isFinite(cantidad) ? cantidad : 0,
          precio_venta: Number.isFinite(precio) ? precio : 0
        });
      }

      renderDetalleTemporal();

      selectProductoVenta.value = "";
      selectAlmacenVenta.value = "";
      inpCantidadVenta.value = "";
      inpPrecioVenta.value = "";
    });
  }

  if (tbodyDetalleVenta) {
    tbodyDetalleVenta.addEventListener("click", (e) => {
      const btnQuitar = e.target.closest(".btn-quitar-detalle");
      if (!btnQuitar) return;

      const tr = e.target.closest("tr");
      if (!tr) return;

      const index = Number(tr.getAttribute("data-index"));
      detalleVentaTemporal.splice(index, 1);
      renderDetalleTemporal();
    });

    tbodyDetalleVenta.addEventListener("change", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      if (e.target.classList.contains("detalle-almacen")) {
        const index = Number(tr.getAttribute("data-index"));
        const item = detalleVentaTemporal[index];
        if (!item) return;

        const select = e.target;
        item.id_almacen = Number(select.value) || null;

        const almacen = almacenesCache.find(
          (a) => Number(a.id_almacen) === item.id_almacen
        );
        item.nombre_almacen = almacen
          ? (almacen.nombre || almacen.nombre_almacen || `Almacén ${almacen.id_almacen}`)
          : null;

        actualizarDetalleDesdeFila(tr);
      }
    });

    tbodyDetalleVenta.addEventListener("input", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      if (
        e.target.classList.contains("detalle-cantidad") ||
        e.target.classList.contains("detalle-precio")
      ) {
        actualizarDetalleDesdeFila(tr);
      }
    });
  }

  $(modalRegistro).on("shown.bs.modal", async function () {
    try {
      await refrescarCatalogos();
      cargarProductos();
      cargarAlmacenes();

      if (modo !== "edit") {
        await cargarEstados();
        resetFormulario();
        tituloModal.textContent = "Registrar Venta";
        btnGuardar.textContent = "Guardar Venta";
      }
    } catch (error) {
      await showError(error.message || "Error al cargar datos del formulario");
    }
  });

  $(modalRegistro).on("hidden.bs.modal", function () {
    resetFormulario();
    tituloModal.textContent = "Registrar Venta";
    btnGuardar.textContent = "Guardar Venta";
  });

  if (btnGuardar) {
    btnGuardar.addEventListener("click", async (e) => {
            e.preventDefault();

      const folioTexto = norm(inpFolio.value);

      if (!folioTexto) {
        await showWarning("El folio es obligatorio");
        return;
      }

      if (detalleVentaTemporal.length === 0) {
        await showWarning("Agrega al menos un producto a la venta");
        return;
      }

      for (const item of detalleVentaTemporal) {
        if (!item.id_producto || item.id_producto === 0) {
          await showWarning("Producto inválido en el detalle");
          return;
        }
        if (!item.cantidad_vendida || item.cantidad_vendida <= 0) {
          await showWarning(`Cantidad inválida para "${item.nombre_producto}"`);
          return;
        }
      }

      const textoOriginalBoton = btnGuardar.textContent;
      btnGuardar.disabled = true;
      btnGuardar.textContent = "Guardando...";

      try {
        await refrescarCatalogos();
        await refrescarVentas();

        const payload = buildVentaPayload();
        let res;

        if (modo === "create") {
          res = await crearVentaAPI(payload);
          await showSuccess(res?.message || "Venta registrada correctamente");
        } else {
          res = await actualizarVentaAPI(idVentaEditando, payload);
          await showSuccess(res?.message || "Venta actualizada correctamente");
        }

        await Promise.all([refrescarCatalogos(), refrescarVentas()]);
        renderTabla(inputBuscar ? inputBuscar.value : "");
        resetFormulario();
        $(modalRegistro).modal("hide");
      } catch (error) {
        console.error(error);
        await showError(error.message || "Error al guardar la venta");
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

      const idVenta = Number(tr.getAttribute("data-id"));
      const venta = ventasCache.find((v) => Number(v.id_venta) === idVenta);

      if (!venta) return;

      if (e.target.closest(".btn-detalle")) {
        await abrirDetalle(venta);
        return;
      }

      if (e.target.closest(".btn-editar")) {
        await abrirEditar(venta);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        const confirmado = await confirmDelete(`Se eliminará la venta ${venta.folio}.`);
        if (!confirmado) return;

        try {
          const res = await eliminarVentaAPI(idVenta);
          await Promise.all([refrescarCatalogos(), refrescarVentas()]);
          renderTabla(inputBuscar ? inputBuscar.value : "");
          await showSuccess(res?.message || "Venta eliminada correctamente");
        } catch (error) {
          console.error(error);
          await showError(error.message || "Error al eliminar la venta");
        }
      }
    });
  }

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }

  (async function init() {
    try {
      await Promise.all([refrescarCatalogos(), refrescarVentas()]);
      cargarProductos();
      cargarAlmacenes();
      await cargarEstados();
      renderTabla();
      resetFormulario();
    } catch (error) {
      await showError(`Error al cargar datos iniciales: ${error.message}`);
    }
  })();
});