document.addEventListener("DOMContentLoaded", () => {
    // Configuración estética
    Chart.defaults.font.family = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
    Chart.defaults.color = '#858796';

    // --- NUEVO: GRÁFICA DE FLUJO DE INVENTARIO (BARRAS DOBLES) ---
    const ctxFlujo = document.getElementById('chartFlujo');
    if (ctxFlujo) {
        new Chart(ctxFlujo.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                datasets: [
                    {
                        label: 'Entradas (Compras/Devoluciones)',
                        backgroundColor: '#1cc88a', // Verde
                        data: [120, 150, 100, 180, 130, 200]
                    },
                    {
                        label: 'Salidas (Ventas/Mermas)',
                        backgroundColor: '#e74a3b', // Rojo
                        data: [110, 160, 90, 175, 140, 190]
                    }
                ]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Cantidad de Productos' } }
                },
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    // --- 1. GRÁFICA DE UTILIDAD POR CATEGORÍA (BARRAS) ---
    const ctxUtilidad = document.getElementById('chartUtilidad');
    if (ctxUtilidad) {
        new Chart(ctxUtilidad.getContext('2d'), {
            type: 'bar',
            data: {
                labels: ["Paneles", "Bombas", "Inversores", "Baterías", "Accesorios"],
                datasets: [{
                    label: "Utilidad Bruta ($)",
                    backgroundColor: "#4e73df",
                    hoverBackgroundColor: "#2e59d9",
                    data: [4500, 6200, 3100, 8400, 2100],
                }],
            },
            options: {
                maintainAspectRatio: false,
                scales: { y: { beginAtZero: true, ticks: { callback: value => '$' + value } } },
                plugins: { legend: { display: false } }
            }
        });
    }

    // --- 2. GRÁFICA DE MÁS VENDIDOS (DONA) ---
    const ctxVendidos = document.getElementById('chartVendidos');
    if (ctxVendidos) {
        new Chart(ctxVendidos.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ["Panel 100W", "Bomba 1HP", "Batería Litio", "Cable Solar"],
                datasets: [{
                    data: [40, 25, 20, 15],
                    backgroundColor: ['#1cc88a', '#4e73df', '#36b9cc', '#f6c23e'],
                    hoverBorderColor: "rgba(234, 236, 244, 1)",
                }],
            },
            options: {
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }

    // --- 3. GRÁFICA DE VENTAS POR PERIODO (LÍNEAS) ---
    const ctxPeriodo = document.getElementById('chartPeriodo');
    if (ctxPeriodo) {
        new Chart(ctxPeriodo.getContext('2d'), {
            type: 'line',
            data: {
                labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul"],
                datasets: [{
                    label: "Ventas Totales",
                    lineTension: 0.3,
                    backgroundColor: "rgba(78, 115, 223, 0.05)",
                    borderColor: "#4e73df",
                    pointRadius: 3,
                    pointBackgroundColor: "#4e73df",
                    pointBorderColor: "#4e73df",
                    data: [12000, 15000, 11000, 19000, 22000, 28000, 25000],
                    fill: true
                }],
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    x: { grid: { display: false } },
                    y: { ticks: { callback: value => '$' + value } }
                }
            }
        });
    }

    // =========================================================================
    // LÓGICA DE CONTROLES (EXPORTACIÓN Y FILTROS)
    // =========================================================================

    // 1. Exportar la gráfica actual a PNG
    const btnExportar = document.getElementById('btnExportar');
    if (btnExportar) {
        btnExportar.addEventListener('click', () => {
            const activeCanvas = document.querySelector('.tab-pane.active canvas');
            
            if (activeCanvas) {
                const fechaHoy = new Date().toLocaleDateString().replace(/\//g, '-');
                const link = document.createElement('a');
                link.download = `Reporte_Agromundo_${fechaHoy}.png`;
                link.href = activeCanvas.toDataURL('image/png');
                link.click();
            } else {
                alert('No se encontró ninguna gráfica para exportar.');
            }
        });
    }

    // 2. Filtro Combinado (Almacén + Fechas)
    const filtroAlmacen = document.getElementById('filtroAlmacen');
    const inputFechaInicio = document.getElementById('fechaInicio');
    const inputFechaFinal = document.getElementById('fechaFinal');

    function aplicarFiltros() {
        const almacen = filtroAlmacen ? filtroAlmacen.value : 'todos';
        const inicio = inputFechaInicio ? inputFechaInicio.value : '';
        const fin = inputFechaFinal ? inputFechaFinal.value : '';

        // Yo creo que con esto ya se ve súper pro para cuando lo conecten
        console.log(`Buscando datos -> Almacén: ${almacen} | Desde: ${inicio} | Hasta: ${fin}`);
        
        // Aquí conectarán la base de datos más adelante
    }

    // Escuchar cambios en los 3 controles
    if (filtroAlmacen) filtroAlmacen.addEventListener('change', aplicarFiltros);
    if (inputFechaInicio) inputFechaInicio.addEventListener('change', aplicarFiltros);
    if (inputFechaFinal) inputFechaFinal.addEventListener('change', aplicarFiltros);
});