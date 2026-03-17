document.addEventListener("DOMContentLoaded", () => {

  const STORAGE = "movimientos_v1";
  let editIndex = null;

  const getData = () => JSON.parse(localStorage.getItem(STORAGE)) || [];
  const setData = (data) => localStorage.setItem(STORAGE, JSON.stringify(data));

  const getProductos = () => JSON.parse(localStorage.getItem("productos_v1")) || [];
  const getAlmacenes = () => JSON.parse(localStorage.getItem("almacenes_v1")) || [];

  const tabla = document.getElementById("tablaMovimientos");

  const fecha = document.getElementById("fecha");
  const almacen = document.getElementById("almacen");
  const producto = document.getElementById("producto");
  const tipo = document.getElementById("tipo");
  const cantidad = document.getElementById("cantidad");

  const btnGuardar = document.getElementById("guardarMovimiento");

  // 🔥 LLENAR SELECTS
  function cargarSelects() {

    almacen.innerHTML = '<option value="">Seleccionar almacén</option>';
    getAlmacenes().forEach(a => {
      almacen.innerHTML += `<option value="${a.nombre}">${a.nombre}</option>`;
    });

    producto.innerHTML = '<option value="">Seleccionar producto</option>';
    getProductos().forEach(p => {
      producto.innerHTML += `<option value="${p.descripcion}">${p.descripcion}</option>`;
    });
  }

  // 🔥 RENDER TABLA
  function render() {
    const data = getData();

    tabla.innerHTML = "";

    data.forEach((m, i) => {
      tabla.innerHTML += `
        <tr>
          <td>${m.fecha}</td>
          <td>${m.almacen}</td>
          <td>${m.producto}</td>
          <td>${m.tipo}</td>
          <td>${m.cantidad}</td>
          <td>
            <button class="btn btn-info btn-sm ver" data-i="${i}">👁</button>
            <button class="btn btn-warning btn-sm editar" data-i="${i}">✏️</button>
            <button class="btn btn-danger btn-sm eliminar" data-i="${i}">🗑</button>
          </td>
        </tr>
      `;
    });
  }

  // 🔥 GUARDAR
  btnGuardar.addEventListener("click", () => {

    if (!fecha.value || !almacen.value || !producto.value || !cantidad.value) {
      alert("Completa todos los campos");
      return;
    }

    const data = getData();

    const nuevo = {
      fecha: fecha.value,
      almacen: almacen.value,
      producto: producto.value,
      tipo: tipo.value,
      cantidad: Number(cantidad.value)
    };

    if (editIndex === null) {
      data.push(nuevo);
    } else {
      data[editIndex] = nuevo;
      editIndex = null;
    }

    setData(data);
    render();

    $("#modalMovimiento").modal("hide");

    fecha.value = "";
    cantidad.value = "";
  });

  // 🔥 ACCIONES
  tabla.addEventListener("click", (e) => {

    const i = e.target.dataset.i;
    const data = getData();
    const mov = data[i];

    if (e.target.classList.contains("eliminar")) {
      data.splice(i, 1);
      setData(data);
      render();
    }

    if (e.target.classList.contains("editar")) {
      fecha.value = mov.fecha;
      almacen.value = mov.almacen;
      producto.value = mov.producto;
      tipo.value = mov.tipo;
      cantidad.value = mov.cantidad;

      editIndex = i;

      $("#modalMovimiento").modal("show");
    }

    if (e.target.classList.contains("ver")) {
      document.getElementById("detalleContenido").innerHTML = `
        <h5>Detalle</h5>
        <p><b>Fecha:</b> ${mov.fecha}</p>
        <p><b>Almacén:</b> ${mov.almacen}</p>
        <p><b>Producto:</b> ${mov.producto}</p>
        <p><b>Tipo:</b> ${mov.tipo}</p>
        <p><b>Cantidad:</b> ${mov.cantidad}</p>
      `;
      $("#modalDetalle").modal("show");
    }

  });

  // INIT
  cargarSelects();
  render();

});