const API_BASE = "http://146.190.165.82";

let productos = [];
let categoriasDisponibles = [];

let categoriasTemporales = [];

let modo = "create";
let idProductoEditando = null;
let productoOriginal = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarProductos();
    cargarCategorias();

    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
    const esEmpleado = (usuario.rol || "").toLowerCase() === "empleado";

    if (esEmpleado) {
        const btnNuevo = document.getElementById("btnNuevoProducto");
        const btnCargaMasiva = document.getElementById("btnCargaMasiva");
        const btnDescargarPlantilla = document.getElementById("btnDescargarPlantilla");
        if (btnNuevo) btnNuevo.style.display = "none";
        if (btnCargaMasiva) btnCargaMasiva.style.display = "none";
        if (btnDescargarPlantilla) btnDescargarPlantilla.style.display = "none";
    }

    const btnGuardarProducto = document.getElementById("btnGuardarProducto");
    const buscarProductos = document.getElementById("buscarProductos");
    const btnAbrirCategoriasProducto = document.getElementById("btnAbrirCategoriasProducto");
    const btnCerrarCategorias = document.getElementById("btnCerrarCategorias");
    const btnCerrarCategoriasX = document.getElementById("btnCerrarCategoriasX");
    const btnAgregarCategoriaProducto = document.getElementById("btnAgregarCategoriaProducto");
    const btnDescargarPlantilla = document.getElementById("btnDescargarPlantilla");
    const btnCargaMasiva = document.getElementById("btnCargaMasiva");

    if (btnGuardarProducto) {
        btnGuardarProducto.addEventListener("click", guardarProducto);
    }

    if (buscarProductos) {
        buscarProductos.addEventListener("input", filtrarProductos);
    }

    if (btnAbrirCategoriasProducto) {
        btnAbrirCategoriasProducto.addEventListener("click", abrirModalCategorias);
    }

    if (btnCerrarCategorias) {
        btnCerrarCategorias.addEventListener("click", cerrarModalCategorias);
    }

    if (btnCerrarCategoriasX) {
        btnCerrarCategoriasX.addEventListener("click", cerrarModalCategorias);
    }

    if (btnAgregarCategoriaProducto) {
        btnAgregarCategoriaProducto.addEventListener("click", agregarCategoriaTemporal);
    }
    if (btnDescargarPlantilla) {
        btnDescargarPlantilla.addEventListener("click", descargarPlantillaProductos);
    }

    if (btnCargaMasiva) {
        btnCargaMasiva.addEventListener("click", cargarProductosMasivamente);
    }

    const margenInputs = ["margen1Prod", "margen2Prod", "margen3Prod"];
    margenInputs.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener("input", recalcularPrecios);
    });

    const costoProd = document.getElementById("costoProd");
    if (costoProd) {
        costoProd.addEventListener("input", recalcularPrecios);
    }

    const monedaProd = document.getElementById("monedaProd");
    if (monedaProd) {
        monedaProd.addEventListener("change", recalcularPrecios);
    }

    $("#modalNuevoProducto").on("hidden.bs.modal", limpiarFormularioProducto);
});


function alertaExito(mensaje) {
    Swal.fire({
        icon: "success",
        title: "Correcto",
        text: mensaje || "Operación realizada correctamente",
        confirmButtonColor: "#28a745"
    });
}

function alertaError(mensaje) {
    Swal.fire({
        icon: "error",
        title: "Error",
        text: mensaje || "Ocurrió un error",
        confirmButtonColor: "#d33"
    });
}

function alertaInfo(mensaje) {
    Swal.fire({
        icon: "info",
        title: "Aviso",
        text: mensaje || "Revisa la información",
        confirmButtonColor: "#3085d6"
    });
}

function alertaCargando(mensaje) {
    Swal.fire({
        title: mensaje || "Procesando...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
    });
}

async function confirmarAccion(mensaje) {
    const result = await Swal.fire({
      icon: "warning",
      title: "¿Estás seguro?",
      text: mensaje || "Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Sí, continuar",
      cancelButtonText: "Cancelar",
      reverseButtons: true
    });

    return result.isConfirmed;
}


async function fetchBackend(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
        ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    if (options.auth === false) {
      delete headers["Authorization"];
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers
    });

    let result = null;

    try {
        result = await response.json();
    } catch {
        result = null;
    }

    if (!response.ok || (result && result.success === false)) {
      if (response.status === 401 || response.status === 403 || (result?.message || "Error en la petición." && String(result?.message || "Error en la petición.").toLowerCase().includes('token'))) {
        Swal.fire({
          icon: 'warning',
          title: 'Sesión expirada o inválida',
          text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
          confirmButtonText: 'Entendido'
        });
      }
      throw new Error(result?.message || "Error en la petición.");
    }

    return result;
}


async function cargarProductos() {
    try {
        const result = await fetchBackend("/api/productos/", { auth: false });
        productos = result.data || [];
        renderizarProductos(productos);
    } catch (error) {
        alertaError(error.message || "Error al cargar productos.");
    }
}


async function cargarCategorias() {
    try {
        const result = await fetchBackend("/api/categorias/", { auth: false });
        categoriasDisponibles = result.data || [];

        llenarSelectCategorias("selectCategoriaProducto");
        llenarSelectCategorias("categoriaCargaMasiva");

    } catch (error) {
        console.warn("No se pudieron cargar categorías:", error.message);
    }
}

function llenarSelectCategorias(idSelect) {
    const select = document.getElementById(idSelect);
    if (!select) return;

    select.innerHTML = `<option value="">Elegir categoría...</option>`;

    categoriasDisponibles.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.id_cat || cat.id_categoria || cat.id;
        option.textContent = cat.nombre || cat.descripcion || "Categoría";
        select.appendChild(option);
    });
}


async function cargarSubcategorias() {
    try {
        const result = await fetchBackend("/api/subcategorias/", { auth: false });
        subcategoriasDisponibles = result.data || [];

        const select = document.getElementById("selectNuevaSubcategoria");
        if (!select) return;

        select.innerHTML = `<option value="">Elegir subcategoría...</option>`;

        subcategoriasDisponibles.forEach((sub) => {
            const option = document.createElement("option");
            option.value = sub.id_subcat || sub.id_subcategoria || sub.id;
            option.textContent = sub.nombre || sub.descripcion || "Subcategoría";
            select.appendChild(option);
        });

    } catch (error) {
        console.warn("No se pudieron cargar subcategorías:", error.message);
    }
}


function renderizarProductos(lista) {
    const tbody = document.querySelector("#dataTable tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!lista || lista.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center">No hay productos registrados</td>
            </tr>
        `;
        return;
    }

    const usuario = JSON.parse(localStorage.getItem("usuarioLogueado") || "{}");
    const esEmpleado = (usuario.rol || "").toLowerCase() === "empleado";

    lista.forEach((producto) => {
        tbody.innerHTML += `
            <tr>
                <td>${producto.clave || producto.folio || ""}</td>
                <td>${producto.descripcion || ""}</td>
                <td>${formatoMoneda(producto.costo || 0)} ${producto.moneda || "MXN"}</td>
                <td>${obtenerCategoriasTexto(producto)}</td>
                <td>
                      <div class="d-flex justify-content-center align-items-center flex-nowrap">
                        <button class="btn btn-info btn-sm btn-circle mx-1" onclick="verDetalleProducto(${producto.id_producto})">
                          <i class="fas fa-eye"></i>
                        </button>
  
                          ${!esEmpleado ? `
                          <button class="btn btn-warning btn-sm btn-circle mx-1" onclick="abrirEditarProducto(${producto.id_producto})">
                            <i class="fas fa-edit"></i>
                          </button>
  
                          <button class="btn btn-danger btn-sm btn-circle mx-1" onclick="eliminarProducto(${producto.id_producto})">
                            <i class="fas fa-trash"></i>
                          </button>
                          ` : ''}
                        </div>
                    </td>
            </tr>
        `;
    });
}

function obtenerCategoriasTexto(producto) {
    if (!producto.categorias || !Array.isArray(producto.categorias)) return "";
    return producto.categorias.map((cat) => cat.nombre).join(", ");
}

function filtrarProductos() {
    const texto = document.getElementById("buscarProductos")?.value.toLowerCase() || "";

    const filtrados = productos.filter((producto) => {
        return (
            String(producto.clave || producto.folio || "").toLowerCase().includes(texto) ||
            String(producto.descripcion || "").toLowerCase().includes(texto) ||
            obtenerCategoriasTexto(producto).toLowerCase().includes(texto)
        );
    });

    renderizarProductos(filtrados);
}


async function guardarProducto() {
    const folio = document.getElementById("codigoProd")?.value.trim();
    const descripcion = document.getElementById("descripcionProd")?.value.trim();
    const costo = Number(document.getElementById("costoProd")?.value || 0);
    const moneda = document.getElementById("monedaProd")?.value || "MXN";

    const m1 = Number(document.getElementById("margen1Prod")?.value) || null;
    const m2 = Number(document.getElementById("margen2Prod")?.value) || null;
    const m3 = Number(document.getElementById("margen3Prod")?.value) || null;
    const margenes = [m1, m2, m3].filter((m) => m !== null);

    const payload = {
        descripcion,
        costo,
        moneda,
        margenes,
        categorias_ids: categoriasTemporales.map((cat) => Number(cat.id_cat))
    };

    if (modo === "create") {
        payload.folio = folio;
    } else if (modo === "edit" && productoOriginal) {
        if (productoOriginal.descripcion === payload.descripcion) delete payload.descripcion;
        if (Number(productoOriginal.costo) === payload.costo) delete payload.costo;
        if ((productoOriginal.moneda || "MXN") === payload.moneda) delete payload.moneda;
        
        const margenesOrig = (productoOriginal.margenes || []).slice().sort().join(",");
        const margenesNew = margenes.slice().sort().join(",");
        if (margenesOrig === margenesNew) delete payload.margenes;
        
        const catOriginalesStr = (productoOriginal.categorias || []).map(cat => cat.id_cat || cat.id_categoria || cat.id).sort().join(",");
        const catNuevasStr = payload.categorias_ids.slice().sort().join(",");
        if (catOriginalesStr === catNuevasStr) {
            delete payload.categorias_ids;
        }
        
        // Asume que la api espera clave en su lugar si la base la tiene como folio o clave (usualmente es folio o clave dependiendo)
        const claveOriginal = productoOriginal.clave || productoOriginal.folio;
        if (folio && claveOriginal !== folio) {
            payload.folio = folio; // Permitir edición y enviarlo si cambia
        }

        if (Object.keys(payload).length === 0) {
            Swal.fire({ icon: "warning", title: "Sin cambios", text: "No se hicieron modificaciones." });
            return;
        }
    }

    try {
        alertaCargando("Guardando producto...");

        let endpoint = "/api/productos/";
        let method = "POST";

        if (modo === "edit" && idProductoEditando) {
            endpoint = `/api/productos/${idProductoEditando}`;
            method = "PUT";
        }

        const result = await fetchBackend(endpoint, {
            method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        Swal.close();
        alertaExito(result.message || "Producto guardado correctamente.");

        $("#modalNuevoProducto").modal("hide");
        limpiarFormularioProducto();
        cargarProductos();

    } catch (error) {
        Swal.close();
        alertaError(error.message || "Error al guardar producto.");
    }
}


async function abrirEditarProducto(idProducto) {
    try {
        const result = await fetchBackend(`/api/productos/${idProducto}`, { auth: false });
        const producto = result.data;

        modo = "edit";
        idProductoEditando = idProducto;
        productoOriginal = producto;

        setValue("codigoProd", producto.clave || producto.folio || "");
        setValue("descripcionProd", producto.descripcion || "");
        setValue("costoProd", producto.costo || "");

        const selectMoneda = document.getElementById("monedaProd");
        if (selectMoneda) selectMoneda.value = producto.moneda || "MXN";

        const margenes = Array.isArray(producto.margenes) ? producto.margenes : [];
        setValue("margen1Prod", margenes[0] ?? "");
        setValue("margen2Prod", margenes[1] ?? "");
        setValue("margen3Prod", margenes[2] ?? "");
        recalcularPrecios();

        categoriasTemporales = (producto.categorias || []).map((cat) => ({
            id_cat: cat.id_cat || cat.id_categoria || cat.id,
            nombre: cat.nombre || cat.descripcion || "Categoría"
        }));
        actualizarResumenCategorias();        renderizarCategoriasTemporales();
        document.getElementById("tituloModal").textContent = "Editar Producto";
        $("#modalNuevoProducto").modal("show");

    } catch (error) {
        alertaError(error.message || "Error al obtener producto.");
    }
}


async function eliminarProducto(idProducto) {
    const confirmado = await confirmarAccion("El producto será eliminado. También se eliminarán todos los inventarios asociados a este producto.");

    if (!confirmado) return;

    try {
        alertaCargando("Eliminando producto...");

        const result = await fetchBackend(`/api/productos/${idProducto}`, {
            method: "DELETE"
        });

        Swal.close();
        alertaExito(result.message || "Producto eliminado correctamente.");
        cargarProductos();

    } catch (error) {
        Swal.close();
        alertaError(error.message || "Error al eliminar producto.");
    }
}


async function verDetalleProducto(idProducto) {
    try {
        const result = await fetchBackend(`/api/productos/${idProducto}`, { auth: false });
        const producto = result.data;

        setText("detalleCodigo", producto.clave || producto.folio || "");
        setText("detalleDescripcion", producto.descripcion || "");
        setText("detalleCosto", `${formatoMoneda(producto.costo ?? 0)} ${producto.moneda || "MXN"}`);
        setText("detalleMoneda", producto.moneda || "MXN");
        const precios = Array.isArray(producto.precios) ? producto.precios : [];
        const contPrecios = document.getElementById("detallePrecios");
        if (contPrecios) {
            if (precios.length > 0) {
                contPrecios.innerHTML = precios.map((p, i) =>
                    `<div><strong>Precio ${i + 1}:</strong> ${formatoMoneda(p)}</div>`
                ).join("");
            } else {
                contPrecios.innerHTML = '<span class="text-muted">Sin precios configurados</span>';
            }
        }
        setText("detalleCategorias", obtenerCategoriasTexto(producto));
        $("#modalDetalleProducto").modal("show");

    } catch (error) {
        alertaError(error.message || "Error al obtener detalle del producto.");
    }
}


function abrirModalCategorias() {
    setText("catProductoCodigo", document.getElementById("codigoProd")?.value || "Nuevo producto");
    setText("catProductoDescripcion", document.getElementById("descripcionProd")?.value || "Sin definir");

    renderizarCategoriasTemporales();

    const modal = document.getElementById("modalCategoriasProducto");
    if (modal) modal.style.display = "flex";
}

function cerrarModalCategorias() {
    const modal = document.getElementById("modalCategoriasProducto");
    if (modal) modal.style.display = "none";
}

function agregarCategoriaTemporal() {
    const select = document.getElementById("selectCategoriaProducto");
    const idCat = select?.value;

    if (!idCat) {
        alertaInfo("Selecciona una categoría.");
        return;
    }

    const existe = categoriasTemporales.some((cat) => String(cat.id_cat) === String(idCat));

    if (existe) {
        alertaInfo("La categoría ya fue agregada.");
        return;
    }

    const optionText = select.options[select.selectedIndex].textContent;

    categoriasTemporales.push({
        id_cat: Number(idCat),
        nombre: optionText
    });

    select.value = "";

    actualizarResumenCategorias();
    renderizarCategoriasTemporales();
}

function eliminarCategoriaTemporal(idCat) {
    categoriasTemporales = categoriasTemporales.filter((cat) => String(cat.id_cat) !== String(idCat));
    actualizarResumenCategorias();
    renderizarCategoriasTemporales();
}

function renderizarCategoriasTemporales() {
    const contenedor = document.getElementById("listaCategoriasProducto");
    if (!contenedor) return;

    if (categoriasTemporales.length === 0) {
        contenedor.innerHTML = `<p class="text-muted mb-0">No hay categorías agregadas.</p>`;
        return;
    }

    contenedor.innerHTML = categoriasTemporales.map((cat) => `
        <span class="badge badge-primary p-2 mr-2 mb-2">
            ${cat.nombre}
            <button type="button" class="btn btn-sm text-white p-0 ml-2" onclick="eliminarCategoriaTemporal(${cat.id_cat})">
                ×
            </button>
        </span>
    `).join("");
}

function actualizarResumenCategorias() {
    setText("resumenCategoriasProducto", `${categoriasTemporales.length} categorías registradas`);
}

function recalcularPrecios() {
    const costo = Number(document.getElementById("costoProd")?.value || 0);
    const moneda = document.getElementById("monedaProd")?.value || "MXN";

    for (let i = 1; i <= 3; i++) {
      const margen = Number(document.getElementById(`margen${i}Prod`)?.value) || 0;
      const el = document.getElementById(`precio${i}Calc`);
      if (!el) continue;
      if (costo > 0 && margen > 0 && margen < 100) {
        const precio = costo / (1 - margen / 100);
        el.textContent = `${formatoMoneda(precio)} ${moneda}`;
      } else {
        el.textContent = "$0.00";
      }
    }
  }


function abrirModalSubcategorias() {
    setText("subProductoCodigo", document.getElementById("codigoProd")?.value || "Nuevo producto");
    setText("subProductoDescripcion", document.getElementById("descripcionProd")?.value || "Sin definir");
    const modal = document.getElementById("modalSubcategoriasProducto");
    if (modal) modal.style.display = "flex";
}

function cerrarModalSubcategorias() {
    const modal = document.getElementById("modalSubcategoriasProducto");
    if (modal) modal.style.display = "none";
}

function cargarValoresSubcategoriaSeleccionada() {
    const idSub = document.getElementById("selectNuevaSubcategoria")?.value;
    const selectValor = document.getElementById("valorSubcategoria");
    const inputUnidad = document.getElementById("unidadSubcategoria");

    if (!selectValor || !inputUnidad) return;

    selectValor.innerHTML = `<option value="">Elegir valor...</option>`;
    inputUnidad.value = "";

    const sub = subcategoriasDisponibles.find((item) => {
        return String(item.id_subcat || item.id_subcategoria || item.id) === String(idSub);
    });

    if (!sub) return;

    if (sub.valor_numerico !== undefined && sub.valor_numerico !== null) {
        const option = document.createElement("option");
        option.value = sub.valor_numerico;
        option.textContent = sub.valor_numerico;
        selectValor.appendChild(option);
    }

    if (sub.valor !== undefined && sub.valor !== null) {
        const option = document.createElement("option");
        option.value = sub.valor;
        option.textContent = sub.valor;
        selectValor.appendChild(option);
    }

    inputUnidad.value = sub.unidad || "";
}

function agregarSubcategoriaTemporal() {
    const selectSub = document.getElementById("selectNuevaSubcategoria");
    const selectValor = document.getElementById("valorSubcategoria");
    const unidad = document.getElementById("unidadSubcategoria")?.value || "";

    const idSub = selectSub?.value;
    const valor = selectValor?.value;

    if (!idSub) {
        alertaInfo("Selecciona una subcategoría.");
        return;
    }

    const existe = subcategoriasTemporales.some((sub) => String(sub.id_subcat) === String(idSub));

    if (existe) {
        alertaInfo("La subcategoría ya fue agregada.");
        return;
    }

    const nombre = selectSub.options[selectSub.selectedIndex].textContent;

    subcategoriasTemporales.push({
        id_subcat: Number(idSub),
        nombre,
        valor_numerico: valor,
        unidad
    });

    selectSub.value = "";
    selectValor.innerHTML = `<option value="">Elegir valor...</option>`;
    document.getElementById("unidadSubcategoria").value = "";}

function eliminarSubcategoriaTemporal(idSub) {
    subcategoriasTemporales = subcategoriasTemporales.filter((sub) => String(sub.id_subcat) !== String(idSub));}

function renderizarSubcategoriasTemporales() {
    const contenedor = document.getElementById("listaSubcategoriasProducto");
    if (!contenedor) return;

    if (subcategoriasTemporales.length === 0) {
        contenedor.innerHTML = `<p class="text-muted mb-0">No hay subcategorías agregadas.</p>`;
        return;
    }

    contenedor.innerHTML = subcategoriasTemporales.map((sub) => `
        <span class="badge badge-success p-2 mr-2 mb-2">
            ${sub.nombre} ${sub.valor_numerico || ""} ${sub.unidad || ""}
            <button type="button" class="btn btn-sm text-white p-0 ml-2" onclick="eliminarSubcategoriaTemporal(${sub.id_subcat})">
                ×
            </button>
        </span>
    `).join("");
}

function actualizarResumenSubcategorias() {
    setText("resumenSubcategoriasProducto", `${subcategoriasTemporales.length} subcategorías registradas`);
}


async function descargarPlantillaProductos() {
    const idCategoria = document.getElementById("categoriaCargaMasiva")?.value;

    if (!idCategoria) {
        alertaInfo("Selecciona una categoría para descargar la plantilla.");
        return;
    }

    try {
        alertaCargando("Generando plantilla...");

        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/productos/plantilla/${idCategoria}`, {
            headers: token ? { "Authorization": `Bearer ${token}` } : {}
        });

        if (!response.ok) {
            let result = null;

            try {
                result = await response.json();
            } catch {
                result = null;
            }

            if (response.status === 401 || response.status === 403 || String(result?.message).toLowerCase().includes('token')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sesión expirada o inválida',
                    text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
                    confirmButtonText: 'Entendido'
                });
                return;
            }

            Swal.close();
            alertaError(result?.message || "Error al generar la plantilla.");
            return;
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const link = document.createElement("a");
        link.href = url;
        link.download = `plantilla_productos_categoria_${idCategoria}.xlsx`;
        document.body.appendChild(link);
        link.click();

        link.remove();
        window.URL.revokeObjectURL(url);

        Swal.close();
        alertaExito("Plantilla descargada correctamente.");

    } catch (error) {
        console.error("Error:", error);
        Swal.close();
        alertaError("Error al conectar con el servidor.");
    }
}


async function cargarProductosMasivamente() {
    const idCategoria = document.getElementById("categoriaCargaMasiva")?.value;
    const inputArchivo = document.getElementById("archivoCargaMasiva");
    const archivo = inputArchivo?.files[0];

    if (!idCategoria) {
        alertaInfo("Selecciona una categoría.");
        return;
    }

    if (!archivo) {
        alertaInfo("Selecciona un archivo Excel.");
        return;
    }

    const formData = new FormData();
    formData.append("archivo", archivo);

    try {
        alertaCargando("Cargando productos...");

        const token = localStorage.getItem("token");
        const response = await fetch(`${API_BASE}/api/productos/carga-masiva/${idCategoria}`, {
            method: "POST",
            headers: token ? { "Authorization": `Bearer ${token}` } : {},
            body: formData
        });

        let result = null;

        try {
            result = await response.json();
        } catch {
            result = null;
        }

        Swal.close();

        if (!response.ok || result?.success === false) {
            if (response.status === 401 || response.status === 403 || String(result?.message).toLowerCase().includes('token')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sesión expirada o inválida',
                    text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
                    confirmButtonText: 'Entendido'
                });
                return;
            }
            alertaError(result?.message || "Error al cargar productos.");
            return;
        }

        alertaExito(result?.message || "Productos cargados correctamente.");

        inputArchivo.value = "";
        cargarProductos();

    } catch (error) {
        console.error("Error:", error);
        Swal.close();
        alertaError("Error al conectar con el servidor.");
    }
}


function limpiarFormularioProducto() {
    modo = "create";
    idProductoEditando = null;

    setValue("codigoProd", "");
    setValue("descripcionProd", "");
    setValue("costoProd", "");

    const selectMoneda = document.getElementById("monedaProd");
    if (selectMoneda) selectMoneda.value = "MXN";

    setValue("margen1Prod", "");
    setValue("margen2Prod", "");
    setValue("margen3Prod", "");
    recalcularPrecios();

    categoriasTemporales = [];
    actualizarResumenCategorias();    renderizarCategoriasTemporales();
    const inputCodigo = document.getElementById("codigoProd");
    if (inputCodigo) inputCodigo.disabled = false;

    const titulo = document.getElementById("tituloModal");
    if (titulo) titulo.textContent = "Registrar Nuevo Producto";
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}

function formatoMoneda(valor) {
    return Number(valor || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}

window.cargarProductos = cargarProductos;
window.abrirEditarProducto = abrirEditarProducto;
window.eliminarProducto = eliminarProducto;
window.verDetalleProducto = verDetalleProducto;
window.eliminarCategoriaTemporal = eliminarCategoriaTemporal;
window.descargarPlantillaProductos = descargarPlantillaProductos;
window.cargarProductosMasivamente = cargarProductosMasivamente;
