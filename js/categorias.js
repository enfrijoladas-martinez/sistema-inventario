document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "http://146.190.165.82";

  const btnGuardar = document.getElementById("btnGuardarCategoria");
  const form = document.getElementById("formularioCategoria");
  const tbody = document.querySelector("#dataTable tbody");
  const inputBuscar = document.getElementById("buscarCategoria");
  const inpNombre = document.getElementById("nombreCategoria");
  const tituloModal = document.getElementById("tituloModal");
  const modalRegistro = "#modalNuevaCategoria";

  let modo = "create";
  let idEditando = null;
  let categoriasCache = [];

  const norm = (v) => (v ?? "").toString().trim();

  async function apiFetch(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { "Authorization": `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers,
      ...options
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(data?.message || "Error en la petición");
    }

    if (data?.success === false) {
      throw new Error(data?.message || "Operación fallida");
    }

    return data;
  }

  async function getCategoriasAPI() {
    const res = await apiFetch("/api/categorias/");
    return Array.isArray(res.data) ? res.data : [];
  }

  async function crearCategoriaAPI(payload) {
    return await apiFetch("/api/categorias/", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }

  async function editarCategoriaAPI(id, payload) {
    return await apiFetch(`/api/categorias/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  }

  async function eliminarCategoriaAPI(id) {
    return await apiFetch(`/api/categorias/${id}`, {
      method: "DELETE"
    });
  }

  function showSuccess(texto) {
    return Swal.fire({ icon: "success", title: "Éxito", text: texto, confirmButtonText: "Aceptar" });
  }

  function showError(texto) {
    return Swal.fire({ icon: "error", title: "Error", text: texto, confirmButtonText: "Aceptar" });
  }

  function showWarning(texto) {
    return Swal.fire({ icon: "warning", title: "Atención", text: texto, confirmButtonText: "Aceptar" });
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

  function renderTabla(filtro = "") {
    const f = norm(filtro).toLowerCase();
    const lista = !f ? categoriasCache : categoriasCache.filter((c) => norm(c.nombre).toLowerCase().includes(f));

    if (lista.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted">Sin categorías registradas.</td></tr>`;
      return;
    }

    tbody.innerHTML = lista.map((c) => `
      <tr data-id="${c.id_cat || c.id_categoria}">
        <td>${c.id_cat || c.id_categoria}</td>
        <td>${c.nombre}</td>
        <td>
          <button type="button" class="btn btn-warning btn-circle btn-sm btn-editar" title="Editar"><i class="fas fa-pen"></i></button>
          <button type="button" class="btn btn-danger btn-circle btn-sm btn-eliminar" title="Eliminar"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join("");
  }

  function resetFormulario() {
    if (form) form.reset();
    modo = "create";
    idEditando = null;
    tituloModal.textContent = "Nueva Categoría";
    btnGuardar.textContent = "Guardar Categoría";
  }

  function abrirEditar(categoria) {
    modo = "edit";
    idEditando = categoria.id_cat || categoria.id_categoria;
    inpNombre.value = categoria.nombre || "";
    tituloModal.textContent = `Editar Categoría`;
    btnGuardar.textContent = "Guardar Cambios";
    $(modalRegistro).modal("show");
  }

  async function refrescarCategorias() {
    categoriasCache = await getCategoriasAPI();
    renderTabla(inputBuscar ? inputBuscar.value : "");
  }

  if (btnGuardar) {
    btnGuardar.addEventListener("click", async (e) => {
      e.preventDefault();

      const nombre = norm(inpNombre.value);
      const payload = { nombre };

      try {
        if (modo === "create") {
          const res = await crearCategoriaAPI({ nombre });
          await showSuccess(res?.message || "Categoría creada correctamente");
        } else {
          const res = await editarCategoriaAPI(idEditando, { nombre });
          await showSuccess(res?.message || "Categoría actualizada correctamente");
        }

        await refrescarCategorias();
        resetFormulario();
        $(modalRegistro).modal("hide");
      } catch (error) {
        await showError(error.message || "Error al guardar la categoría");
      }
    });
  }

  if (tbody) {
    tbody.addEventListener("click", async (e) => {
      const tr = e.target.closest("tr");
      if (!tr) return;

      const id = Number(tr.getAttribute("data-id"));
      const categoria = categoriasCache.find((c) => Number(c.id_cat || c.id_categoria) === id);
      if (!categoria) return;

      if (e.target.closest(".btn-editar")) {
        abrirEditar(categoria);
        return;
      }

      if (e.target.closest(".btn-eliminar")) {
        const confirmado = await confirmDelete(`Se eliminará la categoría "${categoria.nombre}".`);
        if (!confirmado) return;

        try {
          await eliminarCategoriaAPI(id);
          await refrescarCategorias();
          await showSuccess("Categoría eliminada correctamente");
        } catch (error) {
          await showError(error.message || "Error al eliminar la categoría");
        }
      }
    });
  }

  if (inputBuscar) {
    inputBuscar.addEventListener("input", () => renderTabla(inputBuscar.value));
  }

  $(modalRegistro).on("hidden.bs.modal", () => resetFormulario());

  (async function init() {
    try {
      await refrescarCategorias();
    } catch (error) {
      await showError(`Error al cargar datos iniciales: ${error.message}`);
    }
  })();
});
