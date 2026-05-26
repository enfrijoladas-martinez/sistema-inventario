document.addEventListener("DOMContentLoaded", () => {
  const API_BASE = "https://servicioagromundo.be";

  const tbody = document.querySelector("#dataTable tbody");
  const inputBuscar = document.getElementById("buscarUsuarios");

  const form = document.getElementById("formularioUsuario");
  const btnGuardar = document.getElementById("btnGuardarUsuario");
  const tituloModal = document.getElementById("tituloModalUsuario");

  const inputNombre = document.getElementById("nombreUsuario");
  const inputTelefono = document.getElementById("telefonoUsuario");
  const inputEmail = document.getElementById("emailUsuario");
  const inputPassword = document.getElementById("passwordUsuario");
  const inputRol = document.getElementById("rolUsuario");

  let usuarios = [];
  let idUsuarioEditando = null;

  async function obtenerUsuarios() {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/usuarios/`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      const result = await response.json();

      if (!result.success) {
        if (response.status === 401 || response.status === 403 || String(result.message).toLowerCase().includes('token')) {
            Swal.fire({
                icon: 'warning',
                title: 'Sesión expirada o inválida',
                text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
                confirmButtonText: 'Entendido'
            });
        }
        throw new Error(result.message || "No se pudieron obtener los usuarios.");
      }

      usuarios = Array.isArray(result.data) ? result.data : [];
      renderizarTabla(usuarios);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-danger">
            No se pudieron cargar los usuarios.
          </td>
        </tr>
      `;
    }
  }

  function renderizarTabla(lista) {
    tbody.innerHTML = "";

    if (!lista.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center">No hay usuarios registrados.</td>
        </tr>
      `;
      return;
    }

    lista.forEach((usuario) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${usuario.id_usuario ?? ""}</td>
        <td>${usuario.nombre_usuario ?? ""}</td>
        <td>${usuario.telefono ?? ""}</td>
        <td>${usuario.email ?? ""}</td>
        <td>${usuario.rol ?? ""}</td>
        <td>
          <button
            type="button"
            class="btn btn-warning btn-circle btn-sm btn-editar"
            title="Editar"
            data-id="${usuario.id_usuario}"
          >
            <i class="fas fa-pen"></i>
          </button>
          <button
            type="button"
            class="btn btn-danger btn-circle btn-sm btn-eliminar"
            title="Eliminar"
            data-id="${usuario.id_usuario}"
          >
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;

      tbody.appendChild(tr);
    });
  }

  function limpiarFormulario() {
    form.reset();
    idUsuarioEditando = null;

    if (tituloModal) {
      tituloModal.textContent = "Registrar Nuevo Usuario";
    }

    inputPassword.required = true;
  }

  function abrirModoEdicion(usuario) {
    idUsuarioEditando = usuario.id_usuario;

    if (tituloModal) {
      tituloModal.textContent = "Editar Usuario";
    }

    inputNombre.value = usuario.nombre_usuario ?? "";
    inputTelefono.value = usuario.telefono ?? "";
    inputEmail.value = usuario.email ?? "";
    inputPassword.value = "";
    inputPassword.required = false;

    // Ajuste simple por si el backend regresa rol como texto
    if (usuario.rol === "Admin") {
      inputRol.value = "1";
    } else if (usuario.rol === "Empleado") {
      inputRol.value = "2";
    } else if (usuario.id_rol) {
      inputRol.value = String(usuario.id_rol);
    } else {
      inputRol.value = "";
    }

    $("#modalNuevoUsuario").modal("show");
  }

  async function crearUsuario(payload) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/api/usuarios/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  async function actualizarUsuario(id, payload) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/api/usuarios/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  async function eliminarUsuario(id) {
    const token = localStorage.getItem("token");
    const response = await fetch(`${API_BASE}/api/usuarios/${id}`, {
      method: "DELETE",
      headers: token ? { "Authorization": `Bearer ${token}` } : {}
    });

    return response.json();
  }

  btnGuardar.addEventListener("click", async () => {
    const nombre_usuario = inputNombre.value.trim();
    const telefono = inputTelefono.value.trim();
    const email = inputEmail.value.trim();
    const password = inputPassword.value.trim();
    const id_rol = Number(inputRol.value);

    if (!nombre_usuario || !telefono || !email || !id_rol) {
      Swal.fire({ icon: "warning", title: "Advertencia", text: "Completa los campos obligatorios.", confirmButtonText: "Aceptar" });
      return;
    }

    if (!idUsuarioEditando && !password) {
      Swal.fire({ icon: "warning", title: "Advertencia", text: "La contraseña es obligatoria para registrar.", confirmButtonText: "Aceptar" });
      return;
    }

    const payload = {
      nombre_usuario,
      telefono,
      email,
      id_rol
    };

    if (password) {
      payload.password = password;
    }

    try {
      let result;

      if (idUsuarioEditando) {
        result = await actualizarUsuario(idUsuarioEditando, payload);
      } else {
        result = await crearUsuario(payload);
      }

      if (!result.success) {
        if (String(result.message).toLowerCase().includes('token')) {
            Swal.fire({
                icon: 'warning',
                title: 'Sesión expirada o inválida',
                text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
                confirmButtonText: 'Entendido'
            });
            return;
        }
        Swal.fire({ icon: "error", title: "Error", text: result.message || "No se pudo guardar el usuario.", confirmButtonText: "Aceptar" });
        return;
      }

      $("#modalNuevoUsuario").modal("hide");
      limpiarFormulario();
      await obtenerUsuarios();

      Swal.fire({ icon: "success", title: "Éxito", text: idUsuarioEditando ? "Usuario actualizado correctamente." : "Usuario registrado correctamente.", confirmButtonText: "Aceptar" });
    } catch (error) {
      console.error("Error al guardar usuario:", error);
      Swal.fire({ icon: "error", title: "Error", text: "Ocurrió un error al guardar el usuario.", confirmButtonText: "Aceptar" });
    }
  });

  tbody.addEventListener("click", async (e) => {
    const btnEditar = e.target.closest(".btn-editar");
    const btnEliminar = e.target.closest(".btn-eliminar");

    if (btnEditar) {
      const id = Number(btnEditar.dataset.id);
      const usuario = usuarios.find((u) => Number(u.id_usuario) === id);

      if (!usuario) {
        Swal.fire({ icon: "error", title: "Error", text: "No se encontró el usuario.", confirmButtonText: "Aceptar" });
        return;
      }

      abrirModoEdicion(usuario);
    }

    if (btnEliminar) {
      const id = Number(btnEliminar.dataset.id);

      const resultConfirm = await Swal.fire({
        icon: 'warning',
        title: '¿Estás seguro?',
        text: '¿Seguro que deseas eliminar este usuario?',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar',
        reverseButtons: true
      });
      if (!resultConfirm.isConfirmed) return;

      try {
        const result = await eliminarUsuario(id);

        if (!result.success) {
          if (String(result.message).toLowerCase().includes('token')) {
              Swal.fire({
                  icon: 'warning',
                  title: 'Sesión expirada o inválida',
                  text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
                  confirmButtonText: 'Entendido'
              });
              return;
          }
          Swal.fire({ icon: "error", title: "Error", text: result.message || "No se pudo eliminar el usuario.", confirmButtonText: "Aceptar" });
          return;
        }

        await obtenerUsuarios();
        Swal.fire({ icon: "success", title: "Éxito", text: "Usuario eliminado correctamente.", confirmButtonText: "Aceptar" });
      } catch (error) {
        console.error("Error al eliminar usuario:", error);
        Swal.fire({ icon: "error", title: "Error", text: "Ocurrió un error al eliminar el usuario.", confirmButtonText: "Aceptar" });
      }
    }
  });

  inputBuscar.addEventListener("input", () => {
    const texto = inputBuscar.value.trim().toLowerCase();

    const filtrados = usuarios.filter((usuario) => {
      return (
        String(usuario.id_usuario ?? "").toLowerCase().includes(texto) ||
        String(usuario.nombre_usuario ?? "").toLowerCase().includes(texto) ||
        String(usuario.telefono ?? "").toLowerCase().includes(texto) ||
        String(usuario.email ?? "").toLowerCase().includes(texto) ||
        String(usuario.rol ?? "").toLowerCase().includes(texto)
      );
    });

    renderizarTabla(filtrados);
  });

  $("#modalNuevoUsuario").on("hidden.bs.modal", () => {
    limpiarFormulario();
  });

  obtenerUsuarios();
});