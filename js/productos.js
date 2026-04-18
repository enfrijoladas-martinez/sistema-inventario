document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://143.198.230.63";

  const btnGuardar                  = document.getElementById("btnGuardarProducto");
  const btnAbrirCategoriasProducto  = document.getElementById("btnAbrirCategoriasProducto");
  const btnAgregarCategoriaProducto = document.getElementById("btnAgregarCategoriaProducto");
  const btnCerrarCategorias         = document.getElementById("btnCerrarCategorias");
  const btnCerrarCategoriasX        = document.getElementById("btnCerrarCategoriasX");
  const btnAbrirSubcategorias       = document.getElementById("btnAbrirSubcategorias");
  const btnAgregarSubcategoria      = document.getElementById("btnAgregarSubcategoria");
  const btnCerrarSubcategorias      = document.getElementById("btnCerrarSubcategorias");
  const btnCerrarSubcategoriasX     = document.getElementById("btnCerrarSubcategoriasX");

  const form        = document.getElementById("formularioProducto");
  const tbody       = document.querySelector("#dataTable tbody");
  const inputBuscar = document.getElementById("buscarProductos");
  const tituloModal = document.getElementById("tituloModal");

  const inpCodigo      = document.getElementById("codigoProd");
  const inpDescripcion = document.getElementById("descripcionProd");
  const inpCosto       = document.getElementById("costoProd");
  const inpPrecio      = document.getElementById("precioProd");

  const selectCategoriaProducto     = document.getElementById("selectCategoriaProducto");
  const listaCategoriasProducto     = document.getElementById("listaCategoriasProducto");
  const resumenCategoriasProducto   = document.getElementById("resumenCategoriasProducto");

  const selectNuevaSubcategoria     = document.getElementById("selectNuevaSubcategoria");
  const selectValorSubcategoria     = document.getElementById("valorSubcategoria");
  const inpUnidadSubcategoria       = document.getElementById("unidadSubcategoria");
  const listaSubcategoriasProducto  = document.getElementById("listaSubcategoriasProducto");
  const resumenSubcategoriasProducto = document.getElementById("resumenSubcategoriasProducto");

  const catProductoCodigo      = document.getElementById("catProductoCodigo");
  const catProductoDescripcion = document.getElementById("catProductoDescripcion");
  const subProductoCodigo      = document.getElementById("subProductoCodigo");
  const subProductoDescripcion = document.getElementById("subProductoDescripcion");

  const modalRegistro    = "#modalNuevoProducto";
  const modalCategorias  = document.getElementById("modalCategoriasProducto");
  const modalSubcategorias = document.getElementById("modalSubcategoriasProducto");

  let modo                    = "create";
  let idEditando              = null;
  let categoriasTemporales    = []; 
  let subcategoriasTemporales = []; 
  let catalogoSubcats         = []; 
  let productosCache          = []; 

  const norm  = (v) => (v ?? "").toString().trim();
  const money = (v) => Number(v || 0).toFixed(2);

  function campo(obj, ...keys) {
    for (const k of keys) {
      if (obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return "";
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

    if (data && data.success === false) {
      throw new Error(data?.message || "Operación fallida");
    }

    return data;
  }

  async function getProductosAPI() {
    const res = await apiFetch("/api/productos/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getProductoDetalleAPI(idProducto) {
    const res = await apiFetch(`/api/productos/${idProducto}`);
    return res.data || null;
  }

  async function crearProductoAPI(payload) {
    return await apiFetch("/api/productos/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function editarProductoAPI(idProducto, payload) {
    return await apiFetch(`/api/productos/${idProducto}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async function eliminarProductoAPI(idProducto) {
    return await apiFetch(`/api/productos/${idProducto}`, {
      method: "DELETE"
    });
  }

  async function getCategoriasAPI() {
    const res = await apiFetch("/api/categorias/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function getSubcategoriasAPI() {
    const res = await apiFetch("/api/subcategorias/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function cargarCategorias() {
    if (!selectCategoriaProducto) return;
    try {
      const lista = await getCategoriasAPI();
      selectCategoriaProducto.innerHTML = '<option value="">Elegir categoría...</option>';
      lista.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat.id_cat;
        opt.textContent = cat.nombre;
        selectCategoriaProducto.appendChild(opt);
      });
    } catch (err) {
      console.error("No se pudieron cargar las categorías:", err.message);
    }
  }

  async function cargarSubcategorias() {
    if (!selectNuevaSubcategoria) return;
    try {
      catalogoSubcats = await getSubcategoriasAPI();
      selectNuevaSubcategoria.innerHTML = '<option value="">Elegir subcategoría...</option>';
      catalogoSubcats.forEach((sub) => {
        const id = campo(sub, "id_subcat", "id");
        const nombre = campo(sub, "nombre");
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = nombre;
        selectNuevaSubcategoria.appendChild(opt);
      });
    } catch (err) {
      console.error("No se pudieron cargar las subcategorías:", err.message);
    }
  }

  async function cargarProductos() {
    try {
      productosCache = await getProductosAPI();
      renderTabla(inputBuscar ? inputBuscar.value : "");
    } catch (err) {
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error al cargar productos: ${err.message}</td></tr>`;
      }
    }
  }

  function renderTabla(filtro = "") {
    if (!tbody) return;
    const f = norm(filtro).toLowerCase();

    const lista = !f
      ? productosCache
      : productosCache.filter((p) => {
          const cats = (p.categorias || []).map((c) => c.nombre).join(" ");
          const texto = `${p.folio} ${p.descripcion || ""} ${p.costo} ${p.precio} ${cats}`.toLowerCase();
          return texto.includes(f);
        });

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">Sin productos registrados.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map((p) => {
      const cats = (p.categorias || []).map((c) => c.nombre).join(", ") || "—";
      return `
        <tr data-id="${p.id_producto}">
          <td>${norm(p.folio)}</td>
          <td>${norm(p.descripcion) || "—"}</td>
          <td>$${money(p.costo)}</td>
          <td>$${money(p.precio)}</td>
          <td>${cats}</td>
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
      `;
    }).join("");
  }

  async function abrirDetalle(idProducto) {
    try {
      const producto = await getProductoDetalleAPI(idProducto);
      if (!producto) {
        alert("No se pudo obtener el detalle del producto");
        return;
      }

      const detalleCodigo = document.getElementById("detalleCodigo");
      const detalleDescripcion = document.getElementById("detalleDescripcion");
      const detalleCosto = document.getElementById("detalleCosto");
      const detallePrecio = document.getElementById("detallePrecio");
      const detalleCategorias = document.getElementById("detalleCategorias");
      const detalleSubcategorias = document.getElementById("detalleSubcategorias");

      const cats = (producto.categorias || []).map((c) => c.nombre).join(", ");
      const subcats = producto.subcategorias || [];

      if (detalleCodigo) detalleCodigo.textContent = norm(producto.folio);
      if (detalleDescripcion) detalleDescripcion.textContent = norm(producto.descripcion) || "—";
      if (detalleCosto) detalleCosto.textContent = `$${money(producto.costo)}`;
      if (detallePrecio) detallePrecio.textContent = `$${money(producto.precio)}`;
      if (detalleCategorias) detalleCategorias.textContent = cats || "Sin categorías";
      if (detalleSubcategorias) {
        detalleSubcategorias.textContent = subcats.length
          ? subcats.map((sub) => {
          const nombre = campo(sub, "nombre");
          const valor  = campo(sub, "valor_numerico", "valor");
          const unidad = campo(sub, "unidad");
          return `${nombre}: ${valor} ${unidad}`;
          }).join(", ")
          : "Sin subcategorías";
      }
    $("#modalDetalleProducto").modal("show");
  } catch (err) {
    alert(`Error al cargar el detalle: ${err.message}`);
  }
}

  async function abrirEditar(idProducto) {
    try {
      const producto = await getProductoDetalleAPI(idProducto);
      if (!producto) {
        alert("No se pudo cargar el producto");
        return;
      }

      modo       = "edit";
      idEditando = producto.id_producto;

      inpCodigo.value      = norm(producto.folio);
      inpDescripcion.value = norm(producto.descripcion);
      inpCosto.value       = producto.costo ?? "";
      inpPrecio.value      = producto.precio ?? "";
      inpCodigo.disabled   = true;

      categoriasTemporales = (producto.categorias || []).map((c) => ({
        id_cat: c.id_cat,
        nombre: c.nombre
      }));

      subcategoriasTemporales = (producto.subcategorias || []).map((sub) => ({
        id_subcat:      campo(sub, "id_subcat", "id"),
        nombre:         campo(sub, "nombre"),
        valor_numerico: Number(campo(sub, "valor_numerico", "valor")),
        unidad:         campo(sub, "unidad")
      }));

      renderCategoriasTemporales();
      renderSubcategoriasTemporales();
      actualizarEncabezadosVentanas();

      if (tituloModal) tituloModal.textContent = `Editar Producto ${producto.folio}`;
      if (btnGuardar)  btnGuardar.textContent  = "Guardar Cambios";

      $(modalRegistro).modal("show");
    } catch (err) {
      alert(`Error al cargar el producto: ${err.message}`);
    }
  }

  async function guardarProducto() {
    const folio       = norm(inpCodigo.value);
    const descripcion = norm(inpDescripcion.value);
    const costo       = parseFloat(inpCosto ? inpCosto.value : "");
    const precio      = parseFloat(inpPrecio.value);

    if (!folio || !descripcion) {
      alert("Completa el código y la descripción");
      return;
    }
    if (isNaN(costo) || costo < 0) {
      alert("El costo debe ser un número válido");
      return;
    }
    if (isNaN(precio) || precio <= 0) {
      alert("El precio debe ser un número mayor a cero");
      return;
    }
    if (categoriasTemporales.length === 0) {
      alert("Agrega al menos una categoría");
      return;
    }

    const payload = {
      folio,
      descripcion,
      costo,
      precio,
      categorias_ids:    categoriasTemporales.map((c) => c.id_cat),
      subcategorias_ids: subcategoriasTemporales.map((s) => s.id_subcat)
    };

    try {
      if (modo === "create") {
        await crearProductoAPI(payload);
      } else {
        await editarProductoAPI(idEditando, payload);
      }

      productosCache = await getProductosAPI();
      renderTabla(inputBuscar ? inputBuscar.value : "");
      resetFormulario();
      $(modalRegistro).modal("hide");
    } catch (err) {
      alert(`Error al guardar: ${err.message}`);
    }
  }

  async function eliminarProducto(idProducto, folio) {
    if (!confirm(`¿Eliminar el producto ${folio}?`)) return;
    try {
      await eliminarProductoAPI(idProducto);
      productosCache = await getProductosAPI();
      renderTabla(inputBuscar ? inputBuscar.value : "");
    } catch (err) {
      alert(`Error al eliminar: ${err.message}`);
    }
  }

  function actualizarEncabezadosVentanas() {
    const codigo      = norm(inpCodigo ? inpCodigo.value : "") || "Nuevo producto";
    const descripcion = norm(inpDescripcion ? inpDescripcion.value : "") || "Sin definir";
    if (catProductoCodigo)      catProductoCodigo.textContent      = codigo;
    if (catProductoDescripcion) catProductoDescripcion.textContent = descripcion;
    if (subProductoCodigo)      subProductoCodigo.textContent      = codigo;
    if (subProductoDescripcion) subProductoDescripcion.textContent = descripcion;
  }

  function actualizarResumenCategorias() {
    if (!resumenCategoriasProducto) return;
    const n = categoriasTemporales.length;
    resumenCategoriasProducto.textContent = `${n} ${n === 1 ? "categoría registrada" : "categorías registradas"}`;
  }

  function actualizarResumenSubcategorias() {
    if (!resumenSubcategoriasProducto) return;
    const n = subcategoriasTemporales.length;
    resumenSubcategoriasProducto.textContent = `${n} ${n === 1 ? "subcategoría registrada" : "subcategorías registradas"}`;
  }

  function renderCategoriasTemporales() {
    if (!listaCategoriasProducto) return;
    if (categoriasTemporales.length === 0) {
      listaCategoriasProducto.innerHTML = `<div class="text-muted small">No hay categorías agregadas.</div>`;
      actualizarResumenCategorias();
      return;
    }
    listaCategoriasProducto.innerHTML = `
      <div>
        ${categoriasTemporales.map((cat, i) => `
          <span class="badge badge-primary mr-1 mb-1 p-2" style="font-size:0.85rem;">
            ${cat.nombre}
            <button type="button" class="btn-quitar-categoria-producto ml-1"
              data-index="${i}" title="Quitar"
              style="background:none;border:none;color:#fff;cursor:pointer;padding:0;line-height:1;">&times;</button>
          </span>
        `).join("")}
      </div>
    `;
    actualizarResumenCategorias();
  }

  function renderSubcategoriasTemporales() {
    if (!listaSubcategoriasProducto) return;
    if (subcategoriasTemporales.length === 0) {
      listaSubcategoriasProducto.innerHTML = `<div class="text-muted small">No hay subcategorías agregadas.</div>`;
      actualizarResumenSubcategorias();
      return;
    }
    listaSubcategoriasProducto.innerHTML = `
      <div class="table-responsive">
        <table class="table table-bordered table-sm mb-0">
          <thead class="thead-light">
            <tr>
              <th>Nombre</th>
              <th>Valor</th>
              <th>Unidad</th>
              <th style="width:80px;">Acción</th>
            </tr>
          </thead>
          <tbody>
            ${subcategoriasTemporales.map((sub, i) => `
              <tr>
                <td>${sub.nombre}</td>
                <td>${sub.valor_numerico}</td>
                <td>${sub.unidad}</td>
                <td>
                  <button type="button" class="btn btn-danger btn-sm btn-quitar-subcategoria"
                    data-index="${i}">Quitar</button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
    actualizarResumenSubcategorias();
  }

  function resetFormulario() {
    if (form) form.reset();
    categoriasTemporales    = [];
    subcategoriasTemporales = [];
    idEditando              = null;
    modo                    = "create";
    if (inpCodigo)              inpCodigo.disabled = false;
    if (selectCategoriaProducto) selectCategoriaProducto.value = "";
    if (selectNuevaSubcategoria) selectNuevaSubcategoria.value = "";
    if (selectValorSubcategoria) selectValorSubcategoria.innerHTML = '<option value="">Elegir valor...</option>';
    if (inpUnidadSubcategoria)   inpUnidadSubcategoria.value = "";
    renderCategoriasTemporales();
    renderSubcategoriasTemporales();
    actualizarEncabezadosVentanas();
    if (tituloModal) tituloModal.textContent = "Registrar Nuevo Producto";
    if (btnGuardar)  btnGuardar.textContent  = "Guardar Producto";
  }

  function cerrarVentanaCategorias() {
    if (modalCategorias) modalCategorias.style.display = "none";
  }

  function cerrarVentanaSubcategorias() {
    if (modalSubcategorias) modalSubcategorias.style.display = "none";
  }

  if (btnAbrirCategoriasProducto) {
    btnAbrirCategoriasProducto.addEventListener("click", () => {
      actualizarEncabezadosVentanas();
      renderCategoriasTemporales();
      if (modalCategorias) modalCategorias.style.display = "flex";
    });
  }

  if (btnCerrarCategorias)  btnCerrarCategorias.addEventListener("click",  cerrarVentanaCategorias);
  if (btnCerrarCategoriasX) btnCerrarCategoriasX.addEventListener("click", cerrarVentanaCategorias);

  if (btnAgregarCategoriaProducto) {
    btnAgregarCategoriaProducto.addEventListener("click", () => {
      const idCat = norm(selectCategoriaProducto.value);
      if (!idCat) {
        alert("Selecciona una categoría");
        return;
      }
      const opt    = selectCategoriaProducto.options[selectCategoriaProducto.selectedIndex];
      const nombre = opt.textContent;

      if (categoriasTemporales.some((c) => String(c.id_cat) === idCat)) {
        alert("Esa categoría ya fue agregada");
        return;
      }

      categoriasTemporales.push({ id_cat: Number(idCat), nombre });
      renderCategoriasTemporales();
      selectCategoriaProducto.value = "";
    });
  }

  if (listaCategoriasProducto) {
    listaCategoriasProducto.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-quitar-categoria-producto");
      if (!btn) return;
      const i = Number(btn.getAttribute("data-index"));
      categoriasTemporales.splice(i, 1);
      renderCategoriasTemporales();
    });
  }

  if (btnAbrirSubcategorias) {
    btnAbrirSubcategorias.addEventListener("click", () => {
      actualizarEncabezadosVentanas();
      renderSubcategoriasTemporales();
      if (modalSubcategorias) modalSubcategorias.style.display = "flex";
    });
  }

  if (btnCerrarSubcategorias)  btnCerrarSubcategorias.addEventListener("click",  cerrarVentanaSubcategorias);
  if (btnCerrarSubcategoriasX) btnCerrarSubcategoriasX.addEventListener("click", cerrarVentanaSubcategorias);

  if (selectNuevaSubcategoria) {
    selectNuevaSubcategoria.addEventListener("change", () => {
      const idSubcat = norm(selectNuevaSubcategoria.value);
      if (selectValorSubcategoria) selectValorSubcategoria.innerHTML = '<option value="">Elegir valor...</option>';
      if (inpUnidadSubcategoria)   inpUnidadSubcategoria.value = "";

      if (!idSubcat) return;

      const sub = catalogoSubcats.find((s) => String(campo(s, "id_subcat", "id")) === idSubcat);
      if (!sub) return;

      const valor  = campo(sub, "valor_numerico", "valor");
      const unidad = campo(sub, "unidad");

      if (selectValorSubcategoria) {
        selectValorSubcategoria.innerHTML = `
          <option value="">Elegir valor...</option>
          <option value="${valor}">${valor}</option>
        `;
      }
      if (inpUnidadSubcategoria) inpUnidadSubcategoria.value = unidad;
    });
  }

  if (btnAgregarSubcategoria) {
    btnAgregarSubcategoria.addEventListener("click", () => {
      const idSubcat = norm(selectNuevaSubcategoria ? selectNuevaSubcategoria.value : "");
      const valorSel = norm(selectValorSubcategoria ? selectValorSubcategoria.value : "");

      if (!idSubcat) {
        alert("Selecciona una subcategoría");
        return;
      }
      if (!valorSel) {
        alert("Selecciona un valor");
        return;
      }

      const sub = catalogoSubcats.find((s) => String(campo(s, "id_subcat", "id")) === idSubcat);
      if (!sub) {
        alert("Subcategoría no encontrada");
        return;
      }
      if (subcategoriasTemporales.some((s) => String(s.id_subcat) === idSubcat)) {
        alert("Esa subcategoría ya fue agregada");
        return;
      }

      subcategoriasTemporales.push({
        id_subcat:      campo(sub, "id_subcat", "id"),
        nombre:         campo(sub, "nombre"),
        valor_numerico: campo(sub, "valor_numerico", "valor"),
        unidad:         campo(sub, "unidad")
      });

      renderSubcategoriasTemporales();
      if (selectNuevaSubcategoria)  selectNuevaSubcategoria.value  = "";
      if (selectValorSubcategoria)  selectValorSubcategoria.innerHTML = '<option value="">Elegir valor...</option>';
      if (inpUnidadSubcategoria)    inpUnidadSubcategoria.value    = "";
    });
  }

  if (listaSubcategoriasProducto) {
    listaSubcategoriasProducto.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-quitar-subcategoria");
      if (!btn) return;
      const i = Number(btn.getAttribute("data-index"));
      subcategoriasTemporales.splice(i, 1);
      renderSubcategoriasTemporales();
    });
  }

  if (btnGuardar) {
    btnGuardar.addEventListener("click", (e) => {
      e.preventDefault();
      guardarProducto();
    });
  }

  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      const idProducto = tr.getAttribute("data-id");
      if (!idProducto) return;

      if (e.target.closest(".btn-detalle")) {
        await abrirDetalle(idProducto);
        return;
      }

      if (e.target.closest(".btn-editar")) {
        await abrirEditar(idProducto);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        const producto = productosCache.find((p) => String(p.id_producto) === idProducto);
        const folio    = producto ? producto.folio : idProducto;
        await eliminarProducto(idProducto, folio);
      }
    });
  }

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => {
      renderTabla(inputBuscar.value);
    });
  }

  $(modalRegistro).on("show.bs.modal", function () {
    if (modo !== "edit") resetFormulario();
  });

  $(modalRegistro).on("hidden.bs.modal", function () {
    resetFormulario();
  });

  async function cargarDatosIniciales() {
    try {
      await Promise.all([cargarCategorias(), cargarSubcategorias()]);
      await cargarProductos();
    } catch (err) {
      console.error("Error en carga inicial:", err.message);
    }
  }

  cargarDatosIniciales();
});
