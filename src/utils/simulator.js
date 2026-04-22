/**
 * Vehicle Simulator
 * Simulates movement and status updates for vehicles on the frontend.
 */
export class VehicleSimulator {
  /**
   * @param {Array} vehicles - Array of vehicle objects to simulate.
   */
  constructor(vehicles) {
    this.vehicles = vehicles;
    this.intervalId = null;
    this.isRunning = false;
  }

  /**
   * Starts the simulation.
   * @param {Function} onUpdate - Callback function executed on every update tick.
   * @param {number} interval - Interval in milliseconds (default 3000ms).
   */
  start(onUpdate, interval = 3000) {
    if (this.isRunning) return;

    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.simulateMovement(onUpdate);
    }, interval);

    console.log("Vehicle Simulation Started");
  }

  /**
   * Stops the simulation.
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log("Vehicle Simulation Stopped");
  }

  /**
   * Internal logic to update vehicle positions and metadata.
   * @param {Function} onUpdate - Callback for each updated vehicle.
   */
  simulateMovement(onUpdate) {
    this.vehicles.forEach((vehicle) => {
      // Only simulate movement for "Moving" vehicles
      if (vehicle.status === "Moving") {
        // 1. Update Coordinates (Small random offset)
        const oldLat = vehicle.latitude;
        const oldLng = vehicle.longitude;
        
        const latOffset = (Math.random() - 0.5) * 0.00015;
        const lngOffset = (Math.random() - 0.5) * 0.00015;

        vehicle.latitude += latOffset;
        vehicle.longitude += lngOffset;

        // 2. Calculate Heading (Bearing)
        const angle = Math.atan2(lngOffset, latOffset) * (180 / Math.PI);
        vehicle.heading = angle;

        // 3. Fluctuat Speed (between 40 and 100 for moving)
        const currentSpeed = parseInt(vehicle.speed) || 40;
        const speedChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
        let newSpeed = Math.max(10, Math.min(120, currentSpeed + speedChange));
        vehicle.speed = `${newSpeed} km/h`;

        // 3. Occasionally change status randomly (optional, for realism)
        // 5% chance to stop
        if (Math.random() < 0.05) {
          vehicle.status = "Stopped";
          vehicle.speed = "0 km/h";
        }

        onUpdate(vehicle);
      } else if (vehicle.status === "Stopped" || vehicle.status === "Idle") {
        // 10% chance to start moving again
        if (Math.random() < 0.1) {
          vehicle.status = "Moving";
          vehicle.speed = "30 km/h";
          onUpdate(vehicle);
        }
      }
    });
  }
}
