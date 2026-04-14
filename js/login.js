document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formLogin");
  const inputEmail = document.getElementById("exampleInputEmail");
  const inputPassword = document.getElementById("exampleInputPassword");
  const checkboxRecordarme = document.getElementById("customCheck");
  const mensajeLogin = document.getElementById("mensajeLogin");

  const API_URL = "http://143.198.230.63/api/usuarios/login";
  const KEY_USUARIO = "usuarioLogueado";
  const KEY_EMAIL = "emailRecordado";

  const emailRecordado = localStorage.getItem(KEY_EMAIL);
  if (emailRecordado) {
    inputEmail.value = emailRecordado;
    checkboxRecordarme.checked = true;
  }

  function mostrarMensaje(texto, tipo = "danger") {
    mensajeLogin.textContent = texto;
    mensajeLogin.className = `text-center mt-3 mb-0 small text-${tipo}`;
  }

  formLogin.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = inputEmail.value.trim();
    const password = inputPassword.value.trim();

    if (!email || !password) {
      mostrarMensaje("Completa todos los campos.");
      return;
    }

    try {
      mostrarMensaje("Validando acceso...", "primary");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const result = await response.json();

      if (result.success) {
        localStorage.setItem(KEY_USUARIO, JSON.stringify(result.data));

        if (checkboxRecordarme.checked) {
          localStorage.setItem(KEY_EMAIL, email);
        } else {
          localStorage.removeItem(KEY_EMAIL);
        }

        mostrarMensaje("Login exitoso.", "success");

        setTimeout(() => {
          window.location.href = "index.html";
        }, 500);
      } else {
        mostrarMensaje(result.message || "Credenciales incorrectas.");
      }
    } catch (error) {
      console.error("Error en login:", error);
      mostrarMensaje("No se pudo conectar con el servidor.");
    }
  });
});