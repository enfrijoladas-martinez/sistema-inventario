// Las constantes API_URL y KEY_TOKEN ya están declaradas en auth.js
// const API_URL = "http://146.190.165.82";
// const KEY_TOKEN = "token";

const ENDPOINTS = {
    reportes: "/api/reportes/",
    ventas: "/api/ventas/",
    productos: "/api/productos/"
};

let ventasGlobal = [];
let productosGlobal = [];
let detalleVentasGlobal = [];
let datosExcelGlobal = [];

let chartVentasProducto = null;
let chartVentasLinea = null;
let chartVentasCliente = null;
let chartVendidosCategoria = null;

document.addEventListener("DOMContentLoaded", () => {
    cargarReportes();

    const btnFiltrar = document.getElementById("btnFiltrarReportes");
    const btnExportar = document.getElementById("btnExportarExcel");

    if (btnFiltrar) {
        btnFiltrar.addEventListener("click", cargarReportes);
    }

    if (btnExportar) {
        btnExportar.addEventListener("click", exportarExcel);
    }
});

// CONSULTA GENERAL
async function obtenerDatos(endpoint, params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${API_URL}${endpoint}?${queryString}` : `${API_URL}${endpoint}`;
        const token = localStorage.getItem(KEY_TOKEN);
        
        const headers = {
            "Content-Type": "application/json"
        };
        
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }
        
        const response = await fetch(url, { headers });
        const result = await response.json();

        if (!response.ok || result.success === false) {
            if (response.status === 401 || response.status === 403 || String(result.message).toLowerCase().includes('token')) {
                Swal.fire({
                    icon: 'warning',
                    title: 'Sesión expirada o inválida',
                    text: 'Tu sesión o token ha expirado. Por favor, cierra sesión y vuelve a entrar para continuar.',
                    confirmButtonText: 'Entendido'
                });
            }
            throw new Error(result.message || "Error al obtener datos");
        }

        return result.data;
    } catch (error) {
        console.error("Error consultando:", endpoint, error);
        return null;
    }
}

function obtenerParamsFecha() {
    const fechaInicio = document.getElementById("fechaInicio")?.value;
    const fechaFinal = document.getElementById("fechaFinal")?.value;
    const params = {};
    
    if (fechaInicio) params.fecha_inicio = fechaInicio;
    if (fechaFinal) {
        params.fecha_final = fechaFinal; // Mantenemos compatibilidad con endpoints anteriores
        params.fecha_fin = fechaFinal;    // Para los nuevos endpoints
    }
    
    return params;
}

async function cargarReportes() {
    const params = obtenerParamsFecha();

    // Obtener datos de los nuevos endpoints enviando fecha_inicio y fecha_fin
    const paramsNuevosEndpoints = {};
    if (params.fecha_inicio) paramsNuevosEndpoints.fecha_inicio = params.fecha_inicio;
    if (params.fecha_fin) paramsNuevosEndpoints.fecha_fin = params.fecha_fin;

    const dataVentasCliente = await obtenerDatos("/api/reportes/ventas-por-cliente", paramsNuevosEndpoints) || [];
    const dataCantidadVendida = await obtenerDatos("/api/reportes/cantidad-vendida", paramsNuevosEndpoints) || [];
    const dataTopPorCategoria = await obtenerDatos("/api/reportes/top-por-categoria", paramsNuevosEndpoints) || [];
    const dataTopProductos = await obtenerDatos("/api/reportes/top-productos", paramsNuevosEndpoints) || [];
    const dataVentasCategoria = await obtenerDatos("/api/reportes/ventas-por-categoria", paramsNuevosEndpoints) || [];
    const dataKpis = await obtenerDatos("/api/reportes/kpis", paramsNuevosEndpoints) || null;

    // Ya no consultaremos ENDPOINTS.reportes debido a cambios en el backend, 
    // las variables globales para detalle quedarán disponibles pero vacías por defecto:
    ventasGlobal = [];
    productosGlobal = [];
    detalleVentasGlobal = [];

    // Desglosamos productos desde ventasCategoria para enriquecer los reportes
    const productosEnCategorias = [];
    dataVentasCategoria.forEach(cat => {
        if (cat.productos) {
            cat.productos.forEach(p => {
                productosEnCategorias.push({
                    producto: p.descripcion,
                    categoria: cat.categoria,
                    total: parseFloat(p.utilidad || 0),
                    cantidad: p.cantidad_vendida
                });
            });
        }
    });

    const ventasPorProducto = dataCantidadVendida.map(item => {
        const prodLocal = productosEnCategorias.find(p => String(p.producto).toLowerCase() === String(item.descripcion).toLowerCase()) || {};
        return {
            producto: item.descripcion,
            cantidad: item.cantidad_vendida,
            categoria: prodLocal.categoria || "Sin categoría",
            total: prodLocal.total || 0
        };
    });
    
    const ventasPorCliente = dataVentasCliente.map(item => {
        return {
            cliente: item.cliente,
            total: parseFloat(item.utilidad_total || 0),
            ventas: 1 // Referencia genérica ya que el endpoint no retorna el contador de ventas
        };
    });

    const vendidosPorCategoria = dataTopPorCategoria.map(item => ({
        categoria: item.categoria,
        producto: item.descripcion,
        cantidad: item.cantidad_vendida,
        total: parseFloat(item.utilidad || 0)
    }));

    const topProductos = dataTopProductos.map(item => ({
        producto: item.descripcion,
        categoria: item.categoria,
        cantidad: item.cantidad_vendida,
        total: parseFloat(item.utilidad || 0)
    }));

    const ventasPorLinea = dataVentasCategoria.map(item => ({
        categoria: item.categoria,
        total: parseFloat(item.utilidad_total || 0),
        cantidad: (item.productos || []).reduce((acc, p) => acc + Number(p.cantidad_vendida), 0)
    }));

    // Local fallback entities
    const productoMasVendido = topProductos[0] || null;
    const lineaMasVendida = ventasPorLinea[0] || null;
    const clientePrincipal = ventasPorCliente[0] || null;

    if (dataKpis) {
        setText("cardTotalVentas", formatoMoneda(dataKpis.total_ventas || 0));
        setText("cardProductoMasVendido", dataKpis.producto_mas_vendido || "Sin datos");
        setText("cardClientePrincipal", dataKpis.cliente_principal || "Sin datos");
        setText("cardLineaMasVendida", dataKpis.categoria_top || "Sin datos");
    } else {
        actualizarCards({
            ventas: ventasGlobal,
            productoMasVendido,
            lineaMasVendida,
            clientePrincipal
        });
    }

    renderChartVentasProducto(ventasPorProducto);
    renderChartVentasLinea(ventasPorLinea);
    renderChartVentasCliente(ventasPorCliente);
    renderProductoMasVendido(productoMasVendido, topProductos);
    renderVendidosPorCategoria(vendidosPorCategoria);

    prepararDatosExcel({
        ventasGlobal,
        detalleVentasGlobal,
        ventasPorProducto, // Para Excel
        ventasPorLinea,
        ventasPorCliente,  // Para Excel
        vendidosPorCategoria
    });
}

// OBTENER DETALLE DE TODAS LAS VENTAS
async function obtenerDetalleTodasLasVentas(ventas) {
    const detallesFinales = [];

    for (const venta of ventas) {
        const ventaDetalle = await obtenerDatos(`/api/ventas/${venta.id_venta}`);

        if (!ventaDetalle) continue;

        const detalle = ventaDetalle.detalle || [];

        detalle.forEach((item) => {
            const producto = buscarProductoPorId(item.id_producto);
            const categoria = obtenerCategoriaProducto(producto);

            const cantidad = Number(item.cantidad_vendida || 0);
            const precioVenta = Number(item.precio_venta || 0);
            const total = cantidad * precioVenta;

            detallesFinales.push({
                id_venta: ventaDetalle.id_venta,
                folio_venta: ventaDetalle.folio || venta.folio || "",
                estado: ventaDetalle.estado || venta.estado || "",
                municipio: ventaDetalle.municipio || venta.municipio || "",
                cliente: ventaDetalle.cliente || venta.cliente || "Cliente no especificado",

                id_producto: item.id_producto,
                folio_producto: item.folio_producto || "",
                producto: item.descripcion || producto.descripcion || item.folio_producto || "Producto sin nombre",
                categoria: categoria,

                cantidad_vendida: cantidad,
                precio_venta: precioVenta,
                total: total
            });
        });
    }

    return detallesFinales;
}

// FILTRO POR FECHA
function filtrarVentasPorFecha(ventas) {
    const fechaInicio = document.getElementById("fechaInicio")?.value;
    const fechaFinal = document.getElementById("fechaFinal")?.value;

    if (!fechaInicio && !fechaFinal) return ventas;

    return ventas.filter((venta) => {
        const fechaRaw =
            venta.fecha_venta ||
            venta.fecha ||
            venta.created_at ||
            venta.fecha_creacion ||
            "";

        if (!fechaRaw) return true;

        const fechaVenta = new Date(fechaRaw);
        const inicio = fechaInicio ? new Date(`${fechaInicio}T00:00:00`) : null;
        const fin = fechaFinal ? new Date(`${fechaFinal}T23:59:59`) : null;

        if (inicio && fechaVenta < inicio) return false;
        if (fin && fechaVenta > fin) return false;

        return true;
    });
}

function buscarProductoPorId(idProducto) {
    return productosGlobal.find((producto) => {
        return String(producto.id_producto) === String(idProducto);
    }) || {};
}

function obtenerCategoriaProducto(producto) {
    if (producto.categorias && Array.isArray(producto.categorias) && producto.categorias.length > 0) {
        return producto.categorias.map((cat) => cat.nombre).join(", ");
    }

    return "Sin categoría";
}

// AGRUPAR VENTAS POR PRODUCTO
function agruparVentasPorProducto(detalleVentas) {
    const mapa = {};

    detalleVentas.forEach((item) => {
        const key = item.id_producto;

        if (!mapa[key]) {
            mapa[key] = {
                id_producto: item.id_producto,
                producto: item.producto,
                categoria: item.categoria,
                cantidad: 0,
                total: 0
            };
        }

        mapa[key].cantidad += Number(item.cantidad_vendida || 0);
        mapa[key].total += Number(item.total || 0);
    });

    return Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad);
}

// AGRUPAR VENTAS POR LÍNEA / CATEGORÍA
function agruparVentasPorLinea(detalleVentas) {
    const mapa = {};

    detalleVentas.forEach((item) => {
        const categoria = item.categoria || "Sin categoría";

        if (!mapa[categoria]) {
            mapa[categoria] = {
                categoria,
                cantidad: 0,
                total: 0
            };
        }

        mapa[categoria].cantidad += Number(item.cantidad_vendida || 0);
        mapa[categoria].total += Number(item.total || 0);
    });

    return Object.values(mapa).sort((a, b) => b.total - a.total);
}

// AGRUPAR VENTAS POR CLIENTE
function agruparVentasPorCliente(ventas) {
    const mapa = {};

    ventas.forEach((venta) => {
        const cliente =
            venta.cliente ||
            venta.nombre_cliente ||
            venta.razon_social ||
            "Cliente no especificado";

        const total = Number(venta.precio_venta_final || 0);

        if (!mapa[cliente]) {
            mapa[cliente] = {
                cliente,
                ventas: 0,
                total: 0
            };
        }

        mapa[cliente].ventas += 1;
        mapa[cliente].total += total;
    });

    return Object.values(mapa).sort((a, b) => b.total - a.total);
}

// PRODUCTOS MÁS VENDIDOS POR CATEGORÍA
function obtenerMasVendidosPorCategoria(detalleVentas) {
    const mapa = {};

    detalleVentas.forEach((item) => {
        const categoria = item.categoria || "Sin categoría";
        const producto = item.producto || "Producto sin nombre";

        if (!mapa[categoria]) {
            mapa[categoria] = {};
        }

        if (!mapa[categoria][producto]) {
            mapa[categoria][producto] = {
                categoria,
                producto,
                cantidad: 0,
                total: 0
            };
        }

        mapa[categoria][producto].cantidad += Number(item.cantidad_vendida || 0);
        mapa[categoria][producto].total += Number(item.total || 0);
    });

    const resultado = [];

    Object.keys(mapa).forEach((categoria) => {
        const productosCategoria = Object.values(mapa[categoria])
            .sort((a, b) => b.cantidad - a.cantidad);

        if (productosCategoria.length > 0) {
            resultado.push(productosCategoria[0]);
        }
    });

    return resultado.sort((a, b) => b.cantidad - a.cantidad);
}

function actualizarCards({ ventas, productoMasVendido, lineaMasVendida, clientePrincipal }) {
    const totalVentas = ventas.reduce((acc, venta) => {
        return acc + Number(venta.precio_venta_final || 0);
    }, 0);

    setText("cardTotalVentas", formatoMoneda(totalVentas));
    setText("cardProductoMasVendido", productoMasVendido ? productoMasVendido.producto : "Sin datos");
    setText("cardClientePrincipal", clientePrincipal ? clientePrincipal.cliente : "Sin datos");
    setText("cardLineaMasVendida", lineaMasVendida ? lineaMasVendida.categoria : "Sin datos");
}

// GRÁFICA: VENTAS POR PRODUCTO
function renderChartVentasProducto(data) {
    const ctx = document.getElementById("chartVentasProducto");
    if (!ctx) return;

    if (chartVentasProducto) chartVentasProducto.destroy();

    const topData = data.slice(0, 10);

    chartVentasProducto = new Chart(ctx, {
        type: "bar",
        data: {
            labels: topData.map((item) => item.producto),
            datasets: [{
                label: "Cantidad vendida",
                data: topData.map((item) => item.cantidad),
                backgroundColor: "rgba(78, 115, 223, 0.7)",
                borderColor: "rgba(78, 115, 223, 1)",
                borderWidth: 1
            }]
        },
        options: opcionesGrafica("Ventas por Producto", true)
    });
}

// GRÁFICA: VENTAS POR LÍNEA / CATEGORÍA
function renderChartVentasLinea(data) {
    const ctx = document.getElementById("chartVentasLinea");
    if (!ctx) return;

    if (chartVentasLinea) chartVentasLinea.destroy();

    chartVentasLinea = new Chart(ctx, {
        type: "doughnut",
        data: {
            labels: data.map((item) => item.categoria),
            datasets: [{
                label: "Total vendido",
                data: data.map((item) => item.total),
                backgroundColor: [
                    "rgba(78, 115, 223, 0.8)",
                    "rgba(28, 200, 138, 0.8)",
                    "rgba(246, 194, 62, 0.8)",
                    "rgba(231, 74, 59, 0.8)",
                    "rgba(54, 185, 204, 0.8)",
                    "rgba(133, 135, 150, 0.8)"
                ]
            }]
        },
        options: opcionesGrafica("Ventas por Línea / Categoría", false)
    });
}

// GRÁFICA: VENTAS POR CLIENTE
function renderChartVentasCliente(data) {
    const ctx = document.getElementById("chartVentasCliente");
    if (!ctx) return;

    if (chartVentasCliente) chartVentasCliente.destroy();

    const topData = data.slice(0, 10);

    chartVentasCliente = new Chart(ctx, {
        type: "bar",
        data: {
            labels: topData.map((item) => item.cliente),
            datasets: [{
                label: "Total vendido",
                data: topData.map((item) => item.total),
                backgroundColor: "rgba(54, 185, 204, 0.7)",
                borderColor: "rgba(54, 185, 204, 1)",
                borderWidth: 1
            }]
        },
        options: opcionesGrafica("Ventas por Cliente", true)
    });
}

// GRÁFICA: MÁS VENDIDOS POR CATEGORÍA
function renderChartVendidosCategoria(data) {
    const ctx = document.getElementById("chartVendidosCategoria");
    if (!ctx) return;

    if (chartVendidosCategoria) chartVendidosCategoria.destroy();

    chartVendidosCategoria = new Chart(ctx, {
        type: "bar",
        data: {
            labels: data.map((item) => item.categoria),
            datasets: [{
                label: "Cantidad vendida",
                data: data.map((item) => item.cantidad),
                backgroundColor: "rgba(231, 74, 59, 0.7)",
                borderColor: "rgba(231, 74, 59, 1)",
                borderWidth: 1
            }]
        },
        options: opcionesGrafica("Más vendidos por categoría", true)
    });
}

function opcionesGrafica(titulo, mostrarEjes) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: true,
                text: titulo
            },
            legend: {
                display: true
            }
        },
        scales: mostrarEjes ? {
            y: {
                beginAtZero: true
            }
        } : {}
    };
}

// RENDER PRODUCTO MÁS VENDIDO
function renderProductoMasVendido(productoMasVendido, rankingProductos) {
    if (!productoMasVendido) {
        setText("txtProductoMasVendido", "Sin datos");
        setText("txtCantidadProductoMasVendido", "0 unidades");
        setText("txtImporteProductoMasVendido", "$0.00");
        renderTablaRankingProductos([]);
        return;
    }

    setText("txtProductoMasVendido", productoMasVendido.producto);
    setText("txtCantidadProductoMasVendido", `${productoMasVendido.cantidad} unidades`);
    setText("txtImporteProductoMasVendido", formatoMoneda(productoMasVendido.total));

    renderTablaRankingProductos(rankingProductos);
}

function renderTablaRankingProductos(data) {
    const tbody = document.querySelector("#tablaRankingProductos tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">Sin datos disponibles</td>
            </tr>
        `;
        return;
    }

    data.forEach((item, index) => {
        tbody.innerHTML += `
            <tr>
                <td>${index + 1}</td>
                <td>${item.producto}</td>
                <td>${item.categoria}</td>
                <td>${item.cantidad}</td>
                <td>${formatoMoneda(item.total)}</td>
            </tr>
        `;
    });
}

// RENDER MÁS VENDIDOS POR CATEGORÍA
function renderVendidosPorCategoria(data) {
    renderChartVendidosCategoria(data);
    renderTablaVendidosCategoria(data);
}

function renderTablaVendidosCategoria(data) {
    const tbody = document.querySelector("#tablaVendidosCategoria tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (!data || data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4">Sin datos disponibles</td>
            </tr>
        `;
        return;
    }

    data.forEach((item) => {
        tbody.innerHTML += `
            <tr>
                <td>${item.categoria}</td>
                <td>${item.producto}</td>
                <td>${item.cantidad}</td>
                <td>${formatoMoneda(item.total)}</td>
            </tr>
        `;
    });
}


function prepararDatosExcel({
    ventasGlobal,
    detalleVentasGlobal,
    ventasPorProducto,
    ventasPorLinea,
    ventasPorCliente,
    vendidosPorCategoria
}) {
    datosExcelGlobal = [];

    ventasPorProducto.forEach((item) => {
        datosExcelGlobal.push({
            Reporte: "Ventas por producto",
            Producto: item.producto,
            Categoria: item.categoria,
            Cliente: "",
            Cantidad: item.cantidad,
            Total: item.total
        });
    });

    ventasPorLinea.forEach((item) => {
        datosExcelGlobal.push({
            Reporte: "Ventas por línea/categoría",
            Producto: "",
            Categoria: item.categoria,
            Cliente: "",
            Cantidad: item.cantidad,
            Total: item.total
        });
    });

    ventasPorCliente.forEach((item) => {
        datosExcelGlobal.push({
            Reporte: "Ventas por cliente",
            Producto: "",
            Categoria: "",
            Cliente: item.cliente,
            Cantidad: item.ventas,
            Total: item.total
        });
    });

    vendidosPorCategoria.forEach((item) => {
        datosExcelGlobal.push({
            Reporte: "Más vendido por categoría",
            Producto: item.producto,
            Categoria: item.categoria,
            Cliente: "",
            Cantidad: item.cantidad,
            Total: item.total
        });
    });

    detalleVentasGlobal.forEach((item) => {
        datosExcelGlobal.push({
            Reporte: "Detalle de ventas",
            FolioVenta: item.folio_venta,
            Producto: item.producto,
            Categoria: item.categoria,
            Cliente: item.cliente,
            Cantidad: item.cantidad_vendida,
            PrecioVenta: item.precio_venta,
            Total: item.total,
            Estado: item.estado,
            Municipio: item.municipio
        });
    });
}

// EXPORTAR EXCEL
function exportarExcel() {
    if (!datosExcelGlobal || datosExcelGlobal.length === 0) {
        alert("No hay información para exportar.");
        return;
    }

    const worksheet = XLSX.utils.json_to_sheet(datosExcelGlobal);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Reportes");
    XLSX.writeFile(workbook, "reportes_agromundo.xlsx");
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) {
        element.textContent = value;
    }
}

function formatoMoneda(valor) {
    return Number(valor || 0).toLocaleString("es-MX", {
        style: "currency",
        currency: "MXN"
    });
}