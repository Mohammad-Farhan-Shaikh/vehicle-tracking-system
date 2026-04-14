/**
 * Sets up the navbar functionality, such as zoom level display.
 * @param {L.Map} map - The Leaflet map instance.
 */
export function setupNavbar(map) {
  const zoomLevelDisplay = document.getElementById("zoom-level");
  if (!zoomLevelDisplay) return;

  const updateZoomDisplay = () => {
    zoomLevelDisplay.textContent = map.getZoom();
  };

  map.on("zoomend", updateZoomDisplay);
  updateZoomDisplay(); // Initial set
}
