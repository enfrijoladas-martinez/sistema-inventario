document.addEventListener("DOMContentLoaded", () => {
  const formLogin = document.getElementById("formLogin");
  const inputEmail = document.getElementById("exampleInputEmail");
  const inputPassword = document.getElementById("exampleInputPassword");
  const mensajeLogin = document.getElementById("mensajeLogin");

  const API_URL = "http://146.190.165.82";
  const KEY_USUARIO = "usuarioLogueado";
  const KEY_TOKEN = "token";

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

      const response = await fetch(`${API_URL}/api/usuarios/login`, {
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
        
        const token = result.token || result.data?.token;
        if (token) {
          localStorage.setItem(KEY_TOKEN, token);
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