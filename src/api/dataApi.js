/**
 * Logic for fetching data from JSON sources.
 */

export async function fetchVehicles() {
  try {
    const response = await fetch("assets/data/vehicles.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch vehicles:", error);
    throw error;
  }
}

export async function fetchGeofences() {
  try {
    const response = await fetch("assets/data/geofences.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch geofences:", error);
    throw error;
  }
}

export async function fetchLandmarks() {
  try {
    const response = await fetch("assets/data/landmarks.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Failed to fetch landmarks:", error);
    throw error;
  }
}
