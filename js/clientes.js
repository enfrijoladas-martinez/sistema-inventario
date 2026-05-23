document.addEventListener("DOMContentLoaded", () => {
  const API_URL = "http://146.190.165.82";

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
  const selectEstado = document.getElementById("estadoCli");
  const selectMunicipio = document.getElementById("municipioCli");
  const inpTel = document.getElementById("telefonoCli");
  const inpEmail = document.getElementById("emailCli");

  const selectNuevaCategoria = document.getElementById("selectNuevaCategoria");
  const listaCategoriasCliente = document.getElementById("listaCategoriasCliente");
  const resumenCategorias = document.getElementById("resumenCategorias");
  const catClienteFolio = document.getElementById("catClienteFolio");
  const catClienteNombre = document.getElementById("catClienteNombre");
  const tituloModal = document.getElementById("tituloModal");
  const modalRegistro = "#modalNuevoCliente";
  const modalCategorias = document.getElementById("modalCategoriasCliente");

  let clientesGlobal = [];
  let categoriasGlobal = [];
  let estadosCache = [];
  let municipiosCache = [];
  let modo = "create";
  let idEditando = null;
  let categoriasTemporales = [];
  let clienteOriginal = null;

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

    const response = await fetch(`${API_URL}${endpoint}`, {
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
      const mensaje = data?.message || data?.error || data?.msg || "Error en la peticion";
      throw new Error(mensaje);
    }
    if (data?.success === false) {
      const mensaje = data?.message || data?.error || data?.msg || "Ocurrio un error";
      throw new Error(mensaje);
    }
    return data;
  }

  async function getEstadosAPI() {
    const res = await apiFetch("/api/estados_municipios/", { auth: false });
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getMunicipiosPorEstadoAPI(idEstado) {
    if (!idEstado) return [];
    const res = await apiFetch(`/api/estados_municipios/${idEstado}`, { auth: false });
    return Array.isArray(res.data) ? res.data : [];
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

  async function cargarCategorias() {
    try {
      const res = await apiFetch("/api/categorias/", { auth: false });
      categoriasGlobal = Array.isArray(res.data) ? res.data : [];
      selectNuevaCategoria.innerHTML = `<option value="">Elegir categoria...</option>`;
      categoriasGlobal.forEach((c) => {
        const option = document.createElement("option");
        const idCat = c.id_categoria ?? c.id_categoria ?? c.id_cat;
        option.value = idCat;
        option.textContent = c.nombre;
        selectNuevaCategoria.appendChild(option);
      });
    } catch (error) {
      console.error("Error cargando categorias:", error);
    }
  }

  async function cargarClientes() {
    try {
      const res = await apiFetch("/api/clientes/", { auth: false });
      clientesGlobal = Array.isArray(res.data) ? res.data : (Array.isArray(res) ? res : []);
      renderTabla();
    } catch (error) {
      console.error("Error cargando clientes:", error);
    }
  }

  function renderTabla(filtro = "") {
    const f = (filtro || "").toLowerCase();
    const lista = !f
      ? clientesGlobal
      : clientesGlobal.filter(c => {
          const texto = `${c.folio} ${c.nombre} ${c.apellido_paterno} ${c.apellido_materno || ""} ${c.telefono} ${c.email}`.toLowerCase();
          return texto.includes(f);
        });

    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
    const esEmpleado = (usuario.rol || "").toLowerCase() === "empleado";

    let tablaBody = document.querySelector("#dataTable tbody");
    if (!tablaBody) {
      tablaBody = document.createElement("tbody");
      document.getElementById("dataTable").appendChild(tablaBody);
    }
    tablaBody.innerHTML = lista.map(c => `
      <tr data-id="${c.id_cliente}">
        <td>${c.folio || ""}</td>
        <td>${c.nombre || ""}</td>
        <td>${c.apellido_paterno || ""}</td>
        <td>${c.apellido_materno || ""}</td>
        <td>${c.telefono || ""}</td>
        <td>${c.email || ""}</td>
        <td>
          <button type="button" class="btn btn-info btn-circle btn-sm btn-detalle" title="Ver detalle">
            <i class="fas fa-eye"></i>
          </button>
          <button type="button" class="btn btn-warning btn-circle btn-sm btn-editar" title="Editar">
            <i class="fas fa-pen"></i>
          </button>
          ${!esEmpleado ? `
          <button type="button" class="btn btn-danger btn-circle btn-sm btn-eliminar" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
          ` : ''}
        </td>
      </tr>
    `).join("");
  }

  function actualizarResumenCategorias() {
    const total = categoriasTemporales.length;
    resumenCategorias.textContent = `${total} ${total === 1 ? "categoria registrada" : "categorias registradas"}`;
  }

  function renderCategoriasTemporales() {
    if (!listaCategoriasCliente) return;
    if (categoriasTemporales.length === 0) {
      listaCategoriasCliente.innerHTML = `<div class="text-muted small">No hay categorias agregadas.</div>`;
      actualizarResumenCategorias();
      return;
    }
    listaCategoriasCliente.innerHTML = `
      <ul class="list-group">
        ${categoriasTemporales.map(catId => {
          const cat = categoriasGlobal.find(c => (c.id_categoria ?? c.id_categoria ?? c.id_cat) == catId);
          const nombre = cat ? cat.nombre : catId;
          return `
            <li class="list-group-item d-flex justify-content-between align-items-center">
              ${nombre}
              <button type="button" class="btn btn-danger btn-sm btn-quitar-categoria" data-categoria="${catId}">Quitar</button>
            </li>
          `;
        }).join("")}
      </ul>
    `;
    actualizarResumenCategorias();
  }

  function actualizarEncabezadoCategorias() {
    catClienteFolio.textContent = inpFolio.value || "Nuevo cliente";
    const nombreCompleto = [inpNombre.value, inpApPat.value, inpApMat.value].filter(Boolean).join(" ");
    catClienteNombre.textContent = nombreCompleto || "Sin definir";
  }

  async function obtenerDetalleCliente(id) {
    try {
      const res = await apiFetch(`/api/clientes/${id}`, { auth: false });
      return res.data || res || null;
    } catch (error) {
      console.error("Error obteniendo detalle:", error);
      return null;
    }
  }

  function resetFormulario() {
    form.reset();
    categoriasTemporales = [];
    clienteOriginal = null;
    inpFolio.disabled = false;
    selectMunicipio.innerHTML = `<option value="">Elegir municipio...</option>`;
    selectMunicipio.disabled = true;
    renderCategoriasTemporales();
    actualizarEncabezadoCategorias();
  }

  async function abrirEditar(cliente) {
    modo = "edit";
    idEditando = cliente.id_cliente;
    const c = await obtenerDetalleCliente(cliente.id_cliente) || cliente;
    clienteOriginal = {
      folio: c.folio || "",
      nombre: c.nombre || "",
      apellido_paterno: c.apellido_paterno || "",
      apellido_materno: c.apellido_materno || "",
      telefono: c.telefono || "",
      email: c.email || "",
      id_estado: c.id_estado || null,
      id_municipio: c.id_municipio || null,
      categorias_ids: (c.categorias || []).map(cat => cat.id_categoria ?? cat.id_categoria ?? cat.id_cat ?? cat)
    };
    inpFolio.value = c.folio || "";
    inpNombre.value = c.nombre || "";
    inpApPat.value = c.apellido_paterno || "";
    inpApMat.value = c.apellido_materno || "";
    inpTel.value = c.telefono || "";
    inpEmail.value = c.email || "";
    if (c.id_estado) {
      await cargarEstados(c.id_estado);
      await cargarMunicipios(c.id_estado, c.id_municipio);
    }
    categoriasTemporales = clienteOriginal.categorias_ids.slice();
    renderCategoriasTemporales();
    actualizarEncabezadoCategorias();
    
    tituloModal.textContent = `Editar Cliente ${c.folio}`;
    btnGuardar.textContent = "Guardar Cambios";
    $(modalRegistro).modal("show");
  }

  async function abrirDetalle(cliente) {
    const c = await obtenerDetalleCliente(cliente.id_cliente) || cliente;
    document.getElementById("detalleFolio").textContent = c.folio || "";
    document.getElementById("detalleNombre").textContent = c.nombre || "";
    document.getElementById("detalleApPat").textContent = c.apellido_paterno || "";
    document.getElementById("detalleApMat").textContent = c.apellido_materno || "";
    document.getElementById("detalleTelefono").textContent = c.telefono || "";
    document.getElementById("detalleEmail").textContent = c.email || "";
    document.getElementById("detalleEstado").textContent = c.estado_nombre || c.estado || "";
    document.getElementById("detalleMunicipio").textContent = c.municipio_nombre || c.municipio || "";
    document.getElementById("detalleCategorias").textContent = (c.categorias || []).map(cat => cat.nombre || cat).join(", ");
    $("#modalDetalleCliente").modal("show");
  }

  inpTel.addEventListener("input", () => {
    inpTel.value = inpTel.value.replace(/\D/g, "").slice(0, 10);
  });

  if (selectEstado) {
    selectEstado.addEventListener("change", async () => {
      const idEstado = selectEstado.value;
      await cargarMunicipios(idEstado || "");
    });
  }

  $(modalRegistro).on("show.bs.modal", function () {
    if (modo !== "edit") {
      modo = "create";
      idEditando = null;
      resetFormulario();
      tituloModal.textContent = "Registrar Nuevo Cliente";
      btnGuardar.textContent = "Guardar Cliente";
    }
  });

  $(modalRegistro).on("hidden.bs.modal", function () {
    modo = "create";
    idEditando = null;
    resetFormulario();
  });

  if (btnAbrirCategorias) {
    btnAbrirCategorias.addEventListener("click", () => {
      actualizarEncabezadoCategorias();
      renderCategoriasTemporales();
      if (modalCategorias) {
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
      const nuevaCategoriaId = selectNuevaCategoria.value;
      if (!nuevaCategoriaId) {
        alert("Selecciona una categoria");
        return;
      }
      const idCategoria = Number(nuevaCategoriaId);
      if (isNaN(idCategoria) || idCategoria === 0) {
        alert("Categoria invalida");
        return;
      }
      if (categoriasTemporales.includes(idCategoria)) {
        alert("Esa categoria ya fue agregada");
        return;
      }
      categoriasTemporales.push(idCategoria);
      renderCategoriasTemporales();
      selectNuevaCategoria.value = "";
    });
  }

  if (listaCategoriasCliente) {
    listaCategoriasCliente.addEventListener("click", (e) => {
      const btnQuitar = e.target.closest(".btn-quitar-categoria");
      if (!btnQuitar) return;
      const categoria = btnQuitar.getAttribute("data-categoria");
      categoriasTemporales = categoriasTemporales.filter(cat => String(cat) !== String(categoria));
      renderCategoriasTemporales();
    });
  }

  btnGuardar.addEventListener("click", async (e) => {
    e.preventDefault();
    const folio = inpFolio.value.trim();
    const nombre = inpNombre.value.trim();
    const apPat = inpApPat.value.trim();
    const apMat = inpApMat.value.trim();
    const idEstado = selectEstado.value ? Number(selectEstado.value) : null;
    const idMunicipio = selectMunicipio.value ? Number(selectMunicipio.value) : null;
    const tel = inpTel.value.replace(/\D/g, "");
    const email = inpEmail.value.trim();
    const nuevasCategorias = (categoriasTemporales?.length > 0) ? categoriasTemporales : [];

    let cliente;
    if (modo === "create") {
      cliente = {
        folio,
        nombre,
        apellido_paterno: apPat,
        apellido_materno: apMat || null,
        telefono: tel,
        email,
        id_estado: idEstado,
        id_municipio: idMunicipio,
        categorias_ids: nuevasCategorias
      };
    } else {
      cliente = {};
      if (clienteOriginal && clienteOriginal.folio !== folio) cliente.folio = folio;
      if (clienteOriginal && clienteOriginal.nombre !== nombre) cliente.nombre = nombre;
      if (clienteOriginal && clienteOriginal.apellido_paterno !== apPat) cliente.apellido_paterno = apPat;
      if (clienteOriginal && clienteOriginal.apellido_materno !== (apMat || null)) cliente.apellido_materno = apMat || null;
      if (clienteOriginal && clienteOriginal.telefono !== tel) cliente.telefono = tel;
      if (clienteOriginal && clienteOriginal.email !== email) cliente.email = email;
      if (clienteOriginal && clienteOriginal.id_estado !== idEstado) cliente.id_estado = idEstado;
      if (clienteOriginal && clienteOriginal.id_municipio !== idMunicipio) cliente.id_municipio = idMunicipio;
      
      const catOriginalesStr = (clienteOriginal ? clienteOriginal.categorias_ids : []).slice().sort().join(",");
      const catNuevasStr = nuevasCategorias.slice().sort().join(",");
      if (catOriginalesStr !== catNuevasStr) {
        cliente.categorias_ids = nuevasCategorias;
      }

      if (Object.keys(cliente).length === 0) {
        await Swal.fire({
          icon: "warning",
          title: "Sin cambios",
          text: "No se detectaron cambios en el cliente",
          confirmButtonText: "Aceptar"
        });
        return;
      }
    }

    try {
      if (modo === "create") {
        await apiFetch("/api/clientes/", {
          method: "POST",
          body: JSON.stringify(cliente),
          auth: false
        });
        Swal.fire({
          icon: "success",
          title: "Exito",
          text: "Cliente creado correctamente",
          confirmButtonText: "Aceptar"
        });
        await cargarClientes();
        $(modalRegistro).modal("hide");
      } else {
        await apiFetch(`/api/clientes/${idEditando}`, {
          method: "PUT",
          body: JSON.stringify(cliente),
          auth: false
        });
        Swal.fire({
          icon: "success",
          title: "Exito",
          text: "Cliente actualizado correctamente",
          confirmButtonText: "Aceptar"
        });
        await cargarClientes();
        $(modalRegistro).modal("hide");
      }
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message,
        confirmButtonText: "Aceptar"
      });
    }
  });

  document.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      if (!tr || !tr.closest("#dataTable")) return;
      const id = parseInt(tr.getAttribute("data-id"));
      const cliente = clientesGlobal.find(c => c.id_cliente === id);
      if (!cliente) return;

      if (e.target.closest(".btn-detalle")) {
        abrirDetalle(cliente);
        return;
      }
      if (e.target.closest(".btn-editar")) {
        abrirEditar(cliente);
        return;
      }
      if (e.target.closest(".btn-eliminar")) {
        const result = await Swal.fire({
          icon: "warning",
          title: "¿Estas seguro?",
          text: `¿Eliminar el cliente ${cliente.folio}?\n\nLas ventas asociadas a este cliente se moverán al cliente "Público General".`,
          showCancelButton: true,
          confirmButtonText: "Si, eliminar",
          cancelButtonText: "Cancelar",
          confirmButtonColor: "#d33",
          cancelButtonColor: "#6c757d",
          reverseButtons: true
        });
        if (!result.isConfirmed) return;
        try {
          await apiFetch(`/api/clientes/${cliente.id_cliente}`, {
            method: "DELETE"
          });
          Swal.fire({
            icon: "success",
            title: "Exito",
            text: "Cliente eliminado correctamente",
            confirmButtonText: "Aceptar"
          });
          await cargarClientes();
        } catch (error) {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: error.message,
            confirmButtonText: "Aceptar"
          });
        }
      }
    });

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }

  cargarClientes();
  cargarEstados();
  cargarCategorias();
});
