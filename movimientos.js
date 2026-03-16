document.addEventListener("DOMContentLoaded", () => {
  // ================== STORAGE ==================
  const STORAGE_MOV = "movimientos_v1";
  const STORAGE_PROD = "productos_v1";
  const STORAGE_ALM = "almacenes_v1";
  const STORAGE_INV = "inventarios_v1";

  const selectAlmacen = document.getElementById("selectAlmacenMov");
  const selectProducto = document.getElementById("selectProductoMov");
  const selectTipo = document.getElementById("tipoMovimiento");
  const inpCantidad = document.getElementById("cantidadMov");
  const btnGuardar = document.getElementById("btnGuardarMovimiento");

  // FIX: Usar jQuery para el modal (Sintaxis de Bootstrap 4 / SB Admin 2)
  const $modalNuevo = $('#modalNuevoMovimiento');

  const tbody = document.querySelector("#dataTableMovimientos tbody");
  const inputBuscar = document.getElementById("buscarMovimientos");

  const norm = (v) => (v ?? "").toString().trim();

  // ================== HELPERS ==================
  const getMovimientos = () => JSON.parse(localStorage.getItem(STORAGE_MOV) || "[]");
  const setMovimientos = (arr) => localStorage.setItem(STORAGE_MOV, JSON.stringify(arr));
  const getProductos = () => JSON.parse(localStorage.getItem(STORAGE_PROD) || "[]");
  const getAlmacenes = () => JSON.parse(localStorage.getItem(STORAGE_ALM) || "[]");
  const getInventarios = () => JSON.parse(localStorage.getItem(STORAGE_INV) || "[]");
  const setInventarios = (arr) => localStorage.setItem(STORAGE_INV, JSON.stringify(arr));

  // ================== SEED AUTOMÁTICO ==================
  function seedDataIfEmpty() {
    if (getAlmacenes().length === 0) {
      localStorage.setItem(STORAGE_ALM, JSON.stringify([
        // Cambié 'folio' por 'codigo' para que cuadre con tu diagrama de BD
        { id_almacen: 1, nombre: "Almacén Central", codigo: "AL-001" },
        { id_almacen: 2, nombre: "Almacén Ganado", codigo: "AL-002" }
      ]));
    }
    if (getProductos().length === 0) {
      localStorage.setItem(STORAGE_PROD, JSON.stringify([
        { id_producto: 1, descripcion: "Panel Solar 100W" },
        { id_producto: 2, descripcion: "Bomba de Agua 1HP" },
        { id_producto: 3, descripcion: "Alimento Ganado 25kg" }
      ]));
    }
  }

  // ================== ACTUALIZAR STOCK ==================
  function actualizarStock(idAlmacen, idProducto, cantidad, esEntrada) {
    let inv = getInventarios();
    let item = inv.find(i => i.id_almacen === idAlmacen && i.id_producto === idProducto);
    
    // Si no existe el registro en Inventario, se crea respetando el diagrama
    if (!item) {
      item = { 
        id_inventario: Date.now(), // PK generada
        id_almacen: idAlmacen, 
        id_producto: idProducto, 
        stock: 0, 
        min_stock: 5 
      };
      inv.push(item);
    }
    
    // Lógica de suma y resta
    if (esEntrada) {
      item.stock += cantidad;
    } else {
      if (item.stock < cantidad) { 
        alert("❌ Stock insuficiente en el almacén seleccionado."); 
        return false; 
      }
      item.stock -= cantidad;
    }
    
    setInventarios(inv);
    return true;
  }

  // ================== LLENAR SELECTS ==================
  function llenarSelects() {
    const alms = getAlmacenes();
    const prods = getProductos();

    selectAlmacen.innerHTML = `<option value="">Selecciona almacén...</option>` +
      alms.map(a => `<option value="${a.id_almacen}">${a.nombre} (${a.codigo || a.folio || ''})</option>`).join("");

    selectProducto.innerHTML = `<option value="">Selecciona producto...</option>` +
      prods.map(p => `<option value="${p.id_producto}">${p.descripcion}</option>`).join("");
  }

  // ================== GUARDAR MOVIMIENTO ==================
  btnGuardar.addEventListener("click", () => {
    const idAlmacen = parseInt(selectAlmacen.value);
    const idProducto = parseInt(selectProducto.value);
    const tipoBoolean = selectTipo.value === "entrada";   // true = Entrada
    const cantidad = parseInt(inpCantidad.value);

    if (!idAlmacen || !idProducto || !cantidad || cantidad <= 0) {
      alert("Por favor, completa todos los campos correctamente.");
      return;
    }

    if (!actualizarStock(idAlmacen, idProducto, cantidad, tipoBoolean)) return;

    const nuevo = {
      id_movimiento: Date.now(),
      tipo: tipoBoolean,
      cantidad,
      id_venta: null,
      id_producto: idProducto,
      id_almacen: idAlmacen,
      fecha: new Date().toLocaleDateString("es-MX")
    };

    const movs = getMovimientos();
    movs.push(nuevo);
    setMovimientos(movs);

    renderTablaMovimientos();
    
    // FIX: Cerrar modal y limpiar formulario (Bootstrap 4)
    $modalNuevo.modal('hide');
    document.getElementById("formularioMovimiento").reset();
    
    alert("✅ Movimiento guardado y stock actualizado");
  });

  // ================== RENDER TABLA ==================
  function renderTablaMovimientos(filtro = "") {
    const f = norm(filtro).toLowerCase();
    let movs = getMovimientos();
    if (f) movs = movs.filter(m => m.fecha.toLowerCase().includes(f));

    const prods = getProductos();
    const alms = getAlmacenes();

    tbody.innerHTML = movs.map(m => {
      const prod = prods.find(p => p.id_producto === m.id_producto) || {};
      const alm = alms.find(a => a.id_almacen === m.id_almacen) || {};
      
      // FIX: Clases de badges actualizadas a Bootstrap 4 (badge-success/danger)
      return `
        <tr data-id="${m.id_movimiento}">
          <td>${m.fecha}</td>
          <td><span class="badge ${m.tipo ? "badge-success" : "badge-danger"}">${m.tipo ? "ENTRADA" : "SALIDA"}</span></td>
          <td>${prod.descripcion || 'Desconocido'}</td>
          <td>${alm.nombre || 'Desconocido'}</td>
          <td>${m.cantidad}</td>
          <td>
            <button class="btn btn-info btn-circle btn-sm btn-detalle"><i class="fas fa-eye"></i></button>
            <button class="btn btn-danger btn-circle btn-sm btn-eliminar"><i class="fas fa-trash"></i></button>
          </td>
        </tr>`;
    }).join("") || `<tr><td colspan="6" class="text-center text-muted">No hay movimientos aún</td></tr>`;
  }

  // ================== INICIALIZACIÓN ==================
  seedDataIfEmpty();
  renderTablaMovimientos();
  llenarSelects();

  // FIX: Evento jQuery para refrescar selects al abrir el modal
  $modalNuevo.on("show.bs.modal", llenarSelects);

  // Búsqueda
  if (inputBuscar) inputBuscar.addEventListener("input", () => renderTablaMovimientos(inputBuscar.value));
});