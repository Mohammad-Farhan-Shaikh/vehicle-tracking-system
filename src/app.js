/**
 * Main Application Entry Point
 * Orchestrates the initialization of all components.
 */
import { initializeMap } from "./components/map.js";
import { setupSidebar } from "./components/sidebar.js";
import { setupNavbar } from "./components/navbar.js";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Initialize the Base Map
  // Position: New Delhi, Zoom: 13
  const map = initializeMap("map", [28.6139, 77.209], 13);

  // 2. Initialize Components
  setupNavbar(map);
  await setupSidebar(map);

  console.log("Vehicle Tracking System Initialized Successfully");
});
