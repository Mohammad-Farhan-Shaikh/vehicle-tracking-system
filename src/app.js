/**
 * Main Application Entry Point
 * Orchestrates the initialization of all components.
 */
import { initializeMap, updateVehicleMarker } from "./components/map.js";
import { setupSidebar } from "./components/sidebar.js";
import { setupNavbar } from "./components/navbar.js";
import { VehicleSimulator } from "./utils/simulator.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initialize the Base Map
  // Position: New Delhi, Zoom: 13
  const map = initializeMap("map", [28.6139, 77.209], 13);

  // 2. Initialize Components
  setupNavbar(map);
  const state = await setupSidebar(map);

  // 3. Initialize Live Movement Simulation
  if (state && state.allVehicles) {
    const simulator = new VehicleSimulator(state.allVehicles);
    simulator.start((updatedVehicle) => {
      updateVehicleMarker(updatedVehicle);
    }, 1000); // Update every 1 second
  }

  console.log("Vehicle Tracking System Initialized Successfully");
});
