# 🌱 Sistema de Inventario Agromundo

Sistema ERP integral para la gestión de inventario, ventas y reportes analíticos de Agromundo.

## 📋 Descripción

Sistema web desarrollado para automatizar y centralizar la gestión operativa de Agromundo, permitiendo control preciso de inventarios, administración de almacenes y procesamiento de ventas, con capacidades de análisis mediante reportes interactivos.

## 🚀 Características Principales

### Gestión de Productos
- Catálogo completo con códigos (clave/folio), descripción, precios y costos
- Categorización mediante categorías y subcategorías
- Búsqueda y filtrado en tiempo real

### Ventas
- Registro de ventas con múltiples productos
- Validación automática de existencias
- Descuento automático de inventario post-venta
- Historial detallado con fechas formateadas

### Inventario y Almacén
- Control de stock por almacén
- Movimientos de entrada y salida
- Trazabilidad completa de inventario

### Reportes y Análisis
- Dashboard interactivo con resumen de ventas
- Gráficas dinámicas (Chart.js):
  - Ventas por producto (barras)
  - Ventas por línea/categoría (dona)
  - Ventas por cliente (barras)
  - Productos más vendidos por categoría
- Ranking de productos y tablas detalladas
- Exportación de reportes a Excel (XLSX)
- Gráficas colapsables para mejor navegación

### Interfaz de Usuario
- Diseño responsive con SB Admin 2
- Modales estandarizados en todos los módulos
- Selección de categorías mediante ventanas secundarias
- Menú de usuario con gestión de usuarios y cierre de sesión

## 🛠️ Tecnologías

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **UI Framework:** Bootstrap 4, SB Admin 2
- **Gráficas:** Chart.js
- **Exportación:** SheetJS (XLSX)
- **Backend API:** REST API en http://143.198.230.63

## 📁 Estructura del Proyecto

```
├── index.html              # Dashboard principal
├── productos.html          # Gestión de productos
├── clientes.html           # Gestión de clientes
├── ventas.html             # Registro de ventas
├── inventario.html         # Control de inventario
├── movimientos.html        # Historial de movimientos
├── almacen.html            # Gestión de almacenes
├── categorias.html         # Catálogo de categorías

├── reportes.html          # Reportes y análisis
├── usuarios.html           # Gestión de usuarios
├── js/
│   ├── productos.js
│   ├── clientes.js
│   ├── ventas.js
│   ├── inventario.js
│   ├── movimientos.js
│   ├── almacen.js
│   ├── categorias.js

│   └── reportes.js
├── css/
├── img/
└── vendor/
```

## 🔧 Configuración

1. Clonar el repositorio
2. Abrir cualquier archivo `.html` en el navegador
3. El sistema se conecta automáticamente a la API en `http://143.198.230.63`

### Requisitos
- Navegador web moderno
- Conexión a internet 

## 👥 Créditos

Desarrollado para **Agromundo** - 2026
