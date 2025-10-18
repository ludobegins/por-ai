mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/outdoors-v12',
    center: [-47, -4],
    zoom: 3,
    pitch: 45,
    bearing: -17.6,
    fog: {
        'range': [-1, 2],
        'color': '#ffffff',
        'horizon-blend': 0.3
    }
});

const mapStyles = {
    'outdoors-v12': 'mapbox://styles/mapbox/outdoors-v12',
    'dark-v11': 'mapbox://styles/mapbox/dark-v11',
    'satellite-streets-v12': 'mapbox://styles/mapbox/satellite-streets-v12'
};

function addJourneyData(map) {
    if (!map.getSource('mapbox-dem')) {
        map.addSource('mapbox-dem', {
            'type': 'raster-dem',
            'url': 'mapbox://mapbox.mapbox-terrain-dem-v1',
            'tileSize': 512,
            'maxzoom': 14
        });
    }
    map.setTerrain({ 'source': 'mapbox-dem', 'exaggeration': 2 });

    fetch('data.geojson')
        .then(response => response.json())
        .then(data => {
            if (!map.getSource('journey-points')) {
                map.addSource('journey-points', {
                    type: 'geojson',
                    data: data
                });
            }

            if (!map.getLayer('points-layer')){
                map.addLayer({
                    id: 'points-layer',
                    type: 'circle',
                    source: 'journey-points',
                    paint: {
                        'circle-radius': 6,
                        'circle-stroke-width': 1,
                        'circle-color': '#007cbf',
                        'circle-stroke-color': 'white'
                    }
                });
            }

            const routeLines = [];
            const points = data.features;

            for (let i = 1; i < points.length; i++) {
                const startPoint = points[i - 1].geometry.coordinates;
                const endPoint = points[i].geometry.coordinates;
                const transport = points[i].properties.transport_to_here;

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

            if (!map.getSource('route-lines')){
                map.addSource('route-lines', {
                    type: 'geojson',
                    data: {
                        type: 'FeatureCollection',
                        features: routeLines
                    }
                });
            }

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
                            '#ff7e5f'
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

                const langSuffix = currentLanguage === 'pt-br' ? '_pt' : '_en';
                const place_name = properties['place_name' + langSuffix] || properties['place_name_pt'];
                const notes = properties['notes' + langSuffix] || properties['notes_pt'];
                const arrivalLabel = translations[currentLanguage]['arrival-label'];

                let kmInfoHTML = '';
                if (properties.hasOwnProperty('km_traveled') && typeof properties.km_traveled === 'number') {
                    const kmLabel = translations[currentLanguage]['km-label'];
                    if (properties.km_traveled > 0) {
                    kmInfoHTML = `<span class="popup-km">${kmLabel}: ${properties.km_traveled} km</span>`;
                    }
                }

                const popupContent = `
                    <h3>${place_name}</h3>
                    <strong class="popup-date">${arrivalLabel}: ${properties.arrival_date}</strong>
                    ${kmInfoHTML}
                    <p>${notes}</p>
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

map.on('style.load', () => {
    addJourneyData(map);
});

const styleToggleButton = document.getElementById('style-toggle-btn');
const radioGroup = document.querySelector('.radio-group');

styleToggleButton.addEventListener('click', () => {
    radioGroup.classList.toggle('hidden');
});

const layerToggles = document.querySelector('.radio-group');
layerToggles.addEventListener('change', (e) => {
    const newStyle = e.target.value;
    map.setStyle(mapStyles[newStyle]);
    radioGroup.classList.add('hidden');
});