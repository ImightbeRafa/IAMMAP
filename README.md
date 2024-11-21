# MrMap

[![Versión](https://img.shields.io/badge/versión-0.0.2-blue.svg)](https://mrmap.xyz)

MrMap es una aplicación web que permite a los usuarios marcar y compartir información sobre la seguridad de diferentes áreas en Costa Rica a través de una interfaz de mapeo interactiva.

## Características

- 🗺️ Mapa interactivo enfocado en Costa Rica con herramientas de dibujo
- 🎨 Dibuja en un canva con un grid
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
cd IAMMAP
```

2. Instalar dependencias:
```bash
npm install
```

3. Crear un archivo `.env` en el directorio raíz con las siguientes variables:
```
MONGODB_URI=tu_cadena_de_conexion_mongodb
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

4. Iniciar el servidor de desarrollo:
```bash
node server.js
```

La aplicación debería estar ejecutándose en `http://localhost:3000`

## Estructura del Proyecto

```
IAMMAP/
│
├── public/
    ├── image/
│   │   └── favicon.ico   
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   └── index.html
│
├── server.js
├── .env
├── package.json
├── package-lock.json
└── README.md
```

## Detalles Técnicos


### Frontend
- Iframe 
- Brush tool
- Variables CSS personalizadas para temas


### Backend
- Servidor Express.js
- MongoDB para persistencia de datos
- CORS habilitado
- Cabeceras de seguridad implementadas




## Actualizaciones Recientes (v0.0.2)

- Cambios en la renderizacion del Mapa
- UI styling mejorado
- Base de datos con MongoDB
-Dibujo Brush con un grid(Todavia no funciona)

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

- Mejorar la forma en la que se dibuja!
- Refactorizar el desastre !
- Integración de la base de datos en proceso.!
  
  Nada se guarda por el momento sigue en proceso. 

## Licencia

No tengo denle con todo

## Contacto
https://x.com/iamrafagarcia  
Enlace del Proyecto: [https://mrmap.xyz](https://mrmap.xyz)

## Agradecimientos

- OpenstreetMap
- [MongoDB](https://www.mongodb.com/)
- [Express.js](https://expressjs.com/)
