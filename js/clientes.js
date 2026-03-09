document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "clientes_v4";

  const btnGuardar = document.getElementById("btnGuardarCliente");
  const btnAbrirCategorias = document.getElementById("btnAbrirCategorias");
  const btnAgregarCategoria = document.getElementById("btnAgregarCategoria");
  const btnCerrarCategorias = document.getElementById("btnCerrarCategorias");
  const btnCerrarCategoriasX = document.getElementById("btnCerrarCategoriasX");

  const form = document.getElementById("formularioCliente");
  const tbody = document.querySelector("#dataTable tbody");
  const inputBuscar = document.getElementById("buscarClientes");

  const inpFolio = document.getElementById("codigoCli");
  const inpNombre = document.getElementById("nombreCli");
  const inpApPat = document.getElementById("apellidoPaterno");
  const inpApMat = document.getElementById("apellidoMaterno");
  const inpEstado = document.getElementById("estadoCli");
  const inpMunicipio = document.getElementById("municipioCli");
  const inpTel = document.getElementById("telefonoCli");
  const inpEmail = document.getElementById("emailCli");

  const selectNuevaCategoria = document.getElementById("selectNuevaCategoria");
  const listaCategoriasCliente = document.getElementById("listaCategoriasCliente");
  const resumenCategorias = document.getElementById("resumenCategorias");

  const catClienteFolio = document.getElementById("catClienteFolio");
  const catClienteNombre = document.getElementById("catClienteNombre");

  const modalRegistro = "#modalNuevoCliente";
  const modalCategorias = document.getElementById("modalCategoriasCliente");
  const tituloModal = document.getElementById("tituloModal");

  let modo = "create";
  let folioEditando = null;
  let categoriasTemporales = [];

  const norm = (v) => (v ?? "").toString().trim();

  const getClientes = () => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
      return [];
    }
  };

  const setClientes = (arr) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  };

  inpTel.addEventListener("input", () => {
  inpTel.value = inpTel.value.replace(/\D/g, "").slice(0, 10);
});

  function actualizarResumenCategorias() {
    const total = categoriasTemporales.length;
    resumenCategorias.textContent = `${total} ${total === 1 ? "categoría registrada" : "categorías registradas"}`;
  }

  function renderCategoriasTemporales() {
    if (!listaCategoriasCliente) return;

    if (categoriasTemporales.length === 0) {
      listaCategoriasCliente.innerHTML = `
        <div class="text-muted small">No hay categorías agregadas.</div>
      `;
      actualizarResumenCategorias();
      return;
    }

    listaCategoriasCliente.innerHTML = `
      <ul class="list-group">
        ${categoriasTemporales.map(cat => `
          <li class="list-group-item d-flex justify-content-between align-items-center">
            ${cat}
            <button type="button" class="btn btn-danger btn-sm btn-quitar-categoria" data-categoria="${cat}">
              Quitar
            </button>
          </li>
        `).join("")}
      </ul>
    `;

    actualizarResumenCategorias();
  }

  function actualizarEncabezadoCategorias() {
    catClienteFolio.textContent = norm(inpFolio.value) || "Nuevo cliente";
    const nombreCompleto = [
      norm(inpNombre.value),
      norm(inpApPat.value),
      norm(inpApMat.value)
    ].filter(Boolean).join(" ");
    catClienteNombre.textContent = nombreCompleto || "Sin definir";
  }

  function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();
    const clientes = getClientes();

    const lista = !f
      ? clientes
      : clientes.filter(c => {
          const texto = `${c.folio} ${c.nombre} ${c.apPat} ${c.apMat} ${c.tel} ${c.email} ${c.estado} ${c.municipio} ${(c.categorias || []).join(" ")}`.toLowerCase();
          return texto.includes(f);
        });

    tbody.innerHTML = lista.map(c => `
      <tr data-folio="${c.folio}">
        <td>${c.folio}</td>
        <td>${c.nombre}</td>
        <td>${c.apPat}</td>
        <td>${c.apMat || ""}</td>
        <td>${c.tel}</td>
        <td>${c.email}</td>
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

  function seedFromHTMLIfEmpty() {
    const current = getClientes();
    if (current.length > 0) return;

    const rows = Array.from(tbody.querySelectorAll("tr"));
    const seeded = rows.map((tr, i) => {
      const tds = tr.querySelectorAll("td");
      if (tds.length < 6) return null;

      return {
        folio: norm(tds[0].textContent),
        nombre: norm(tds[1].textContent),
        apPat: norm(tds[2].textContent),
        apMat: norm(tds[3].textContent),
        tel: norm(tds[4].textContent),
        email: norm(tds[5].textContent),
        estado: i === 0 ? "Veracruz" : "Puebla",
        municipio: i === 0 ? "Xalapa" : "Puebla",
        categorias: i === 0 ? ["Solar", "Agua"] : ["Ganado"]
      };
    }).filter(Boolean);

    setClientes(seeded);
  }

  function resetFormularioCliente() {
    form.reset();
    categoriasTemporales = [];
    inpFolio.disabled = false;
    renderCategoriasTemporales();
    actualizarEncabezadoCategorias();
  }

  function abrirEditar(cliente) {
    console.log("Entró a editar:", cliente);
    modo = "edit";
    folioEditando = cliente.folio;

    inpFolio.value = cliente.folio;
    inpNombre.value = cliente.nombre;
    inpApPat.value = cliente.apPat;
    inpApMat.value = cliente.apMat || "";
    inpEstado.value = cliente.estado || "";
    inpMunicipio.value = cliente.municipio || "";
    inpTel.value = cliente.tel;
    inpEmail.value = cliente.email;

    categoriasTemporales = [...(cliente.categorias || [])];
    renderCategoriasTemporales();
    actualizarEncabezadoCategorias();

    inpFolio.disabled = true;
    tituloModal.textContent = `Editar Cliente ${cliente.folio}`;
    btnGuardar.textContent = "Guardar Cambios";
    $(modalRegistro).modal("show");
  }

  function abrirDetalle(cliente) {
    const modalDetalle = document.getElementById("modalDetalleCliente");

    const detalleFolio = document.getElementById("detalleFolio");
    const detalleNombre = document.getElementById("detalleNombre");
    const detalleApPat = document.getElementById("detalleApPat");
    const detalleApMat = document.getElementById("detalleApMat");
    const detalleTelefono = document.getElementById("detalleTelefono");
    const detalleEmail = document.getElementById("detalleEmail");
    const detalleEstado = document.getElementById("detalleEstado");
    const detalleMunicipio = document.getElementById("detalleMunicipio");
    const detalleCategorias = document.getElementById("detalleCategorias");

  if (
    !modalDetalle ||
    !detalleFolio || !detalleNombre || !detalleApPat || !detalleApMat ||
    !detalleTelefono || !detalleEmail || !detalleEstado ||
    !detalleMunicipio || !detalleCategorias
  ) {
    console.error("Faltan elementos del modal de detalle");
    return;
  }

detalleFolio.textContent = cliente.folio;
detalleNombre.textContent = cliente.nombre;
detalleApPat.textContent = cliente.apPat;
detalleApMat.textContent = cliente.apMat || "";
detalleTelefono.textContent = cliente.tel;
detalleEmail.textContent = cliente.email;
detalleEstado.textContent = cliente.estado || "";
detalleMunicipio.textContent = cliente.municipio || "";
detalleCategorias.textContent = (cliente.categorias || []).join(", ");

$("#modalDetalleCliente").modal("show");
}
  seedFromHTMLIfEmpty();
  renderTabla();
  renderCategoriasTemporales();
  actualizarResumenCategorias();

  $(modalRegistro).on("show.bs.modal", function () {
    if (modo !== "edit") {
      modo = "create";
      folioEditando = null;
      resetFormularioCliente();
      tituloModal.textContent = "Registrar Nuevo Cliente";
      btnGuardar.textContent = "Guardar Cliente";
    }
  });

  $(modalRegistro).on("hidden.bs.modal", function () {
  modo = "create";
  folioEditando = null;
  resetFormularioCliente();
});

  if (btnAbrirCategorias) {
    btnAbrirCategorias.addEventListener("click", () => {
      actualizarEncabezadoCategorias();
      renderCategoriasTemporales();
      if (modalCategorias){
          modalCategorias.style.display = "flex";
      }
    });
  }

    function cerrarVentanaCategorias() {
    if (modalCategorias) {
      modalCategorias.style.display = "none";
    }
  }

  if (btnCerrarCategorias) {
    btnCerrarCategorias.addEventListener("click", cerrarVentanaCategorias);
  }

  if (btnCerrarCategoriasX) {
    btnCerrarCategoriasX.addEventListener("click", cerrarVentanaCategorias);
  }

  if (btnAgregarCategoria) {
    btnAgregarCategoria.addEventListener("click", () => {
      const nuevaCategoria = norm(selectNuevaCategoria.value);

      if (!nuevaCategoria) {
        alert("Selecciona una categoría");
        return;
      }

      if (categoriasTemporales.includes(nuevaCategoria)) {
        alert("Esa categoría ya fue agregada");
        return;
      }

      categoriasTemporales.push(nuevaCategoria);
      renderCategoriasTemporales();
      selectNuevaCategoria.value = "";
    });
  }

  if (listaCategoriasCliente) {
    listaCategoriasCliente.addEventListener("click", (e) => {
      const btnQuitar = e.target.closest(".btn-quitar-categoria");
      if (!btnQuitar) return;

      const categoria = btnQuitar.getAttribute("data-categoria");
      categoriasTemporales = categoriasTemporales.filter(cat => cat !== categoria);
      renderCategoriasTemporales();
    });
  }

  btnGuardar.addEventListener("click", (e) => {
    e.preventDefault();

    const folio = norm(inpFolio.value);
    const nombre = norm(inpNombre.value);
    const apPat = norm(inpApPat.value);
    const apMat = norm(inpApMat.value);
    const estado = norm(inpEstado.value);
    const municipio = norm(inpMunicipio.value);
    const tel = norm(inpTel.value).replace(/\D/g, "");
    const email = norm(inpEmail.value);

    if (!/^\d{10}$/.test(tel)) {
      alert("El teléfono debe tener 10 dígitos");
      return;
}

    if (!folio || !nombre || !apPat || !estado || !municipio || !tel || !email) {
      alert("Completa todos los campos obligatorios");
      return;
    }

    if (categoriasTemporales.length === 0) {
      alert("Agrega al menos una categoría");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      alert("Email inválido");
      return;
    }

    const clientes = getClientes();

    if (modo === "create") {
      if (clientes.some(c => c.folio.toUpperCase() === folio.toUpperCase())) {
        alert("Ese folio ya existe");
        return;
      }

      clientes.push({
        folio,
        nombre,
        apPat,
        apMat,
        estado,
        municipio,
        tel,
        email,
        categorias: [...categoriasTemporales]
      });

      setClientes(clientes);
      renderTabla(inputBuscar ? inputBuscar.value : "");
      resetFormularioCliente();
      $(modalRegistro).modal("hide");
      return;
    }

    const idx = clientes.findIndex(c => c.folio === folioEditando);
    if (idx === -1) {
      alert("No se encontró el cliente a editar.");
      return;
    }

    clientes[idx] = {
      ...clientes[idx],
      nombre,
      apPat,
      apMat,
      estado,
      municipio,
      tel,
      email,
      categorias: [...categoriasTemporales]
    };

    setClientes(clientes);
    renderTabla(inputBuscar ? inputBuscar.value : "");
    modo = "create";
    folioEditando = null;
    resetFormularioCliente();
    $(modalRegistro).modal("hide");
  });

  tbody.addEventListener("click", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;

    const folio = tr.getAttribute("data-folio");
    const clientes = getClientes();
    const cliente = clientes.find(c => c.folio === folio);

    console.log("Click detectado en fila:", folio);
    console.log("Cliente encontrado:", cliente);

    if (!cliente) return;

    const btnDetalle = e.target.closest(".btn-detalle");
    if (btnDetalle) {
      console.log("Boton de dealle presionado");
      abrirDetalle(cliente);
      return;
    }

    const btnEditar = e.target.closest(".btn-editar");
    if (btnEditar) {
      console.log("Boton de editar presionado");
      abrirEditar(cliente);
      return;
    }

    const btnEliminar = e.target.closest(".btn-eliminar");
    if (btnEliminar) {
      console.log("Boton de eliminar presionado");
      if (!confirm(`¿Eliminar el cliente ${folio}?`)) return;
      const nuevos = clientes.filter(c => c.folio !== folio);
      setClientes(nuevos);
      renderTabla(inputBuscar ? inputBuscar.value : "");
    }
  });

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }
});