# MrMap

[![Versión](https://img.shields.io/badge/versión-0.1.1-blue.svg)](https://mrmap.xyz)

MrMap es una aplicación web que permite a los usuarios marcar y compartir información sobre la seguridad de diferentes áreas en Costa Rica a través de una interfaz de mapeo interactiva.

## Características

- 🗺️ Mapa interactivo enfocado en Costa Rica con herramientas de dibujo
- 🎨 Dibuja formas (polígonos, rectángulos, círculos) para marcar áreas
- 🚦 Asigna niveles de seguridad (verde/amarillo/rojo) a las áreas marcadas
- 💬 Agrega y visualiza comentarios en ubicaciones marcadas
- 📍 Soporte de geocodificación para búsqueda de ubicaciones
- 📱 Geolocalización del usuario para fácil navegación
- 💾 Almacenamiento persistente de ubicaciones marcadas y comentarios

## Requisitos Previos

- Node.js (v14 o superior)
- MongoDB (v4.4 o superior)
- Gestor de paquetes npm o yarn

## Instalación

1. Clonar el repositorio:
```bash
git clone https://github.com/tunombre/mrmap.git
cd mrmap
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear un archivo `.env` en el directorio raíz con las siguientes variables:
```
MONGODB_URI=tu_cadena_de_conexion_mongodb
PORT=3000
```

4. Iniciar el servidor de desarrollo:
```bash
npm run dev
```

La aplicación debería estar ejecutándose en `http://localhost:3000`

## Estructura del Proyecto

```
mrmap/
├── public/
│   ├── index.html
│   ├── main.js
│   └── index.css
├── server/
│   └── server.js
├── package.json
└── README.md
```

## Detalles Técnicos

### Límites del Mapa
La aplicación está limitada a las coordenadas de Costa Rica:
- Suroeste: `8.0000, -85.0000`
- Noreste: `11.0000, -82.0000`

### Frontend
- Leaflet.js para la funcionalidad de mapeo
- leaflet-draw para herramientas de dibujo de formas
- Variables CSS personalizadas para temas
- Módulos ES modernos

### Backend
- Servidor Express.js
- MongoDB para persistencia de datos
- CORS habilitado
- Cabeceras de seguridad implementadas

### Esquema de Base de Datos

```javascript
// Esquema de Ubicación
{
  type: String,          // 'polygon', 'rectangle', 'circle'
  coordinates: Array,    // Array de coordenadas
  safetyLevel: String,   // 'green', 'yellow', 'red'
  comments: [{
    text: String,
    timestamp: Date
  }],
  createdAt: Date
}
```

## Actualizaciones Recientes (v0.1.1)

- Corrección de la funcionalidad de dibujo de círculos
- Agregada sección Acerca de
- Implementación de manejo adecuado de errores
- Mejora del diseño UI/UX
- Corrección de problemas con ubicaciones guardadas y comentarios
- Agregada verificación de versión y notificaciones de actualización

## Desarrollo

### Ejecutar Pruebas
```bash
npm test
```

### Compilar para Producción
```bash
npm run build
```

### Despliegue
```bash
npm run deploy
```

## Contribuir

1. Haz un fork del repositorio
2. Crea tu rama de características (`git checkout -b feature/CaracteristicaIncreible`)
3. Realiza tus cambios (`git commit -m 'Agregar alguna CaracteristicaIncreible'`)
4. Sube la rama (`git push origin feature/CaracteristicaIncreible`)
5. Abre un Pull Request

## Problemas Conocidos

- Trabajando en asegurar la funcionalidad consistente entre diferentes tipos de formas
- Mejorando la confiabilidad de la visualización de información de seguridad en formas guardadas

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE.md](LICENSE.md) para más detalles

## Contacto

Enlace del Proyecto: [https://mrmap.xyz](https://mrmap.xyz)

## Agradecimientos

- [Leaflet.js](https://leafletjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Express.js](https://expressjs.com/)
