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
const activeGeofences = new Map();
const activeLandmarks = new Map();

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
function createVehicleIcon(status, heading = 0) {
  const color = STATUS_COLORS[status] || STATUS_COLORS.Offline;

  const svgIcon = `
    <div class="vehicle-icon-wrapper" style="transform: rotate(${heading}deg);">
      <svg xmlns="http://www.w3.org/2000/svg" height="36px" viewBox="0 -960 960 960" width="36px" fill="${color}">
        <path d="m319-280 161-73 161 73 15-15-176-425-176 425 15 15ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/>
      </svg>
    </div>`;

  return L.divIcon({
    html: svgIcon,
    className: "vehicle-custom-icon",
    iconSize: [36, 36],
    iconAnchor: [18, 18], // Center anchor for rotation
    popupAnchor: [0, -18],
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

  const icon = createVehicleIcon(vehicle.status, vehicle.heading);
  const marker = L.marker([vehicle.latitude, vehicle.longitude], {
    icon: icon,
  });

  const popupContent = `
    <div class="vehicle-popup">
      <div class="popup-header">
        <i class="fa-solid fa-truck-velocity"></i>
        <strong>${vehicle.name}</strong>
      </div>
      <div class="popup-body">
        <div class="popup-row">
          <span class="label">Status</span>
          <span class="status-badge" style="background-color: ${STATUS_COLORS[vehicle.status]}20; color: ${STATUS_COLORS[vehicle.status]}">${vehicle.status}</span>
        </div>
        <div class="popup-row">
          <span class="label">Driver</span>
          <span class="value">${vehicle.driver}</span>
        </div>
        <div class="popup-row">
          <span class="label">Speed</span>
          <span class="value">${vehicle.speed} km/h</span>
        </div>
      </div>
    </div>
  `;

  marker.bindPopup(popupContent);
  marker.bindTooltip(vehicle.name, {
    permanent: true,
    direction: "bottom",
    className: "vehicle-label",
    offset: [0, 10],
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
 * Updates an existing vehicle marker's position and popup content.
 * @param {Object} vehicle - Updated vehicle data object.
 */
export function updateVehicleMarker(vehicle) {
  const marker = activeMarkers.get(vehicle.id);
  if (!marker) return;

  // Update position
  marker.setLatLng([vehicle.latitude, vehicle.longitude]);

  // Update rotation
  const iconElement = marker.getElement();
  if (iconElement) {
    const wrapper = iconElement.querySelector(".vehicle-icon-wrapper");
    if (wrapper) {
      wrapper.style.transform = `rotate(${vehicle.heading || 0}deg)`;
    }
  }

  // Update popup content with new speed and status
  const popupContent = `
    <div class="vehicle-popup">
      <div class="popup-header">
        <i class="fa-solid fa-truck-velocity"></i>
        <strong>${vehicle.name}</strong>
      </div>
      <div class="popup-body">
        <div class="popup-row">
          <span class="label">Status</span>
          <span class="status-badge" style="background-color: ${STATUS_COLORS[vehicle.status]}20; color: ${STATUS_COLORS[vehicle.status]}">${vehicle.status}</span>
        </div>
        <div class="popup-row">
          <span class="label">Driver</span>
          <span class="value">${vehicle.driver}</span>
        </div>
        <div class="popup-row">
          <span class="label">Speed</span>
          <span class="value">${vehicle.speed}</span>
        </div>
      </div>
    </div>
  `;
  marker.setPopupContent(popupContent);

  // Update label position is handled by Leaflet automatically when LatLng changes
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
 
/**
 * Adds a geofence (polygon) to the map.
 * @param {Object} geofenceData - Geofence data with points and metadata.
 */
export function addGeofence(geofenceData) {
  const id = geofenceData.id.toString();
  if (activeGeofences.has(id)) return;

  const latLngs = geofenceData.points.map((p) => [p.lat, p.lon]);
  const polygon = L.polygon(latLngs, {
    color: "var(--primary-color)",
    fillColor: "var(--primary-color)",
    fillOpacity: 0.1,
    weight: 2,
  }).addTo(map);

  // Add Popup with details
  const popupContent = `
    <div class="geofence-popup">
      <div class="popup-header">
        <i class="fa-solid fa-draw-polygon"></i>
        <strong>${geofenceData.name}</strong>
      </div>
      <div class="popup-body">
        <div class="popup-row">
          <span class="label">Group</span>
          <span class="value">${geofenceData.groupName || "General"}</span>
        </div>
        <div class="popup-row">
          <span class="label">Area</span>
          <span class="value">${geofenceData.area || 0} sq m</span>
        </div>
        <div class="popup-row">
          <span class="label">Type</span>
          <span class="value">Polygon</span>
        </div>
      </div>
    </div>
  `;
  polygon.bindPopup(popupContent);

  activeGeofences.set(id, polygon);
  
  // Zoom/Pan map to fit the geofence
  map.fitBounds(polygon.getBounds());
}

/**
 * Removes a geofence from the map.
 * @param {string} geofenceId - Unique ID of the geofence.
 */
export function removeGeofence(geofenceId) {
  const id = geofenceId.toString();
  const polygon = activeGeofences.get(id);
  if (polygon) {
    map.removeLayer(polygon);
    activeGeofences.delete(id);
  }
}

/**
 * Creates a custom SVG icon for a landmark.
 * @returns {L.DivIcon}
 */
function createLandmarkIcon() {
  return L.divIcon({
    html: `<div class="landmark-marker"><i class="fa-solid fa-location-dot"></i></div>`,
    className: "custom-landmark-icon",
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
}

/**
 * Adds a landmark marker to the map.
 * @param {Object} landmarkData - Landmark data with coordinates and metadata.
 */
export function addLandmark(landmarkData) {
  const id = landmarkData.id.toString();
  if (activeLandmarks.has(id)) return;

  const icon = createLandmarkIcon();
  const marker = L.marker([landmarkData.lat, landmarkData.lon], {
    icon: icon,
  }).addTo(map);

  // Add Popup with details
  const popupContent = `
    <div class="landmark-popup">
      <div class="popup-header" style="color: var(--danger-color)">
        <i class="fa-solid fa-location-dot"></i>
        <strong>${landmarkData.name}</strong>
      </div>
      <div class="popup-body">
        <div class="popup-row">
          <span class="label">Group</span>
          <span class="value">${landmarkData.groupName || "General"}</span>
        </div>
        <div class="popup-row">
          <span class="label">Coordinates</span>
          <span class="value">${landmarkData.lat.toFixed(4)}, ${landmarkData.lon.toFixed(4)}</span>
        </div>
      </div>
    </div>
  `;
  marker.bindPopup(popupContent);


  activeLandmarks.set(id, marker);
  
  // Pan to landmark
  map.panTo([landmarkData.lat, landmarkData.lon]);
}

/**
 * Removes a landmark from the map.
 * @param {string} landmarkId - Unique ID of the landmark.
 */
export function removeLandmark(landmarkId) {
  const id = landmarkId.toString();
  const marker = activeLandmarks.get(id);
  if (marker) {
    map.removeLayer(marker);
    activeLandmarks.delete(id);
  }
}