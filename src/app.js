/**
 * Main Application Entry Point
 * Orchestrates the initialization of all components.
 */
import { initializeMap, updateVehicleMarker, setMapTheme } from "./components/map.js";
import { setupSidebar } from "./components/sidebar.js";
import { setupNavbar } from "./components/navbar.js";
import { VehicleSimulator } from "./utils/simulator.js";
import { initTheme } from "./utils/theme.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initialize the Base Map
  const map = initializeMap("map", [28.6139, 77.209], 13);

  // 2. Initialize Theme
  initTheme();
  const savedTheme = localStorage.getItem("vts-theme") || "light";
  setMapTheme(savedTheme);

  // 3. Initialize Components
  setupNavbar(map);
  const sidebar = await setupSidebar(map);

  // 4. Initialize Live Movement Simulation
  if (sidebar && sidebar.state.allVehicles) {
    const simulator = new VehicleSimulator(sidebar.state.allVehicles);
    simulator.start((updatedVehicle) => {
      updateVehicleMarker(updatedVehicle);
      sidebar.updateStatusCounts(); // Refresh counts in sidebar
    }, 1000); // Update every 1 second
  }

  console.log("Vehicle Tracking System Initialized Successfully");
});
