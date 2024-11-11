// Debug logging
console.log('Main.js loaded');

// Global variables
let map;
let geojsonLayer;
let drawnItems;
let regionColors = {};
let isGeojsonLoaded = false;
const API_BASE_URL = window.location.origin + '/api';

const costaRicaBounds = L.latLngBounds(
    L.latLng(8.0000, -85.0000), // Southwest
    L.latLng(11.0000, -82.0000)  // Northeast
);

document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM Content Loaded');
    try {
        initializeMap();
        console.log('Map initialized');
        initializeControls();
        console.log('Controls initialized');
        initializeGeolocation();
        console.log('Geolocation initialized');
        await loadExistingLocations();
        console.log('Existing locations loaded');
        
        map.on('moveend', checkViewportForGeoJsonLoad);
        checkViewportForGeoJsonLoad();
        console.log('Map event listeners added');
    } catch (error) {
        console.error('Error during initialization:', error);
    }
});

function initializeMap() {
    map = L.map('map', {
        maxBounds: costaRicaBounds,
        maxBoundsVisibilty: true,
        minZoom: 7,
        maxZoom: 18
    }).setView([9.7489, -83.7534], 7);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    
    drawnItems = new L.FeatureGroup().addTo(map);
    map.setMaxBounds(costaRicaBounds);
}

function initializeControls() {
    console.log('Initializing controls...');
    try {
        const drawControl = new L.Control.Draw({
            position: 'topleft',
            draw: {
                polyline: false,
                polygon: {
                    allowIntersection: false,
                    drawError: {
                        color: '#e1e100',
                        message: '<strong>Error:</strong> shape edges cannot cross!'
                    },
                    shapeOptions: {
                        color: '#3498db'
                    }
                },
                circle: {
                    shapeOptions: {
                        color: '#3498db'
                    },
                    showRadius: true,
                    metric: true,
                    feet: false
                },
                rectangle: {
                    shapeOptions: {
                        color: '#3498db'
                    }
                },
                circlemarker: false,
                marker: false
            },
            edit: {
                featureGroup: drawnItems,
                remove: true
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

        // Initialize draw events
        initializeDrawEvents();
        
        console.log('Controls initialization complete');
    } catch (error) {
        console.error('Error initializing controls:', error);
        throw error;
    }
}

function initializeDrawEvents() {
    console.log('Initializing draw events...');
    try {
        map.on(L.Draw.Event.CREATED, handleDrawCreated);
        map.on(L.Draw.Event.EDITED, handleDrawEdited);
        map.on(L.Draw.Event.DELETED, handleDrawDeleted);
        console.log('Draw events initialized');
    } catch (error) {
        console.error('Error initializing draw events:', error);
        throw error;
    }
}

async function handleDrawCreated(event) {
    const layer = event.layer;

    let isWithinBounds = false;
    if (layer instanceof L.Circle) {
        const center = layer.getLatLng();
        isWithinBounds = costaRicaBounds.contains(center);
    } else {
        isWithinBounds = costaRicaBounds.contains(layer.getBounds());
    }

    if (!isWithinBounds) {
        alert("You can only draw within Costa Rica!");
        return;
    }

    const locationId = Date.now().toString();
    layer.locationId = locationId;
    drawnItems.addLayer(layer);

    try {
        let geoJSON;
        if (layer instanceof L.Circle) {
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            geoJSON = {
                type: "Feature",
                properties: {
                    radius: radius
                },
                geometry: {
                    type: "Point",
                    coordinates: [center.lng, center.lat]
                }
            };
        } else {
            geoJSON = layer.toGeoJSON();
        }

        const response = await fetch(`${API_BASE_URL}/locations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                locationId,
                geometry: geoJSON.geometry,
                properties: geoJSON.properties,
                safetyLevel: 'green',
                safetyMessage: ''
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        layer.on('click', function() {
            if (!this.getPopup()) {
                createLocationPopup(this, '').then(() => {
                    this.openPopup();
                });
            } else {
                this.openPopup();
            }
        });

        showSafetyLevelModal(layer);
    } catch (error) {
        console.error('Error saving location:', error);
        alert('Failed to save location. Please try again.');
        drawnItems.removeLayer(layer);
    }
}

async function handleDrawEdited(e) {
    const layers = e.layers;
    layers.eachLayer(async function(layer) {
        try {
            const geoJSON = layer.toGeoJSON();
            await fetch(`${API_BASE_URL}/locations/${layer.locationId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    geometry: geoJSON.geometry
                })
            });
        } catch (error) {
            console.error('Error updating location:', error);
            alert('Failed to update location changes. Please try again.');
        }
    });
}

async function handleDrawDeleted(e) {
    const layers = e.layers;
    layers.eachLayer(async function(layer) {
        if (layer.locationId) {
            try {
                await fetch(`${API_BASE_URL}/locations/${layer.locationId}`, {
                    method: 'DELETE'
                });
            } catch (error) {
                console.error('Error deleting location:', error);
                alert('Failed to delete location. Please try again.');
            }
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

async function handleSafetyLevelSubmit(layer, modal, safetyLevelSelect, safetyMessageInput) {
    const safetyLevel = safetyLevelSelect.value;
    const safetyMessage = safetyMessageInput.value.trim();

    if (!['green', 'yellow', 'red'].includes(safetyLevel)) {
        alert("Please select a safety level.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/locations/${layer.locationId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                locationId: layer.locationId,
                geometry: layer.toGeoJSON().geometry,
                safetyLevel,
                safetyMessage
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        layer.setStyle({ color: safetyLevel });
        regionColors[layer.locationId] = safetyLevel;
        await createLocationPopup(layer, safetyMessage);
        modal.style.display = "none";
    } catch (error) {
        console.error('Error updating safety info:', error);
        alert('Failed to save safety information. Please try again.');
    }
}

async function createLocationPopup(layer, safetyMessage) {
    const locationId = layer.locationId;
    
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
                    ${await renderComments(locationId)}
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

    const commentButton = popupContent.querySelector('.comment-submit');
    commentButton.addEventListener('click', function() {
        const locationId = this.getAttribute('data-location-id');
        addComment(locationId);
    });

    const popup = L.popup({
        maxWidth: 300,
        maxHeight: 400,
        autoPan: true,
        className: 'location-popup'
    });

    popup.setContent(popupContent);
    layer.bindPopup(popup);

    return layer;
}

async function addComment(locationId) {
    const commentInput = document.getElementById(`comment-input-${locationId}`);
    const comment = commentInput.value.trim();
    
    if (!comment) return;

    try {
        const response = await fetch(`${API_BASE_URL}/locations/${locationId}/comments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: comment,
                author: 'Anonymous'
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const commentsDiv = document.getElementById(`comments-${locationId}`);
        if (commentsDiv) {
            commentsDiv.innerHTML = await renderComments(locationId);
        }
        
        commentInput.value = '';
    } catch (error) {
        console.error('Error adding comment:', error);
        alert('Failed to add comment. Please try again.');
    }
}

async function renderComments(locationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/locations/${locationId}/comments`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        const comments = data.comments || []; // Extract comments from response

        if (comments.length === 0) {
            return '<p class="no-comments">No comments yet. Be the first to comment!</p>';
        }
        
        return comments.map(comment => `
            <div class="comment">
                <div class="comment-header">
                    <span class="comment-author">${comment.author}</span>
                    <span class="comment-timestamp">${new Date(comment.timestamp).toLocaleString()}</span>
                </div>
                <div class="comment-text">${escapeHtml(comment.text)}</div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading comments:', error);
        return '<p class="error">Failed to load comments. Please try again later.</p>';
    }
}

async function loadExistingLocations() {
    try {
        const response = await fetch(`${API_BASE_URL}/locations`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Expected JSON response from server");
        }

        const data = await response.json();
        
        if (!Array.isArray(data)) {
            console.warn('Expected array of locations, got:', data);
            return;
        }
        
        for (const location of data) {
            try {
                let layer;
                if (location.geometry.type === "Point" && location.properties?.radius) {
                    // Create circle
                    layer = L.circle(
                        [location.geometry.coordinates[1], location.geometry.coordinates[0]], 
                        {
                            radius: location.properties.radius,
                            color: location.safetyLevel
                        }
                    );
                } else if (location.geometry.type === "Polygon") {
                    // Create polygon
                    layer = L.polygon(
                        location.geometry.coordinates[0].map(coord => [coord[1], coord[0]]),
                        { color: location.safetyLevel }
                    );
                } else if (location.geometry.type === "Rectangle") {
                    // Create rectangle
                    const bounds = L.latLngBounds(
                        location.geometry.coordinates[0].map(coord => [coord[1], coord[0]])
                    );
                    layer = L.rectangle(bounds, { color: location.safetyLevel });
                } else {
                    // Fallback for other shapes
                    layer = L.geoJSON(location.geometry, {
                        style: { color: location.safetyLevel }
                    });
                }
                
                layer.locationId = location.locationId;
                drawnItems.addLayer(layer);
                regionColors[location.locationId] = location.safetyLevel;

                // Create and bind popup
                await createLocationPopup(layer, location.safetyMessage);
                
                // Add click handler explicitly
                layer.on('click', function() {
                    if (!this.getPopup()) {
                        createLocationPopup(this, location.safetyMessage).then(() => {
                            this.openPopup();
                        });
                    } else {
                        this.openPopup();
                    }
                });
            } catch (err) {
                console.error('Error adding location to map:', err, location);
            }
        }
    } catch (error) {
        console.error('Error loading locations:', error);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = 'Unable to load locations. Please try again later.';
        document.body.appendChild(errorDiv);
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function checkViewportForGeoJsonLoad() {
    if (!isGeojsonLoaded && shouldLoadGeoJSON()) {
        loadGeoJSON();
    }
}

function shouldLoadGeoJSON() {
    return map.getZoom() > 10;
}

async function loadGeoJSON() {
    if (isGeojsonLoaded) return;
    isGeojsonLoaded = true;
    
    try {
        const response = await fetch('/costa_rica_multipolygons_simplified.geojson');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const geojsonData = await response.json();
        
        geojsonLayer = L.geoJSON(geojsonData, {
            style: feature => ({ 
                color: regionColors[feature.properties.name] || 'transparent' 
            }),
            onEachFeature: (feature, layer) => {
                drawnItems.addLayer(layer);
            }
        }).addTo(map);
    } catch (error) {
        console.error('Error loading GeoJSON:', error);
        alert('Failed to load GeoJSON data. Please try again later.');
        isGeojsonLoaded = false;
    }
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

                if (!costaRicaBounds.contains([userLat, userLng])) {
                    alert('You are outside Costa Rica. The map will center on Costa Rica.');
                    map.setView([9.7489, -83.7534], 7);
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