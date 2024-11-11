# MrMap

[![Version](https://img.shields.io/badge/version-0.1.1-blue.svg)](https://mrmap.xyz)

MrMap is a web application that enables users to mark and share safety information about different areas in Costa Rica through an interactive mapping interface.

## Features

- 🗺️ Interactive map focused on Costa Rica with drawing tools
- 🎨 Draw shapes (polygons, rectangles, circles) to mark areas
- 🚦 Assign safety levels (green/yellow/red) to marked areas
- 💬 Add and view comments on marked locations
- 📍 Geocoding support for location search
- 📱 User geolocation for easy navigation
- 💾 Persistent storage of marked locations and comments

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/mrmap.git
cd mrmap
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=your_mongodb_connection_string
PORT=3000
```

4. Start the development server:
```bash
npm run dev
```

The application should now be running at `http://localhost:3000`

## Project Structure

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

## Technical Details

### Map Boundaries
The application is bounded to Costa Rica's coordinates:
- Southwest: `8.0000, -85.0000`
- Northeast: `11.0000, -82.0000`

### Frontend
- Leaflet.js for mapping functionality
- leaflet-draw for shape drawing tools
- Custom CSS variables for theming
- Modern ES modules

### Backend
- Express.js server
- MongoDB for data persistence
- CORS enabled
- Security headers implemented

### Database Schema

```javascript
// Location Schema
{
  type: String,          // 'polygon', 'rectangle', 'circle'
  coordinates: Array,    // Array of coordinates
  safetyLevel: String,   // 'green', 'yellow', 'red'
  comments: [{
    text: String,
    timestamp: Date
  }],
  createdAt: Date
}
```

## Recent Updates (v0.1.1)

- Fixed circle drawing functionality
- Added About section
- Implemented proper error handling
- Improved UI/UX styling
- Fixed issues with saved locations and comments
- Added version checking and update notifications

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Deployment
```bash
npm run deploy
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## Known Issues

- Working on ensuring consistent functionality across different shape types
- Improving reliability of safety information display on saved shapes

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

## Contact

Project Link: [https://mrmap.xyz](https://mrmap.xyz)

## Acknowledgments

- [Leaflet.js](https://leafletjs.com/)
- [MongoDB](https://www.mongodb.com/)
- [Express.js](https://expressjs.com/)
