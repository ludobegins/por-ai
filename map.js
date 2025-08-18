mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

// Initialize the map
const map = new mapboxgl.Map({
    container: 'map', // container ID
    style: 'mapbox://styles/mapbox/outdoors-v12', // A beautiful satellite-streets style
    center: [-55, -10], // Initial center point of the map [lng, lat]
    zoom: 3.5, // Initial zoom level
    pitch: 45,   // Initial pitch in degrees to show the 3D effect
    bearing: -17.6 // Initial bearing in degrees
});

map.on('load', () => {
    // Add 3D terrain
    map.addSource('mapbox-dem', {
        'type': 'raster-dem',
        'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
        'tileSize': 512,
        'maxzoom': 14
    });
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 1.5 });

    // Fetch the GeoJSON data
    fetch('data.geojson')
        .then(response => response.json())
        .then(data => {
            // Add the points (your stops) to the map
            map.addSource('journey-points', {
                type: 'geojson',
                data: data
            });

            // Layer for the points (as circles)
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
            map.addSource('route-lines', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: routeLines
                }
            });

            // Add the lines layer with conditional styling
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
                    // Style the line based on the 'transport' property
                    'line-color': [
                        'match',
                        ['get', 'transport'],
                        'bicycle', '#ff7e5f', // Color for bicycle
                        'boat', '#00a8cc',      // Color for boat
                        /* default */ '#ff7e5f'
                    ],
                    'line-dasharray': [
                        'case',
                        ['==', ['get', 'transport'], 'boat'],
                        ['literal', [2, 2]], // Dashed line for boat
                        ['literal', []]      // Solid line for others
                    ]
                }
            });

            // --- Interactivity: Popups and Hover Effect ---

            // Create a popup, but don't add it to the map yet.
            const popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false
            });

            map.on('mouseenter', 'points-layer', (e) => {
                map.getCanvas().style.cursor = 'pointer'; // Change cursor to a pointer

                const coordinates = e.features[0].geometry.coordinates.slice();
                const properties = e.features[0].properties;

                // Ensure that if the map is zoomed out such that multiple
                // copies of the feature are visible, the popup appears
                // over the copy being pointed to.
                while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
                    coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
                }
                
                const popupContent = `
                    <h3>${properties.place_name}</h3>
                    <strong class="popup-date">Arrived: ${properties.arrival_date}</strong>
                    <p>${properties.notes}</p>
                `;

                popup.setLngLat(coordinates).setHTML(popupContent).addTo(map);
            });

            map.on('mouseleave', 'points-layer', () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });
        });
});