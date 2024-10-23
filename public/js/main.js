document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map').setView([9.7489, -83.7534], 7); // Default view
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let drawnItems = new L.FeatureGroup().addTo(map);
    let regionColors = {};

    // Initialize the draw control
    let drawControl = new L.Control.Draw({
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

    // Add the geocoder control
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

    // Create layer for GeoJSON
    let geojsonLayer;

    // Load GeoJSON
    fetch('/costa_rica_multipolygons_simplified.geojson')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(geojsonData => {
            geojsonLayer = L.geoJSON(geojsonData, {
                style: feature => ({ color: regionColors[feature.properties.name] || 'transparent' }),
                onEachFeature: (feature, layer) => {
                    drawnItems.addLayer(layer);
                }
            }).addTo(map);

            // Event for when a new draw is created
            map.on(L.Draw.Event.CREATED, function (event) {
                let layer = event.layer;
                drawnItems.addLayer(layer);

                // Show the modal instead of prompt
                const modal = document.getElementById("safetyLevelModal");
                const closeModal = document.getElementsByClassName("close")[0];
                const safetyLevelSelect = document.getElementById("safetyLevel");
                const safetyMessageInput = document.getElementById("safetyMessage");
                const submitButton = document.getElementById("submitSafetyLevel");

                // Open the modal
                modal.style.display = "block";

                // Close the modal when the user clicks on <span> (x)
                closeModal.onclick = function() {
                    modal.style.display = "none";
                }

                // Close the modal when the user clicks outside of the modal
                window.onclick = function(event) {
                    if (event.target == modal) {
                        modal.style.display = "none";
                    }
                }

                // Handle the submit button click
                submitButton.onclick = function() {
                    const safetyLevel = safetyLevelSelect.value;
                    const safetyMessage = safetyMessageInput.value.trim();
                    if (['green', 'yellow', 'red'].includes(safetyLevel)) {
                        layer.setStyle({ color: safetyLevel });
                        regionColors[Date.now()] = safetyLevel; // Consider using a better unique ID

                        // Add a marker with the safety message
                        const marker = L.marker(layer.getBounds().getCenter()).addTo(map);
                        marker.bindPopup(safetyMessage || "No message provided").openPopup();

                        modal.style.display = "none"; // Close the modal
                    } else {
                        alert("Please select a safety level.");
                    }
                }
            });

            // Handle edits or deletions if you allow them
            map.on(L.Draw.Event.EDITED, function (e) {
                // Logic for when an existing area's shape is edited
            });

            map.on(L.Draw.Event.DELETED, function (e) {
                // Logic for when an area is deleted
            });
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
            alert('Failed to load GeoJSON data. Please try again later.');
        });

    // Get the user's current location
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            map.setView([userLat, userLng], 13); // Set the map view to the user's location
            L.marker([userLat, userLng]).addTo(map) // Add a marker at the user's location
                .bindPopup('You are here!')
                .openPopup();
        }, () => {
            alert('Unable to retrieve your location. Please check your location settings.');
        });
    } else {
        alert('Geolocation is not supported by your browser.');
    }
});
