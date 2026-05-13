const API_URL = "http://146.190.165.82";
const KEY_TOKEN = "token";
const KEY_USUARIO = "usuarioLogueado";

const PAGINAS_EMPLEADO = ["productos.html", "clientes.html", "reportes.html", "index.html", "inventario.html"];

function verificarToken() {
    const token = localStorage.getItem(KEY_TOKEN);
    const usuario = localStorage.getItem(KEY_USUARIO);
    
    if (!token || !usuario) {
        window.location.href = "login.html";
        return null;
    }

    try {
        return JSON.parse(usuario);
    } catch (error) {
        console.error("Error parseando usuario:", error);
        cerrarSesion();
        return null;
    }
}

function cerrarSesion() {
    localStorage.removeItem(KEY_TOKEN);
    localStorage.removeItem(KEY_USUARIO);
    window.location.href = "login.html";
}

function obtenerPaginaActual() {
    return window.location.href.split("/").pop();
}

function init() {
    const usuario = verificarToken();
    
    if (!usuario) return;

    const paginaActual = obtenerPaginaActual();
    const rol = (usuario.rol || "").toLowerCase();
    
    // Si queremos que el rol empleado tenga acceso a todo igual que el administrador
    // Eliminamos las redirecciones y ocultamiento de menús

    actualizarNombreUsuario(usuario);
}

function ocultarMenusAdmin() {
    const collapseLinks = document.querySelectorAll(".collapse-item");
    const allowedPages = ["productos.html", "clientes.html", "reportes.html", "index.html"];
    
    let visibleCount = 0;
    
    collapseLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href && allowedPages.includes(href)) {
            visibleCount++;
        } else if (href && href !== "login.html") {
            link.style.display = "none";
        }
    });
    
    const navLinks = document.querySelectorAll(".sidebar .nav-link");
    
    navLinks.forEach(link => {
        const href = link.getAttribute("href");
        if (href && !allowedPages.includes(href) && href !== "#") {
            link.parentElement.style.display = "none";
        }
    });
    
    const paginasNavItem = document.querySelector('.nav-link[data-target="#collapsePages"]');
    if (paginasNavItem && visibleCount === 0) {
        paginasNavItem.parentElement.style.display = "none";
    }
}

function actualizarNombreUsuario(usuario) {
    const nombreElement = document.getElementById("nombreUsuarioTopbar");
    if (nombreElement && usuario.nombre_usuario) {
        nombreElement.textContent = usuario.nombre_usuario;
    }
}

document.addEventListener("DOMContentLoaded", init);