// Global variables
let map;
let geojsonLayer;
let drawnItems;
let regionColors = {};
let isGeojsonLoaded = false;
let locationComments = {}; // This was missing from globals

const costaRicaBounds = L.latLngBounds(
    L.latLng(8.0000, -85.0000), // Southwest
    L.latLng(11.0000, -82.0000) // Northeast
);

// Load saved comments if any exist
function loadSavedComments() {
    const saved = localStorage.getItem('locationComments');
    if (saved) {
        locationComments = JSON.parse(saved);
    }
}

// Save comments to localStorage
function saveComments() {
    localStorage.setItem('locationComments', JSON.stringify(locationComments));
}

document.addEventListener('DOMContentLoaded', () => {
    loadSavedComments(); // Load any existing comments
    initializeMap();
    initializeControls();
    initializeGeolocation();
    
    map.on('moveend', checkViewportForGeoJsonLoad);
    checkViewportForGeoJsonLoad();
});

function initializeMap() {
    map = L.map('map', {
        maxBounds: costaRicaBounds,
        maxBoundsVisibilty: true,
        minZoom: 7, // Minimum zoom level
        maxZoom: 18 // Maximum zoom level
    }).setView([9.7489, -83.7534], 7); // Centered on Costa Rica

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    drawnItems = new L.FeatureGroup().addTo(map);
    
    // Prevent panning outside the bounds
    map.setMaxBounds(costaRicaBounds);
}

function initializeControls() {
    // Initialize draw control
    const drawControl = new L.Control.Draw({
        draw: {
            polygon: true,
            polyline: false,
            rectangle: true,
            circle: true,
            marker: false,
            circlemarker: false
        },
        edit: {
            featureGroup: drawnItems
        }
    });
    map.addControl(drawControl);

    // Initialize geocoder
    const geocoder = L.Control.geocoder({
        defaultMarkGeocode: false
    })
    .on('markgeocode', function(e) {
        const bbox = e.geocode.bbox;
        const poly = L.polyline([
            [bbox.getSouthWest().lat, bbox.getSouthWest().lng],
            [bbox.getNorthEast().lat, bbox.getNorthEast().lng]
        ]).getBounds();
        map.fitBounds(poly);
    })
    .addTo(map);

    // Setup draw event handlers
    initializeDrawEvents();
}

function initializeDrawEvents() {
    map.on(L.Draw.Event.CREATED, handleDrawCreated);
    map.on(L.Draw.Event.EDITED, handleDrawEdited);
    map.on(L.Draw.Event.DELETED, handleDrawDeleted);
}

function handleDrawCreated(event) {
    const layer = event.layer;
    
    if (!costaRicaBounds.contains(layer.getBounds())) {
        alert("You can only draw within Costa Rica!");
        return;
    }

    const locationId = Date.now().toString();
    layer.locationId = locationId;
    drawnItems.addLayer(layer);
    
    showSafetyLevelModal(layer);
}

async function handleSafetyLevelSubmit(layer, modal, safetyLevelSelect, safetyMessageInput) {
    const safetyLevel = safetyLevelSelect.value;
    const safetyMessage = safetyMessageInput.value.trim();

    if (['green', 'yellow', 'red'].includes(safetyLevel)) {
        layer.setStyle({ color: safetyLevel });
        
        // Prepare data for API
        const coordinates = layer.getLatLngs();
        const shapeType = layer instanceof L.Polygon ? 'polygon' : 
                         layer instanceof L.Rectangle ? 'rectangle' : 'circle';
        
        const data = {
            shape_type: shapeType,
            coordinates: coordinates,
            safety_level: safetyLevel,
            safety_message: safetyMessage
        };

        // If it's a circle, add center and radius
        if (shapeType === 'circle') {
            data.center = layer.getLatLng();
            data.radius = layer.getRadius();
        }

        try {
            const response = await fetch('/api/areas/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) throw new Error('Failed to save area');
            
            const savedArea = await response.json();
            layer.areaId = savedArea.id;
            createLocationPopup(layer, safetyMessage);
            
        } catch (error) {
            console.error('Error saving area:', error);
            alert('Failed to save area. Please try again.');
        }

        modal.style.display = "none";
    } else {
        alert("Please select a safety level.");
    }
}

async function addComment(locationId) {
    const commentInput = document.getElementById(`comment-input-${locationId}`);
    const comment = commentInput.value.trim();
    
    if (comment) {
        try {
            const response = await fetch(`/api/areas/${locationId}/add_comment/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    text: comment,
                    author: 'Anonymous'
                })
            });

            if (!response.ok) throw new Error('Failed to save comment');
            
            const savedComment = await response.json();
            const commentsDiv = document.getElementById(`comments-${locationId}`);
            if (commentsDiv) {
                commentsDiv.innerHTML = renderComments(locationId);
            }
            
            commentInput.value = '';
            
        } catch (error) {
            console.error('Error saving comment:', error);
            alert('Failed to save comment. Please try again.');
        }
    }
}

function showSafetyLevelModal(layer) {
    const modal = document.getElementById("safetyLevelModal");
    const closeModal = document.getElementsByClassName("close")[0];
    const safetyLevelSelect = document.getElementById("safetyLevel");
    const safetyMessageInput = document.getElementById("safetyMessage");
    const submitButton = document.getElementById("submitSafetyLevel");

    modal.style.display = "block";

    closeModal.onclick = () => modal.style.display = "none";
    
    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    submitButton.onclick = () => handleSafetyLevelSubmit(layer, modal, safetyLevelSelect, safetyMessageInput);
}

function renderComments(locationId) {
    const comments = locationComments[locationId] || [];
    
    if (comments.length === 0) {
        return '<p class="no-comments">No comments yet. Be the first to comment!</p>';
    }
    
    return comments.map(comment => `
        <div class="comment">
            <div class="comment-header">
                <span class="comment-author">${comment.author}</span>
                <span class="comment-timestamp">${comment.timestamp}</span>
            </div>
            <div class="comment-text">${escapeHtml(comment.text)}</div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add the styles to a separate CSS file or in your HTML
const cssStyles = `
    .location-popup {
        padding: 10px;
        min-width: 200px;
    }
    
    .safety-message {
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 1px solid #eee;
        word-break: break-word;
    }
    
    .comments-section {
        max-height: 300px;
        overflow-y: auto;
    }
    
    .comments-list {
        margin-bottom: 15px;
    }
    
    .comment {
        margin-bottom: 10px;
        padding: 8px;
        background-color: #f8f9fa;
        border-radius: 4px;
        word-break: break-word;
    }
    
    .comment-header {
        display: flex;
        justify-content: space-between;
        font-size: 0.8em;
        color: #666;
        margin-bottom: 5px;
    }
    
    .comment-input {
        width: 100%;
        padding: 8px;
        margin-bottom: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        resize: vertical;
        box-sizing: border-box;
    }
    
    .comment-submit {
        background-color: #007bff;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
    }
    
    .comment-submit:hover {
        background-color: #0056b3;
    }
    
    .no-comments {
        color: #666;
        font-style: italic;
    }
    
    .leaflet-popup-content {
        margin: 0;
        padding: 0;
    }
`;

// Add styles to document
document.addEventListener('DOMContentLoaded', () => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = cssStyles;
    document.head.appendChild(styleSheet);
});

function checkViewportForGeoJsonLoad() {
    if (!isGeojsonLoaded && shouldLoadGeoJSON()) {
        loadGeoJSON();
    }
}

function shouldLoadGeoJSON() {
    // Customize these conditions based on your needs
    return map.getZoom() > 10;
}

function loadGeoJSON() {
    if (isGeojsonLoaded) return;
    isGeojsonLoaded = true;
    
    fetch('/static/map_app/geojson/costa_rica_multipolygons_simplified.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(geojsonData => {
            geojsonLayer = L.geoJSON(geojsonData, {
                style: feature => ({ 
                    color: regionColors[feature.properties.name] || 'transparent' 
                }),
                onEachFeature: (feature, layer) => {
                    drawnItems.addLayer(layer);
                }
            }).addTo(map);
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
            alert('Failed to load GeoJSON data. Please try again later.');
            isGeojsonLoaded = false; // Reset flag to allow retry
        });
}

function initializeGeolocation() {
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: '<div style="background-color: white; border-radius: 50%; width: 10px; height: 10px;"></div>',
        iconSize: [10, 10],
        iconAnchor: [5, 5]
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            position => {
                const { latitude: userLat, longitude: userLng } = position.coords;

                // Check if user location is within Costa Rica bounds
                if (!costaRicaBounds.contains([userLat, userLng])) {
                    alert('You are outside Costa Rica. The map will center on Costa Rica.');
                    map.setView([9.7489, -83.7534], 7); // Center to Costa Rica
                } else {
                    map.setView([userLat, userLng], 13);
                }

                L.marker([userLat, userLng], { icon: customIcon })
                    .addTo(map)
                    .bindPopup('You are here!')
                    .openPopup();
            },
            () => {
                alert('Unable to retrieve your location. Please check your location settings.');
            }
        );
    } else {
        alert('Geolocation is not supported by your browser.');
    }
}
