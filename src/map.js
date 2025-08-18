mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/outdoors-v12', // A beautiful satellite-streets style
    center: [-47, -4], // Initial center point of the map [lng, lat]
    zoom: 3, // Initial zoom level
    pitch: 45,   // Initial pitch in degrees to show the 3D effect
    bearing: -17.6, // Initial bearing in degrees
    fog: {
        'range': [-1, 2], // The distance range where fog starts and ends
        'color': '#ffffff', // The color of the fog (white)
        'horizon-blend': 0.3 // A small blend at the horizon for a smoother transition
    }
});

const mapStyles = {
    'outdoors-v12': 'mapbox://styles/mapbox/outdoors-v12',
    'dark-v11': 'mapbox://styles/mapbox/dark-v11',
    'satellite-streets-v12': 'mapbox://styles/mapbox/satellite-streets-v12'
};

function addJourneyData(map) {
    // Add 3D terrain
    if (!map.getSource('mapbox-dem')) {
            map.addSource('mapbox-dem', {
                'type': 'raster-dem',
                'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
                'tileSize': 512,
                'maxzoom': 14
            });
        }
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 2 });

    // Fetch the GeoJSON data
    fetch('data.geojson')
        .then(response => response.json())
        .then(data => {
            // Add the points (your stops) to the map
            if (!map.getSource('journey-points')) {
                map.addSource('journey-points', {
                    type: 'geojson',
                    data: data
                });
            }

            // Layer for the points (as circles)
            if (!map.getLayer('points-layer')){
                map.addLayer({
                    id: 'points-layer',
                    type: 'circle',
                    source: 'journey-points',
                    paint: {
                        'circle-radius': 6,
                        'circle-stroke-width': 2,
                        'circle-color': '#007cbf',
                        'circle-stroke-color': 'white'
                    }
                });
            }

            // --- Create and add the route lines ---
            const routeLines = [];
            const points = data.features;

            for (let i = 1; i < points.length; i++) {
                const startPoint = points[i - 1].geometry.coordinates;
                const endPoint = points[i].geometry.coordinates;
                const transport = points[i].properties.transport_to_here;

                // Create a GeoJSON LineString feature
                routeLines.push({
                    type: 'Feature',
                    geometry: {
                        type: 'LineString',
                        coordinates: [startPoint, endPoint]
                    },
                    properties: {
                        transport: transport
                    }
                });
            }

            // Add the lines source
            if (!map.getSource('route-lines')){
                map.addSource('route-lines', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: routeLines
                    }
                });
            }

            // Add the lines layer with conditional styling
            if (!map.getLayer('lines-layer')){
                map.addLayer({
                    id: 'lines-layer',
                    type: 'line',
                    source: 'route-lines',
                    layout: {
                        'line-join': 'round',
                        'line-cap': 'round'
                    },
                    paint: {
                        'line-width': 3,
                        'line-color': [
                            'match',
                            ['get', 'transport'],
                            'bicycle', '#ff7e5f',
                            'boat', '#00a8cc',
                            /* default */ '#ff7e5f'
                        ],
                        'line-dasharray': [
                            'case',
                            ['==', ['get', 'transport'], 'boat'],
                            ['literal', [2, 2]],
                            ['literal', []]
                        ]
                    }
                });
            }

            // --- Interactivity: Popups and Hover Effect ---
            const popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false
            });

            map.on('mouseenter', 'points-layer', (e) => {
                map.getCanvas().style.cursor = 'pointer';

                const coordinates = e.features[0].geometry.coordinates.slice();
                const properties = e.features[0].properties;

                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }

                const popupContent = `
                    <h3>${properties.place_name}</h3>
                    <strong class="popup-date">Chegada: ${properties.arrival_date}</strong>
                    <p>${properties.notes}</p>
                `;

                popup.setLngLat(coordinates).setHTML(popupContent).addTo(map);
            });

            map.on('mouseleave', 'points-layer', () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });
        });
}

map.on('load', () => {
    addJourneyData(map);
});

// Re-add sources and layers after a style change
map.on('style.load', () => {
    if (map.getLayer('points-layer')) return; // Prevents re-adding if not needed
    addJourneyData(map);
});

const styleToggleButton = document.getElementById('style-toggle-btn');
const radioGroup = document.querySelector('.radio-group');

styleToggleButton.addEventListener('click', () => {
    radioGroup.classList.toggle('hidden');
});

// Event listener for the style switcher
const layerToggles = document.querySelector('.radio-group');
layerToggles.addEventListener('change', (e) => {
    const newStyle = e.target.value;
    map.setStyle(mapStyles[newStyle]);
    radioGroup.classList.add('hidden'); // Collapse the menu after a selection
});