document.addEventListener("DOMContentLoaded", () => {
  const VENTAS_KEY = "ventas_v1";
  const DETALLE_KEY = "detalle_ventas_v1";
  const PRODUCTOS_KEY = "productos_v1";
  const INVENTARIOS_KEY = "inventarios_v1";
  const MOVIMIENTOS_KEY = "movimientos_inventario_v1";

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
  const inpCantidadVenta = document.getElementById("cantidadVenta");
  const inpPrecioVenta = document.getElementById("precioVenta");
  const totalVenta = document.getElementById("totalVenta");

  const tituloModal = document.getElementById("tituloModal");
  const modalRegistro = "#modalNuevaVenta";

  const IVA = 0.16;

  let modo = "create";
  let idVentaEditando = null;
  let detalleVentaTemporal = [];

  const ESTADOS = [
    { id: "VER", nombre: "Veracruz" },
    { id: "PUE", nombre: "Puebla" },
    { id: "CDMX", nombre: "Ciudad de México" },
    { id: "OAX", nombre: "Oaxaca" }
  ];

  const MUNICIPIOS = {
    VER: [
      { id: "VER_VER", nombre: "Veracruz" },
      { id: "VER_XAL", nombre: "Xalapa" },
    ],
    PUE: [
      { id: "PUE_PUE", nombre: "Puebla" },
      { id: "PUE_TEH", nombre: "Tehuacán" },
    ],
    CDMX: [
      { id: "CDMX_CUA", nombre: "Cuauhtémoc" },
      { id: "CDMX_COY", nombre: "Coyoacán" },
    ],
    OAX: [
      { id: "OAX_OAX", nombre: "Oaxaca de Juárez" },
      { id: "OAX_JUC", nombre: "Juchitán" }
    ]
  };

  const norm = (v) => (v ?? "").toString().trim();

  const getVentas = () => {
    try {
      return JSON.parse(localStorage.getItem(VENTAS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const setVentas = (arr) => {
    localStorage.setItem(VENTAS_KEY, JSON.stringify(arr));
  };

  const getDetalleVentas = () => {
    try {
      return JSON.parse(localStorage.getItem(DETALLE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const setDetalleVentas = (arr) => {
    localStorage.setItem(DETALLE_KEY, JSON.stringify(arr));
  };

  const getProductos = () => {
    try {
      return JSON.parse(localStorage.getItem(PRODUCTOS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const getInventarios = () => {
    try {
      return JSON.parse(localStorage.getItem(INVENTARIOS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const setInventarios = (arr) => {
    localStorage.setItem(INVENTARIOS_KEY, JSON.stringify(arr));
  };

  const getMovimientos = () => {
    try {
      return JSON.parse(localStorage.getItem(MOVIMIENTOS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const setMovimientos = (arr) => {
    localStorage.setItem(MOVIMIENTOS_KEY, JSON.stringify(arr));
  };

  function generarIdVenta(ventas) {
    const ultimo = ventas.reduce((max, v) => {
      const n = Number(v.id_venta) || 0;
      return n > max ? n : max;
    }, 0);
    return ultimo + 1;
  }

  function generarFolioVenta(ventas) {
    const numero = ventas.length + 1;
    return `VTA-${String(numero).padStart(3, "0")}`;
  }

  function generarIdDetalle(detalles) {
    const ultimo = detalles.reduce((max, d) => {
      const n = Number(d.id_detalle_venta) || 0;
      return n > max ? n : max;
    }, 0);
    return ultimo + 1;
  }

  function generarIdMovimiento(movimientos) {
    const ultimo = movimientos.reduce((max, m) => {
      const n = Number(m.id_mov) || 0;
      return n > max ? n : max;
    }, 0);
    return ultimo + 1;
  }

  function money(valor) {
    return Number(valor || 0).toFixed(2);
  }

  function calcularPrecioConIVA(precio) {
  return Number(precio || 0) * (1 + IVA);
}

  function cargarEstados() {
    if (!selectEstado) return;

    selectEstado.innerHTML = `
      <option value="">Elegir estado...</option>
    `;

    ESTADOS.forEach((estado) => {
      selectEstado.innerHTML += `
        <option value="${estado.id}">${estado.nombre}</option>
      `;
    });
  }

  function cargarMunicipios(idEstado, municipioSeleccionado = "") {
    if (!selectMunicipio) return;

    selectMunicipio.innerHTML = `
      <option value="">Elegir municipio...</option>
    `;

    if (!idEstado || !MUNICIPIOS[idEstado]) return;

    MUNICIPIOS[idEstado].forEach((municipio) => {
      selectMunicipio.innerHTML += `
        <option value="${municipio.id}" ${municipio.id === municipioSeleccionado ? "selected" : ""}>
          ${municipio.nombre}
        </option>
      `;
    });
  }

  function cargarProductos() {
  if (!selectProductoVenta) return;

  const productos = getProductos();

  selectProductoVenta.innerHTML = "";

  const optionDefault = document.createElement("option");
  optionDefault.value = "";
  optionDefault.textContent = "Elegir producto...";
  selectProductoVenta.appendChild(optionDefault);

  productos.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.codigo;
    option.textContent = p.descripcion;
    option.setAttribute("data-precio", Number(p.precio) || 0);
    selectProductoVenta.appendChild(option);
  });
}

  function calcularTotalTemporal() {
    const total = detalleVentaTemporal.reduce((acc, item) => {
      const precioConIVA = calcularPrecioConIVA(item.precio_venta);
      return acc + (Number(item.cantidad_vendida) * precioConIVA);
    }, 0);

    totalVenta.textContent = money(total);
    return total;
  }

  function getOpcionesProductosHTML(idSeleccionado = "") {
  const productos = getProductos();

  return `
    <option value="">Elegir producto...</option>
    ${productos.map((p) => `
      <option 
        value="${p.codigo}" 
        data-precio="${Number(p.precio) || 0}"
        ${String(p.codigo) === String(idSeleccionado) ? "selected" : ""}
      >
        ${p.descripcion}
      </option>
    `).join("")}
  `;
}

  function renderDetalleTemporal() {
    if (!tbodyDetalleVenta) return;

    if (detalleVentaTemporal.length === 0) {
      tbodyDetalleVenta.innerHTML = `
        <tr>
          <td colspan="6" class="text-muted">No hay productos agregados.</td>
        </tr>
      `;
      calcularTotalTemporal();
      return;
    }

    tbodyDetalleVenta.innerHTML = detalleVentaTemporal.map((item, index) => {
      const precioBase = Number(item.precio_venta) || 0;
      const precioConIVA = calcularPrecioConIVA(precioBase);
      const importe = Number(item.cantidad_vendida) * precioConIVA;

      if (modo === "edit") {
      return `
        <tr data-index="${index}">
          <td>
            <select class="form-control form-control-sm detalle-producto">
              ${getOpcionesProductosHTML(item.id_producto)}
            </select>
          </td>
          <td>
            <input 
              type="number" 
              min="1" 
              class="form-control form-control-sm detalle-cantidad" 
              value="${Number(item.cantidad_vendida) || 1}"
            >
          </td>
          <td>
            <input 
              type="number" 
              min="0" 
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
    }
      return `
        <tr data-index="${index}">
          <td>${item.nombre_producto}</td>
          <td>${item.cantidad_vendida}</td>
          <td>$${money(precioBase)}</td>
          <td>$${money(precioConIVA)}</td>
          <td>$${money(importe)}</td>
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

  if (celdaPrecioIVA) {
    celdaPrecioIVA.textContent = `$${money(precioConIVA)}`;
  }

  if (celdaImporte) {
    celdaImporte.textContent = `$${money(importe)}`;
  }

  calcularTotalTemporal();
}

function actualizarDetalleDesdeFila(tr) {
  const index = Number(tr.getAttribute("data-index"));
  const item = detalleVentaTemporal[index];
  if (!item) return;

  const selectProducto = tr.querySelector(".detalle-producto");
  const inputCantidad = tr.querySelector(".detalle-cantidad");
  const inputPrecio = tr.querySelector(".detalle-precio");

  if (selectProducto) {
    const option = selectProducto.options[selectProducto.selectedIndex];
    item.id_producto = norm(selectProducto.value);
    item.nombre_producto = option?.text || "";
  }

  if (inputCantidad) {
    item.cantidad_vendida = Number(inputCantidad.value) || 0;
  }

  if (inputPrecio) {
    item.precio_venta = Number(inputPrecio.value) || 0;
  }

  recalcularImporteFila(tr);
}

  function resetFormulario() {
  detalleVentaTemporal = [];
  modo = "create";
  idVentaEditando = null;

  form.reset();

  totalVenta.textContent = "0.00";
  renderDetalleTemporal();

  const ventas = getVentas();
  inpFolio.value = generarFolioVenta(ventas);

  if (selectEstado) selectEstado.value = "";
  if (selectMunicipio) {
    selectMunicipio.innerHTML = `<option value="">Elegir municipio...</option>`;
  }

  if (selectProductoVenta) {
    cargarProductos();
    selectProductoVenta.value = "";
  }

  if (inpCantidadVenta) inpCantidadVenta.value = "";
  if (inpPrecioVenta) inpPrecioVenta.value = "";
}

  function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();
    const ventas = getVentas();

    const lista = !f
      ? ventas
      : ventas.filter((v) => {
          const texto = `
            ${v.folio}
            ${v.precio_venta_final}
            ${v.nombre_estado}
            ${v.nombre_municipio}
          `.toLowerCase();

          return texto.includes(f);
        });

    tbody.innerHTML = lista.map((v) => `
      <tr data-id="${v.id_venta}">
        <td>${v.folio}</td>
        <td>$${money(v.precio_venta_final)}</td>
        <td>${v.nombre_estado || ""}</td>
        <td>${v.nombre_municipio || ""}</td>
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

  function buscarInventarioDisponible(inventarios, idProducto, cantidadRequerida, idInventarioPreferido = "") {
    const cantidad = Number(cantidadRequerida) || 0;

    if (idInventarioPreferido) {
      const idxPreferido = inventarios.findIndex(
        (inv) =>
          inv.id_inventario === idInventarioPreferido &&
          inv.id_producto === idProducto &&
          Number(inv.stock) >= cantidad
      );

      if (idxPreferido !== -1) return idxPreferido;
    }

    return inventarios.findIndex(
      (inv) =>
        inv.id_producto === idProducto &&
        Number(inv.stock) >= cantidad
    );
  }

  function validarStockDetalle(detalle) {
    const inventarios = getInventarios().map((inv) => ({ ...inv }));

    for (const item of detalle) {
      const idx = buscarInventarioDisponible(
        inventarios,
        item.id_producto,
        item.cantidad_vendida,
        item.id_inventario_origen || ""
      );

      if (idx === -1) {
        throw new Error(`No hay stock suficiente para ${item.nombre_producto}.`);
      }

      inventarios[idx].stock =
        Number(inventarios[idx].stock) - Number(item.cantidad_vendida);
    }

    return true;
  }

  function aplicarDetalleEnInventarioYMovimientos(idVenta, folio, detalle) {
    const inventarios = getInventarios();
    const movimientos = getMovimientos();

    let siguienteIdMov = generarIdMovimiento(movimientos);

    detalle.forEach((item) => {
      const idxInventario = buscarInventarioDisponible(
        inventarios,
        item.id_producto,
        item.cantidad_vendida,
        item.id_inventario_origen || ""
      );

      if (idxInventario === -1) {
        throw new Error(`No hay stock suficiente para ${item.nombre_producto}.`);
      }

      const inv = inventarios[idxInventario];
      const cantidad = Number(item.cantidad_vendida);
      const stockActual = Number(inv.stock) || 0;

      if (cantidad > stockActual) {
        throw new Error(`La venta excede el stock disponible de ${item.nombre_producto}.`);
      }

      inv.stock = stockActual - cantidad;

      item.id_inventario_origen = inv.id_inventario;
      item.id_almacen = inv.id_almacen;
      item.nombre_almacen = inv.nombre_almacen;

      movimientos.push({
        id_mov: siguienteIdMov++,
        tipo: false,
        cantidad,
        id_venta: idVenta,
        id_producto: item.id_producto,
        id_almacen: inv.id_almacen,
        id_inventario: inv.id_inventario,
        nombre_producto: item.nombre_producto,
        nombre_almacen: inv.nombre_almacen,
        fecha: new Date().toISOString().slice(0, 16),
        folio_venta: folio
      });
    });

    setInventarios(inventarios);
    setMovimientos(movimientos);
  }

  function revertirVentaEnInventarioYMovimientos(idVenta) {
    const inventarios = getInventarios();
    const movimientos = getMovimientos();

    const movimientosVenta = movimientos.filter(
      (m) => Number(m.id_venta) === Number(idVenta)
    );

    movimientosVenta.forEach((mov) => {
      const idxInventario = inventarios.findIndex(
        (inv) =>
          inv.id_inventario === mov.id_inventario ||
          (inv.id_producto === mov.id_producto && inv.id_almacen === mov.id_almacen)
      );

      if (idxInventario !== -1) {
        inventarios[idxInventario].stock =
          Number(inventarios[idxInventario].stock || 0) + Number(mov.cantidad || 0);
      }
    });

    const nuevosMovimientos = movimientos.filter(
      (m) => Number(m.id_venta) !== Number(idVenta)
    );

    setInventarios(inventarios);
    setMovimientos(nuevosMovimientos);
  }

  function abrirDetalle(venta) {
    const detalleFolioVenta = document.getElementById("detalleFolioVenta");
    const detalleTotalVenta = document.getElementById("detalleTotalVenta");
    const detalleEstadoVenta = document.getElementById("detalleEstadoVenta");
    const detalleMunicipioVenta = document.getElementById("detalleMunicipioVenta");
    const detalleItemsVenta = document.getElementById("detalleItemsVenta");

    const detalles = getDetalleVentas().filter(
      (d) => Number(d.id_venta) === Number(venta.id_venta)
    );

    detalleFolioVenta.textContent = venta.folio || "";
    detalleTotalVenta.textContent = money(venta.precio_venta_final);
    detalleEstadoVenta.textContent = venta.nombre_estado || "";
    detalleMunicipioVenta.textContent = venta.nombre_municipio || "";

    if (detalles.length === 0) {
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
                const precioConIVA = Number(d.precio_venta_con_iva) || calcularPrecioConIVA(precioBase);
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
  }

  function abrirEditar(venta) {
    cargarProductos();
    const detalles = getDetalleVentas().filter(
      (d) => Number(d.id_venta) === Number(venta.id_venta)
    );

    modo = "edit";
    idVentaEditando = venta.id_venta;

    inpFolio.value = venta.folio || "";
    selectEstado.value = venta.id_estado || "";
    cargarMunicipios(venta.id_estado || "", venta.id_municipio || "");
    selectMunicipio.value = venta.id_municipio || "";

    detalleVentaTemporal = detalles.map((d) => ({
      id_producto: d.id_producto,
      nombre_producto: d.nombre_producto,
      cantidad_vendida: Number(d.cantidad_vendida),
      precio_venta: Number(d.precio_venta),
      id_inventario_origen: d.id_inventario_origen || "",
      id_almacen: d.id_almacen || "",
      nombre_almacen: d.nombre_almacen || ""
    }));

selectEstado.value = venta.id_estado || "";

cargarMunicipios(venta.id_estado || "", venta.id_municipio || "");

selectMunicipio.value = venta.id_municipio || "";

    renderDetalleTemporal();

    tituloModal.textContent = `Editar Venta ${venta.folio}`;
    btnGuardar.textContent = "Guardar Cambios";

    $("#modalNuevaVenta").modal("show");
  }

  cargarProductos();
  cargarEstados();
  renderTabla();
  resetFormulario();

  if (selectEstado) {
    selectEstado.addEventListener("change", () => {
      if (!selectEstado.value) {
        selectMunicipio.innerHTML = `<option value="">Elegir municipio...</option>`;
        return;
      }
      
      cargarMunicipios(selectEstado.value);
    });
  }

  if (selectProductoVenta) {
    selectProductoVenta.addEventListener("change", () => {
      const option = selectProductoVenta.options[selectProductoVenta.selectedIndex];
      const precio = Number(option?.getAttribute("data-precio") || 0);

      if (!norm(inpPrecioVenta.value)) {
        inpPrecioVenta.value = precio ? money(precio) : "";
      }
    });
  }

  if (btnAgregarDetalle) {
    btnAgregarDetalle.addEventListener("click", () => {
      const idProducto = norm(selectProductoVenta.value);
      const cantidad = Number(inpCantidadVenta.value);
      const precio = Number(inpPrecioVenta.value);

      const nombreProducto =
        selectProductoVenta.options[selectProductoVenta.selectedIndex]?.text || "";

      if (!idProducto) {
        alert("Selecciona un producto");
        return;
      }

      if (isNaN(cantidad) || cantidad <= 0) {
        alert("Ingresa una cantidad válida");
        return;
      }

      if (isNaN(precio) || precio < 0) {
        alert("Ingresa un precio válido");
        return;
      }

      const idxExistente = detalleVentaTemporal.findIndex(
        (item) => String(item.id_producto) === String(idProducto)
      );

      if (idxExistente !== -1) {
        detalleVentaTemporal[idxExistente].cantidad_vendida =
          Number(detalleVentaTemporal[idxExistente].cantidad_vendida) + cantidad;
        detalleVentaTemporal[idxExistente].precio_venta = precio;
      } else {
        detalleVentaTemporal.push({
          id_producto: idProducto,
          nombre_producto: nombreProducto,
          cantidad_vendida: cantidad,
          precio_venta: precio,
          id_inventario_origen: ""
        });
      }

      renderDetalleTemporal();

      selectProductoVenta.value = "";
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

    if (e.target.classList.contains("detalle-producto")) {
      const index = Number(tr.getAttribute("data-index"));
      const item = detalleVentaTemporal[index];
      if (!item) return;

      const select = e.target;
      const option = select.options[select.selectedIndex];
      const nuevoIdProducto = norm(select.value);

      if (!nuevoIdProducto) return;

      const existeRepetido = detalleVentaTemporal.some((prod, i) =>
        i !== index && String(prod.id_producto) === String(nuevoIdProducto)
      );

      if (existeRepetido) {
        alert("Ese producto ya está agregado en la venta.");
        select.value = item.id_producto;
        return;
      }

      item.id_producto = nuevoIdProducto;
      item.nombre_producto = option?.text || "";
      item.precio_venta = Number(option?.getAttribute("data-precio") || 0);

      const inputPrecio = tr.querySelector(".detalle-precio");
      if (inputPrecio) {
        inputPrecio.value = item.precio_venta;
      }

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

  $(modalRegistro).on("shown.bs.modal", function () {
    cargarProductos();
    cargarEstados();

    if (modo !== "edit") {
      resetFormulario();
      tituloModal.textContent = "Registrar Venta";
      btnGuardar.textContent = "Guardar Venta";
    }
  });

  $(modalRegistro).on("hidden.bs.modal", function () {
    resetFormulario();
    tituloModal.textContent = "Registrar Venta";
    btnGuardar.textContent = "Guardar Venta";
  });

  if (btnGuardar) {
    btnGuardar.addEventListener("click", (e) => {
      e.preventDefault();

      const folio = norm(inpFolio.value);
      const estado = norm(selectEstado.value) || null;
      const municipio = norm(selectMunicipio.value)|| null;

      const nombreEstado = estado ? 
        (selectEstado.options[selectEstado.selectedIndex]?.text || null) :null;

      const nombreMunicipio = municipio ? 
        (selectMunicipio.options[selectMunicipio.selectedIndex]?.text || null):null;

      if (!folio) {
        alert("Completa el folio");
        return;
      }

      if (detalleVentaTemporal.length === 0) {
        alert("Agrega al menos un producto a la venta");
        return;
      }

      const ventas = getVentas();
      const detalles = getDetalleVentas();

      try {
        if (modo === "create") {
          if (ventas.some((v) => norm(v.folio).toUpperCase() === folio.toUpperCase())) {
            alert("Ese folio ya existe");
            return;
          }

          validarStockDetalle(detalleVentaTemporal);

          const idVenta = generarIdVenta(ventas);
          const total = calcularTotalTemporal();

          ventas.push({
            id_venta: idVenta,
            folio,
            precio_venta_final: total,
            id_estado: estado,
            nombre_estado: nombreEstado,
            id_municipio: municipio,
            nombre_municipio: nombreMunicipio
          });

          let siguienteIdDetalle = generarIdDetalle(detalles);

          detalleVentaTemporal.forEach((item) => {
            detalles.push({
              id_detalle_venta: siguienteIdDetalle++,
              cantidad_vendida: Number(item.cantidad_vendida),
              precio_venta: Number(item.precio_venta),
              precio_venta_con_iva: calcularPrecioConIVA(item.precio_venta),
              id_venta: idVenta,
              id_producto: item.id_producto,
              nombre_producto: item.nombre_producto,
              id_inventario_origen: item.id_inventario_origen || "",
              id_almacen: item.id_almacen || "",
              nombre_almacen: item.nombre_almacen || ""
            });
          });

          setVentas(ventas);
          setDetalleVentas(detalles);

          aplicarDetalleEnInventarioYMovimientos(idVenta, folio, detalleVentaTemporal);

          renderTabla(inputBuscar ? inputBuscar.value : "");
          resetFormulario();
          $(modalRegistro).modal("hide");
          return;
        }

        const idxVenta = ventas.findIndex(
          (v) => Number(v.id_venta) === Number(idVentaEditando)
        );

        if (idxVenta === -1) {
          alert("No se encontró la venta a editar");
          return;
        }

        if (
          ventas.some(
            (v) =>
              Number(v.id_venta) !== Number(idVentaEditando) &&
              norm(v.folio).toUpperCase() === folio.toUpperCase()
          )
        ) {
          alert("Ese folio ya existe");
          return;
        }

        revertirVentaEnInventarioYMovimientos(idVentaEditando);

        const detallesSinVenta = detalles.filter(
          (d) => Number(d.id_venta) !== Number(idVentaEditando)
        );

        validarStockDetalle(detalleVentaTemporal);

        const total = calcularTotalTemporal();

        ventas[idxVenta] = {
          ...ventas[idxVenta],
          folio,
          precio_venta_final: total,
          id_estado: estado,
          nombre_estado: nombreEstado,
          id_municipio: municipio,
          nombre_municipio: nombreMunicipio
        };

        let siguienteIdDetalle = generarIdDetalle(detallesSinVenta);

        detalleVentaTemporal.forEach((item) => {
          detallesSinVenta.push({
            id_detalle_venta: siguienteIdDetalle++,
            cantidad_vendida: Number(item.cantidad_vendida),
            precio_venta: Number(item.precio_venta),
            precio_venta_con_iva: calcularPrecioConIVA(item.precio_venta),
            id_venta: idVentaEditando,
            id_producto: item.id_producto,
            nombre_producto: item.nombre_producto,
            id_inventario_origen: item.id_inventario_origen || "",
            id_almacen: item.id_almacen || "",
            nombre_almacen: item.nombre_almacen || ""
          });
        });

        setVentas(ventas);
        setDetalleVentas(detallesSinVenta);

        aplicarDetalleEnInventarioYMovimientos(idVentaEditando, folio, detalleVentaTemporal);

        renderTabla(inputBuscar ? inputBuscar.value : "");
        resetFormulario();
        $(modalRegistro).modal("hide");
      } catch (error) {
        alert(error.message);
      }
    });
  }

  if (tbody) {
    tbody.addEventListener("click", (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      const idVenta = Number(tr.getAttribute("data-id"));
      const ventas = getVentas();
      const venta = ventas.find((v) => Number(v.id_venta) === idVenta);

      if (!venta) return;

      if (e.target.closest(".btn-detalle")) {
        abrirDetalle(venta);
        return;
      }

      if (e.target.closest(".btn-editar")) {
        abrirEditar(venta);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        if (!confirm(`¿Eliminar la venta ${venta.folio}?`)) return;

        try {
          revertirVentaEnInventarioYMovimientos(idVenta);

          const nuevasVentas = ventas.filter((v) => Number(v.id_venta) !== idVenta);
          const nuevosDetalles = getDetalleVentas().filter(
            (d) => Number(d.id_venta) !== idVenta
          );

          setVentas(nuevasVentas);
          setDetalleVentas(nuevosDetalles);

          renderTabla(inputBuscar ? inputBuscar.value : "");
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
});