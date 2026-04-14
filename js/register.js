document.addEventListener("DOMContentLoaded", () => {
  const formRegistro = document.getElementById("formRegistro");
  const inputNombre = document.getElementById("nombreUsuario");
  const inputTelefono = document.getElementById("telefonoUsuario");
  const inputEmail = document.getElementById("emailUsuario");
  const inputRol = document.getElementById("rolUsuario");
  const inputPassword = document.getElementById("passwordUsuario");
  const inputRepeatPassword = document.getElementById("repeatPasswordUsuario");
  const mensajeRegistro = document.getElementById("mensajeRegistro");

  const API_URL = "http://143.198.230.63/api/usuarios/";

  function mostrarMensaje(texto, tipo = "danger") {
    mensajeRegistro.textContent = texto;
    mensajeRegistro.className = `text-center mt-3 mb-0 small text-${tipo}`;
  }

  formRegistro.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nombre_usuario = inputNombre.value.trim();
    const telefono = inputTelefono.value.trim();
    const email = inputEmail.value.trim();
    const id_rol = Number(inputRol.value);
    const password = inputPassword.value.trim();
    const repeatPassword = inputRepeatPassword.value.trim();

    if (!nombre_usuario || !telefono || !email || !id_rol || !password || !repeatPassword) {
      mostrarMensaje("Completa todos los campos.");
      return;
    }

    if (password !== repeatPassword) {
      mostrarMensaje("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      mostrarMensaje("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    try {
      mostrarMensaje("Registrando usuario...", "primary");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          nombre_usuario,
          telefono,
          email,
          password,
          id_rol
        })
      });

      const result = await response.json();

      if (result.success) {
        mostrarMensaje("Usuario registrado correctamente.", "success");
        formRegistro.reset();

        setTimeout(() => {
          window.location.href = "login.html";
        }, 1200);
      } else {
        mostrarMensaje(result.message || "No se pudo registrar el usuario.");
      }
    } catch (error) {
      console.error("Error en registro:", error);
      mostrarMensaje("No se pudo conectar con el servidor.");
    }
  });
});