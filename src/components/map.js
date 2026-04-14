/**
 * Map Component
 * Handles Leaflet initialization, marker management, and clustering.
 */

const STATUS_COLORS = {
  Moving: "#28a745",
  Idle: "#ffc107",
  Stopped: "#dc3545",
  Offline: "#808080",
};

let map;
let markerClusterGroup;
const activeMarkers = new Map();

/**
 * Initializes the Leaflet map with OpenStreetMap tiles and marker clustering.
 * @param {string} mapId - ID of the container element.
 * @param {Array} center - [latitude, longitude] for initial center.
 * @param {number} zoom - Initial zoom level.
 * @returns {L.Map}
 */
export function initializeMap(mapId, center, zoom) {
  map = L.map(mapId, {
    zoomControl: false,
    minZoom: 3,
    maxZoom: 18,
  }).setView(center, zoom);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
  }).addTo(map);

  L.control.zoom({ position: "bottomright" }).addTo(map);

  markerClusterGroup = L.markerClusterGroup();
  map.addLayer(markerClusterGroup);

  return map;
}

/**
 * Creates a custom SVG icon for a vehicle based on its status.
 * @param {string} status - Vehicle status.
 * @returns {L.DivIcon}
 */
function createVehicleIcon(status) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.Offline;

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 -960 960 960" width="36px" fill="${color}">
      <path d="m319-280 161-73 161 73 15-15-176-425-176 425 15 15ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
    </svg>`;

  return L.divIcon({
    html: svgIcon,
    className: "vehicle-custom-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

/**
 * Adds or pans to a vehicle marker on the map.
 * @param {Object} vehicle - Vehicle data object.
 * @param {boolean} shouldOpenPopup - Whether to open the popup after adding.
 */
export function addVehicleMarker(vehicle, shouldOpenPopup = true) {
  if (activeMarkers.has(vehicle.id)) {
    if (shouldOpenPopup) panToMarker(vehicle.id);
    return;
  }

  const icon = createVehicleIcon(vehicle.status);
  const marker = L.marker([vehicle.latitude, vehicle.longitude], {
    icon: icon,
  });

  const popupContent = `
    <div class="vehicle-popup">
      <strong>${vehicle.name}</strong><br>
      <span>Status: ${vehicle.status}</span><br>
      <span>Driver: ${vehicle.driver}</span><br>
      <span>Speed: ${vehicle.speed} km/h</span>
    </div>
  `;

  marker.bindPopup(popupContent);
  marker.bindTooltip(vehicle.name, {
    permanent: true,
    direction: "bottom",
    className: "vehicle-label",
    offset: [0, 5],
  });

  markerClusterGroup.addLayer(marker);
  activeMarkers.set(vehicle.id, marker);

  if (shouldOpenPopup) {
    markerClusterGroup.zoomToShowLayer(marker, () => {
      if (marker._map) marker.openPopup();
    });
  }
}

/**
 * Removes a vehicle marker from the map.
 * @param {string} vehicleId - Unique ID of the vehicle.
 */
export function removeVehicleMarker(vehicleId) {
  const marker = activeMarkers.get(vehicleId);
  if (marker) {
    markerClusterGroup.removeLayer(marker);
    activeMarkers.delete(vehicleId);
  }
}

/**
 * Pans the map to a specific vehicle marker and shows its popup.
 * @param {string} vehicleId - Unique ID of the vehicle.
 */
export function panToMarker(vehicleId) {
  const marker = activeMarkers.get(vehicleId);
  if (marker && markerClusterGroup.hasLayer(marker)) {
    markerClusterGroup.zoomToShowLayer(marker, () => {
      if (marker._map) {
        marker.openPopup();
      }
    });
  }
}

/**
 * Checks if a vehicle marker is currently active on the map.
 * @param {string} vehicleId - Unique ID of the vehicle.
 * @returns {boolean}
 */
export function isMarkerActive(vehicleId) {
  return activeMarkers.has(vehicleId);
}

/**
 * Removes all vehicle markers from the map.
 */
export function clearAllMarkers() {
  markerClusterGroup.clearLayers();
  activeMarkers.clear();
}
