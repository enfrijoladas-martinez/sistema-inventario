document.addEventListener("DOMContentLoaded", () => {
  const MOVIMIENTOS_KEY = "movimientos_inventario_v1";
  const INVENTARIOS_KEY = "inventarios_v1";

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

  let modo = "create";
  let idEditando = null;

  const norm = (v) => (v ?? "").toString().trim();

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

  function generarIdMovimiento(movimientos) {
    const ultimo = movimientos.reduce((max, mov) => {
      const actual = Number(mov.id_mov) || 0;
      return actual > max ? actual : max;
    }, 0);

    return ultimo + 1;
  }

  function textoTipo(tipo) {
    return tipo ? "Entrada" : "Salida";
  }

  // --- NUEVA FUNCIÓN PARA FORMATEAR LA FECHA ---
  function formatearFecha(fechaConT) {
    if (!fechaConT) return "";
    let partes = fechaConT.split('T');
    if (partes.length !== 2) return fechaConT;
    let fecha = partes[0].split('-');
    let hora = partes[1];
    return `${fecha[2]}-${fecha[1]}-${fecha[0]} ${hora}`;
  }
  // ---------------------------------------------

  function resetFormulario() {
    form.reset();
    inpFecha.value = new Date().toISOString().slice(0, 16);
    modo = "create";
    idEditando = null;
  }

  function cargarInventarios() {
    const inventarios = getInventarios();

    selectInventario.innerHTML = `
      <option value="">Elegir producto y almacén...</option>
    `;

    inventarios.forEach((inv) => {
      selectInventario.innerHTML += `
        <option value="${inv.id_inventario}">
          ${inv.nombre_producto} - ${inv.nombre_almacen}
        </option>
      `;
    });
  }

  function buscarInventarioPorMovimiento(inventarios, mov) {
    return inventarios.findIndex((inv) => {
      if (mov.id_inventario && inv.id_inventario === mov.id_inventario) return true;

      return (
        inv.id_producto === mov.id_producto &&
        inv.id_almacen === mov.id_almacen
      );
    });
  }

  function revertirMovimientoEnInventario(inventarios, mov) {
    const idx = buscarInventarioPorMovimiento(inventarios, mov);

    if (idx === -1) {
      throw new Error("No se encontró el inventario original del movimiento.");
    }

    const stockActual = Number(inventarios[idx].stock) || 0;
    const cantidad = Number(mov.cantidad) || 0;

    inventarios[idx].stock = mov.tipo
      ? stockActual - cantidad
      : stockActual + cantidad;

    if (Number(inventarios[idx].stock) < 0) {
      throw new Error("No se pudo revertir el movimiento porque el stock quedaría negativo.");
    }

    return idx;
  }

  function aplicarMovimientoEnInventario(inventarios, idInventario, tipoTexto, cantidad) {
    const idx = inventarios.findIndex((inv) => inv.id_inventario === idInventario);

    if (idx === -1) {
      throw new Error("No se encontró el inventario seleccionado.");
    }

    const stockActual = Number(inventarios[idx].stock) || 0;
    const esEntrada = tipoTexto === "entrada";

    if (!esEntrada && cantidad > stockActual) {
      throw new Error("La salida no puede ser mayor al stock disponible.");
    }

    const stockNuevo = esEntrada
      ? stockActual + cantidad
      : stockActual - cantidad;

    inventarios[idx] = {
      ...inventarios[idx],
      stock: stockNuevo
    };

    return {
      inventario: inventarios[idx],
      stockAnterior: stockActual,
      stockNuevo,
      esEntrada
    };
  }

  function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();
    const movimientos = getMovimientos();

    const lista = !f
      ? movimientos
      : movimientos.filter((m) => {
          const texto = `
            ${m.id_mov}
            ${m.fecha}
            ${textoTipo(m.tipo)}
            ${m.nombre_producto}
            ${m.nombre_almacen}
            ${m.cantidad}
            ${m.id_venta}
          `.toLowerCase();

          return texto.includes(f);
        });

    // --- AQUÍ SE APLICA EL CAMBIO EN LA FECHA ---
    tbody.innerHTML = lista.map((m) => `
      <tr data-id="${m.id_mov}">
        <td>${formatearFecha(m.fecha) || ""}</td>
        <td>${textoTipo(m.tipo)}</td>
        <td>${m.nombre_producto}</td>
        <td>${m.nombre_almacen}</td>
        <td>${m.cantidad}</td>
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

  function abrirDetalle(mov) {
    const detalleIdMovimiento = document.getElementById("detalleIdMovimiento");
    const detalleTipoMovimiento = document.getElementById("detalleTipoMovimiento");
    const detalleIdVentaMovimiento = document.getElementById("detalleIdVentaMovimiento");
    const detalleProductoMovimiento = document.getElementById("detalleProductoMovimiento");
    const detalleAlmacenMovimiento = document.getElementById("detalleAlmacenMovimiento");
    const detalleCantidadMovimiento = document.getElementById("detalleCantidadMovimiento");

    detalleIdMovimiento.textContent = mov.id_mov ?? "";
    detalleTipoMovimiento.textContent = textoTipo(mov.tipo);
    detalleIdVentaMovimiento.textContent = mov.id_venta || "No aplica";
    detalleProductoMovimiento.textContent = mov.nombre_producto || "";
    detalleAlmacenMovimiento.textContent = mov.nombre_almacen || "";
    detalleCantidadMovimiento.textContent = mov.cantidad ?? "";

    $("#modalDetalleMovimiento").modal("show");
  }

  function abrirEditar(mov) {
    modo = "edit";
    idEditando = mov.id_mov;

    inpFecha.value = mov.fecha || "";
    selectTipo.value = mov.tipo ? "entrada" : "salida";
    selectInventario.value = mov.id_inventario || "";
    inpCantidad.value = mov.cantidad ?? "";

    tituloModal.textContent = `Editar Movimiento ${mov.id_mov}`;
    btnGuardar.textContent = "Guardar Cambios";
    $(modalRegistro).modal("show");
  }

  cargarInventarios();
  renderTabla();
  resetFormulario();

  $(modalRegistro).on("show.bs.modal", function () {
    cargarInventarios();

    if (modo !== "edit") {
    resetFormulario();
    tituloModal.textContent = "Registrar Movimiento";
    btnGuardar.textContent = "Guardar Movimiento";

    }
  });

  if (btnGuardar) {
    btnGuardar.addEventListener("click", (e) => {
    e.preventDefault();

    $(modalRegistro).on("hidden.bs.modal", function () {
  resetFormulario();
  tituloModal.textContent = "Registrar Movimiento";
  btnGuardar.textContent = "Guardar Movimiento";
});

      const fecha = norm(inpFecha.value);
      const tipoTexto = norm(selectTipo.value);
      const idInventario = norm(selectInventario.value);
      const cantidad = Number(inpCantidad.value);

      if (!fecha || !tipoTexto || !idInventario) {
        alert("Completa fecha, tipo e inventario");
        return;
      }

      if (isNaN(cantidad) || cantidad <= 0) {
        alert("Ingresa una cantidad válida");
        return;
      }

      const inventarios = getInventarios();
      const movimientos = getMovimientos();

      try {
        if (modo === "create") {
          const resultado = aplicarMovimientoEnInventario(
            inventarios,
            idInventario,
            tipoTexto,
            cantidad
          );

          movimientos.push({
            id_mov: generarIdMovimiento(movimientos),
            tipo: resultado.esEntrada,
            cantidad,
            id_venta: "",
            id_producto: resultado.inventario.id_producto,
            id_almacen: resultado.inventario.id_almacen,
            id_inventario: resultado.inventario.id_inventario,
            nombre_producto: resultado.inventario.nombre_producto,
            nombre_almacen: resultado.inventario.nombre_almacen,
            fecha
          });

          setInventarios(inventarios);
          setMovimientos(movimientos);
          renderTabla(inputBuscar ? inputBuscar.value : "");
          resetFormulario();
          $(modalRegistro).modal("hide");
          return;
        }

        const idxMovimiento = movimientos.findIndex(
          (m) => Number(m.id_mov) === Number(idEditando)
        );

        if (idxMovimiento === -1) {
          alert("No se encontró el movimiento a editar");
          return;
        }

        const movimientoOriginal = movimientos[idxMovimiento];

        revertirMovimientoEnInventario(inventarios, movimientoOriginal);

        const resultado = aplicarMovimientoEnInventario(
          inventarios,
          idInventario,
          tipoTexto,
          cantidad
        );

        movimientos[idxMovimiento] = {
          ...movimientoOriginal,
          tipo: resultado.esEntrada,
          cantidad,
          id_venta: movimientoOriginal.id_venta || "",
          id_producto: resultado.inventario.id_producto,
          id_almacen: resultado.inventario.id_almacen,
          id_inventario: resultado.inventario.id_inventario,
          nombre_producto: resultado.inventario.nombre_producto,
          nombre_almacen: resultado.inventario.nombre_almacen,
          fecha
        };

        setInventarios(inventarios);
        setMovimientos(movimientos);
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

      const id = Number(tr.getAttribute("data-id"));
      const movimientos = getMovimientos();
      const mov = movimientos.find((m) => Number(m.id_mov) === id);

      if (!mov) return;

      if (e.target.closest(".btn-detalle")) {
        abrirDetalle(mov);
        return;
      }

      if (e.target.closest(".btn-editar")) {
        abrirEditar(mov);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        if (!confirm(`¿Eliminar el movimiento ${mov.id_mov}?`)) return;

        const inventarios = getInventarios();

        try {
          revertirMovimientoEnInventario(inventarios, mov);

          const nuevosMovimientos = movimientos.filter(
            (m) => Number(m.id_mov) !== id
          );

          setInventarios(inventarios);
          setMovimientos(nuevosMovimientos);
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