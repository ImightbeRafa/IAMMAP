// Global variables
let map;
let geojsonLayer;
let drawnItems;
let regionColors = {};
let isGeojsonLoaded = false;
let locationComments = {}; // This was missing from globals

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
    map = L.map('map').setView([9.7489, -83.7534], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    drawnItems = new L.FeatureGroup().addTo(map);
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
    const locationId = Date.now().toString(); // Unique ID for the location
    layer.locationId = locationId; // Attach ID to layer
    drawnItems.addLayer(layer);
    
    // Initialize comments array for this location
    locationComments[locationId] = [];
    saveComments(); // Save when new location is created
    
    showSafetyLevelModal(layer);
}

function handleDrawEdited(e) {
    // Logic for when an existing area's shape is edited
    const layers = e.layers;
    layers.eachLayer(function(layer) {
        // Handle edited layer
    });
}

function handleDrawDeleted(e) {
    // Logic for when an area is deleted
    const layers = e.layers;
    layers.eachLayer(function(layer) {
        if (layer.locationId) {
            // Remove comments for deleted location
            delete locationComments[layer.locationId];
            saveComments();
        }
    });
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

function handleSafetyLevelSubmit(layer, modal, safetyLevelSelect, safetyMessageInput) {
    const safetyLevel = safetyLevelSelect.value;
    const safetyMessage = safetyMessageInput.value.trim();

    if (['green', 'yellow', 'red'].includes(safetyLevel)) {
        layer.setStyle({ color: safetyLevel });
        regionColors[layer.locationId] = safetyLevel;

        // Create a popup with safety message and comments section
        createLocationPopup(layer, safetyMessage);

        modal.style.display = "none";
    } else {
        alert("Please select a safety level.");
    }
}

function createLocationPopup(layer, safetyMessage) {
    const locationId = layer.locationId;
    
    // Create popup content with escaped safety message
    const popupContent = document.createElement('div');
    popupContent.innerHTML = `
        <div class="location-popup">
            <div class="safety-message">
                <strong>Safety Message:</strong>
                <p>${escapeHtml(safetyMessage) || "No message provided"}</p>
            </div>
            <div class="comments-section">
                <h4>Comments</h4>
                <div id="comments-${locationId}" class="comments-list">
                    ${renderComments(locationId)}
                </div>
                <div class="comment-form">
                    <textarea id="comment-input-${locationId}" 
                        placeholder="Add your comment..."
                        class="comment-input"
                        rows="2"
                    ></textarea>
                    <button class="comment-submit" data-location-id="${locationId}">
                        Add Comment
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add event listener for the comment button using event delegation
    popupContent.querySelector('.comment-submit').addEventListener('click', function() {
        const locationId = this.getAttribute('data-location-id');
        addComment(locationId);
    });

    // Create and add the popup
    const popup = L.popup({
        maxWidth: 300,
        maxHeight: 400,
        autoPan: true,
        className: 'location-popup'
    });

    popup.setContent(popupContent);
    layer.bindPopup(popup);
    
    // Add click handler to show popup
    layer.on('click', () => {
        layer.openPopup();
    });
}

// Removed window.addComment and made it a regular function
function addComment(locationId) {
    const commentInput = document.getElementById(`comment-input-${locationId}`);
    const comment = commentInput.value.trim();
    
    if (comment) {
        // Add the new comment
        locationComments[locationId] = locationComments[locationId] || [];
        locationComments[locationId].push({
            text: comment,
            timestamp: new Date().toLocaleString(),
            author: 'Anonymous'
        });
        
        // Save comments
        saveComments();
        
        // Update the comments display
        const commentsDiv = document.getElementById(`comments-${locationId}`);
        if (commentsDiv) {
            commentsDiv.innerHTML = renderComments(locationId);
        }
        
        // Clear the input
        commentInput.value = '';
    }
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
    
    fetch('/costa_rica_multipolygons_simplified.geojson')
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
                map.setView([userLat, userLng], 13);
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
