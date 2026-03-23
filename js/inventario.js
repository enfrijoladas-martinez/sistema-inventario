document.addEventListener("DOMContentLoaded", () => {

  const STORAGE_KEY = "inventarios_v1";
  const PRODUCTOS_KEY = "productos_v1";
  const ALMACENES_KEY = "almacenes_v1";

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

  let modo = "create";
  let idEditando = null;

  const norm = (v) => (v ?? "").toString().trim();

  const getInventarios = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const setInventarios = (arr) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  };

  const getProductos = () => {
    try {
      return JSON.parse(localStorage.getItem(PRODUCTOS_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const getAlmacenes = () => {
    try {
      return JSON.parse(localStorage.getItem(ALMACENES_KEY) || "[]");
    } catch {
      return [];
    }
  };

  function generarId(inventarios) {
    const numero = inventarios.length + 1;
    return `INV-${String(numero).padStart(3, "0")}`;
  }

  function cargarProductos() {
    const productos = getProductos();

    selectProducto.innerHTML = `
      <option value="">Elegir producto...</option>
    `;

    productos.forEach((p) => {
      selectProducto.innerHTML += `
        <option value="${p.codigo}">
          ${p.descripcion}
        </option>
      `;
    });
  }

  function cargarAlmacenes() {
    const almacenes = getAlmacenes();

    selectAlmacen.innerHTML = `
      <option value="">Elegir almacén...</option>
    `;

    almacenes.forEach((a) => {
      selectAlmacen.innerHTML += `
        <option value="${a.folio}">
          ${a.nombre}
        </option>
      `;
    });
  }

  function obtenerEstado(stock, min) {
    return Number(stock) <= Number(min) ? "Stock bajo" : "Stock OK";
  }

  function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();
    const inventarios = getInventarios();

    const lista = !f
      ? inventarios
      : inventarios.filter((i) => {
          const texto = `
            ${i.nombre_producto}
            ${i.nombre_almacen}
            ${i.stock}
            ${i.min_stock}
          `.toLowerCase();

          return texto.includes(f);
        });

    tbody.innerHTML = lista.map((i) => `
      <tr data-id="${i.id_inventario}">
        <td>${i.nombre_producto}</td>
        <td>${i.nombre_almacen}</td>
        <td>${i.stock}</td>
        <td>${i.min_stock}</td>
        <td>
          <button type="button" class="btn btn-info btn-circle btn-sm btn-detalle">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn btn-warning btn-circle btn-sm btn-editar">
            <i class="fas fa-pen"></i>
          </button>
          <button type="button" class="btn btn-danger btn-circle btn-sm btn-eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      </tr>
    `).join("");
  }

  function resetFormulario() {
    form.reset();
    modo = "create";
    idEditando = null;
  }

  function abrirEditar(inv) {
    modo = "edit";
    idEditando = inv.id_inventario;

    selectProducto.value = inv.id_producto;
    selectAlmacen.value = inv.id_almacen;
    inpStock.value = inv.stock;
    inpMinStock.value = inv.min_stock;

    tituloModal.textContent = "Editar Inventario";

    $(modalRegistro).modal("show");
  }

  function abrirDetalle(inv) {

    const detalleProducto = document.getElementById("detalleProducto");
    const detalleAlmacen = document.getElementById("detalleAlmacen");
    const detalleStock = document.getElementById("detalleStock");
    const detalleMinStock = document.getElementById("detalleMinStock");
    const detalleAcciones = document.getElementById("detalleAcciones");

    detalleProducto.textContent = inv.nombre_producto;
    detalleAlmacen.textContent = inv.nombre_almacen;
    detalleStock.textContent = inv.stock;
    detalleMinStock.textContent = inv.min_stock;
    detalleEstado.textContent = obtenerEstado(inv.stock, inv.min_stock);

    $("#modalDetalleInventario").modal("show");
  }

  cargarProductos();
  cargarAlmacenes();
  renderTabla();

  $(modalRegistro).on("show.bs.modal", function () {
    if (modo !== "edit") {
      resetFormulario();
      tituloModal.textContent = "Registrar Inventario";
    }
  });

  if (btnGuardar) {
    btnGuardar.addEventListener("click", (e) => {
      e.preventDefault();

      const idProducto = norm(selectProducto.value);
      const idAlmacen = norm(selectAlmacen.value);
      const stock = Number(inpStock.value);
      const minStock = Number(inpMinStock.value);

      const nombreProducto =
        selectProducto.options[selectProducto.selectedIndex]?.text || "";

      const nombreAlmacen =
        selectAlmacen.options[selectAlmacen.selectedIndex]?.text || "";

      if (!idProducto || !idAlmacen) {
        alert("Selecciona producto y almacén");
        return;
      }

      const inventarios = getInventarios();

      if (modo === "create") {

        const yaExiste = inventarios.some(
          (i) => i.id_producto === idProducto && i.id_almacen === idAlmacen
        );

        if (yaExiste) {
          alert("Ese producto ya está registrado en ese almacén");
          return;
        }

        inventarios.push({
          id_inventario: generarId(inventarios),
          id_producto: idProducto,
          nombre_producto: nombreProducto,
          id_almacen: idAlmacen,
          nombre_almacen: nombreAlmacen,
          stock,
          min_stock: minStock
        });

        setInventarios(inventarios);
        renderTabla(inputBuscar ? inputBuscar.value : "");
        resetFormulario();
        $(modalRegistro).modal("hide");
        return;
      }

      const idx = inventarios.findIndex((i) => i.id_inventario === idEditando);

      inventarios[idx] = {
        ...inventarios[idx],
        id_producto: idProducto,
        nombre_producto: nombreProducto,
        id_almacen: idAlmacen,
        nombre_almacen: nombreAlmacen,
        stock,
        min_stock: minStock
      };

      setInventarios(inventarios);
      renderTabla(inputBuscar ? inputBuscar.value : "");
      resetFormulario();
      $(modalRegistro).modal("hide");
    });
  }

  if (tbody) {
    tbody.addEventListener("click", (e) => {

      const tr = e.target.closest("tr");
      if (!tr) return;

      const id = tr.getAttribute("data-id");
      const inventarios = getInventarios();
      const inv = inventarios.find((i) => i.id_inventario === id);

      if (!inv) return;

      if (e.target.closest(".btn-detalle")) {
        abrirDetalle(inv);
        return;
      }

      if (e.target.closest(".btn-editar")) {
        abrirEditar(inv);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {

        if (!confirm("¿Eliminar inventario?")) return;

        const nuevos = inventarios.filter((i) => i.id_inventario !== id);

        setInventarios(nuevos);
        renderTabla(inputBuscar ? inputBuscar.value : "");
      }
    });
  }

  if (isNaN(stock) || stock < 0 || isNaN(minStock) || minStock < 0) {
  alert("Ingresa valores válidos para stock y stock mínimo");
  return;
}

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }

});