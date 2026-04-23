import {
  addVehicleMarker,
  removeVehicleMarker,
  panToMarker,
  isMarkerActive,
  clearAllMarkers,
  addGeofence,
  removeGeofence,
  addLandmark,
  removeLandmark,
} from "./map.js";
import { fetchVehicles, fetchGeofences, fetchLandmarks } from "../api/dataApi.js";
import { debounce, toggleCollapse } from "../utils/helpers.js";

/**
 * Sidebar Component
 * Handles vehicle listing, searching, filtering, and selection.
 * @param {L.Map} map - The Leaflet map instance.
 */
export async function setupSidebar(map) {
  const vehicleDataMap = new Map();
  const geofenceDataMap = new Map();
  const landmarkDataMap = new Map();
  const state = {
    groups: [],
    allVehicles: [],
    geofenceGroups: [],
    landmarkGroups: [],
    searchQuery: "",
    activeFilter: "All",
  };

  const elements = {
    // ... Main scrollable content ...
    sidebarContent: document.querySelector(".sidebar-content"),
    
    // ... Existing vehicle elements ...
    subGroupsList: document.getElementById("sub-groups-list"),
    totalCountSpan: document.getElementById("total-vehicle-count"),
    masterCheckbox: document.getElementById("master-checkbox"),

    // ... New Geofence elements ...
    geofenceSubList: document.getElementById("geofence-list"),
    totalGeofenceSpan: document.getElementById("total-geofence-count"),
    geofenceMasterCheckbox: document.getElementById("geofence-master-checkbox"),

    // ... New Landmark elements ...
    landmarkSubList: document.getElementById("landmark-list"),
    totalLandmarkSpan: document.getElementById("total-landmark-count"),
    landmarkMasterCheckbox: document.getElementById("landmark-master-checkbox"),

    sidebar: document.getElementById("sidebar"),
    toggleBtn: document.getElementById("sidebar-toggler"),
    searchInput: document.getElementById("sidebar-search-input"),
    searchIcon: document.getElementById("search-icon"),
    clearBtn: document.getElementById("search-clear-btn"),
    filterBtns: document.querySelectorAll(".filter-btn"),
  };

  /**
   * Loads vehicle data using the API module.
   */
  const loadData = async () => {
    try {
      const [vehicleData, geofenceData, landmarkData] = await Promise.all([
        fetchVehicles(),
        fetchGeofences(),
        fetchLandmarks(),
      ]);

      state.groups = vehicleData.vehicle_groups;
      state.allVehicles = state.groups.flatMap((group) => group.vehicles);
      state.allVehicles.forEach((v) => vehicleDataMap.set(v.id, v));

      state.geofenceGroups = geofenceData;
      state.geofenceGroups.forEach(group => {
        group.routes.forEach(route => {
          // Store parent group name inside the route object for the map popup
          const geofenceWithGroup = { ...route, groupName: group.name };
          geofenceDataMap.set(route.id.toString(), geofenceWithGroup);
        });
      });
      state.landmarkGroups = landmarkData;
      state.landmarkGroups.forEach(group => {
        group.landmarks.forEach(landmark => {
          const landmarkWithGroup = { ...landmark, groupName: group.name };
          landmarkDataMap.set(landmark.id.toString(), landmarkWithGroup);
        });
      });

      updateSidebarView(true);
      updateStatusCounts();
    } catch (error) {
      console.error("Data loading error:", error);
    }
  };

  /**
   * Updates the real-time status counts in the filter buttons.
   */
  const updateStatusCounts = () => {
    const counts = {
      All: state.allVehicles.length,
      Moving: 0,
      Idle: 0,
      Stopped: 0,
    };

    state.allVehicles.forEach((v) => {
      if (counts.hasOwnProperty(v.status)) {
        counts[v.status]++;
      }
    });

    Object.keys(counts).forEach((status) => {
      const el = document.getElementById(`count-${status.toLowerCase()}`);
      if (el) el.textContent = counts[status];
    });
  };

  /**
   * Updates the sidebar view based on search and status filters.
   */
  const updateSidebarView = (isInitial = false) => {
    const hasQuery = state.searchQuery.length > 0;
    const isFiltered = state.activeFilter !== "All";

    // We force the state (expand + check) if there's a search, a specific filter,
    // or if it's the initial load.
    const forceState = hasQuery || isFiltered || isInitial;

    // Toggle search icons
    if (elements.clearBtn)
      elements.clearBtn.style.display = hasQuery ? "block" : "none";
    if (elements.searchIcon)
      elements.searchIcon.style.display = hasQuery ? "none" : "block";

    // If we're forcing state (filter/search/explicit All), clear map for fresh sync
    if (forceState) {
      clearAllMarkers();
    }

    const filteredGroups = getFilteredGroups();
    const filteredGeofences = getFilteredGeofences();
    const filteredLandmarks = getFilteredLandmarks();
    
    renderVehicleList(filteredGroups, forceState);
    renderGeofenceList(filteredGeofences, forceState);
    renderLandmarkList(filteredLandmarks, forceState);
  };

  /**
   * Logic for filtering groups by name and status.
   */
  const getFilteredGroups = () => {
    const query = state.searchQuery;
    const filter = state.activeFilter;

    if (!query && filter === "All") return state.groups;

    return state.groups
      .map((group) => ({
        ...group,
        vehicles: group.vehicles.filter((v) => {
          const matchesQuery = !query || v.name.toLowerCase().includes(query);
          const matchesFilter = filter === "All" || v.status === filter;
          return matchesQuery && matchesFilter;
        }),
      }))
      .filter((group) => group.vehicles.length > 0);
  };

  /**
   * Logic for filtering geofences by name.
   */
  const getFilteredGeofences = () => {
    const query = state.searchQuery;
    if (!query) return state.geofenceGroups;

    return state.geofenceGroups
      .map((group) => ({
        ...group,
        routes: group.routes.filter((r) =>
          r.name.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.routes.length > 0);
  };

  /**
   * Logic for filtering landmarks by name.
   */
  const getFilteredLandmarks = () => {
    const query = state.searchQuery;
    if (!query) return state.landmarkGroups;

    return state.landmarkGroups
      .map((group) => ({
        ...group,
        landmarks: group.landmarks.filter((l) =>
          l.name.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.landmarks.length > 0);
  };

  /**
   * Renders the HTML for the vehicle list.
   */
  const renderVehicleList = (groups = state.groups, forceState = false) => {
    if (!elements.subGroupsList) return;

    elements.subGroupsList.innerHTML = "";
    let totalVehicles = 0;

    groups.forEach((group) => {
      totalVehicles += group.vehicles.length;
      const groupHtml = createGroupTemplate(group, forceState);
      elements.subGroupsList.insertAdjacentHTML("beforeend", groupHtml);
    });

    if (elements.totalCountSpan) {
      elements.totalCountSpan.textContent = totalVehicles;
    }

    updateAllCheckboxStates();
    handleExpansionStates(forceState);
  };

  const createGroupTemplate = (group, autoCheck) => {
    const vehicleItems = group.vehicles
      .map((v) => {
        const isChecked = autoCheck || isMarkerActive(v.id);
        if (autoCheck) addVehicleMarker(v, false);

        return `
          <li class="vehicle-item" data-vehicle-id="${v.id}" data-group="${group.group_name}">
            <input type="checkbox" class="vehicle-checkbox" 
              data-vehicle-id="${v.id}" 
              data-group="${group.group_name}"
              ${isChecked ? "checked" : ""}>
            <span class="status-indicator status-${v.status.toLowerCase()}"></span>
            <span class="vehicle-name">${v.name}</span>
          </li>
        `;
      })
      .join("");

    return `
      <div class="vehicle-group">
        <div class="vehicle-group-header sub-group-header">
          <i class="fa-solid fa-chevron-right group-toggle-icon"></i>
          <input type="checkbox" class="group-checkbox" data-group-name="${group.group_name}">
          <label class="group-title">${group.group_name}</label>
          <span class="vehicle-count">${group.vehicles.length}</span>
        </div>
        <ul class="vehicle-list" id="list-${group.group_name}">
          ${vehicleItems}
        </ul>
      </div>
    `;
  };

  const handleExpansionStates = (isExpanded) => {
    const listWrapper = elements.subGroupsList;
    const geofenceWrapper = elements.geofenceSubList;
    const landmarkWrapper = elements.landmarkSubList;

    const masterIcon = document.querySelector(
      "#master-group-header .group-toggle-icon",
    );
    const geofenceMasterIcon = document.querySelector(
      "#geofence-master-header .group-toggle-icon",
    );
    const landmarkMasterIcon = document.querySelector(
      "#landmark-master-header .group-toggle-icon",
    );

    if (isExpanded) {
      listWrapper?.classList.add("expanded");
      geofenceWrapper?.classList.add("expanded");
      landmarkWrapper?.classList.add("expanded");

      masterIcon?.classList.add("expanded");
      geofenceMasterIcon?.classList.add("expanded");
      landmarkMasterIcon?.classList.add("expanded");
      
      document
        .querySelectorAll(".vehicle-list")
        .forEach((ul) => ul.classList.add("expanded"));
      document
        .querySelectorAll(".sub-group-header .group-toggle-icon")
        .forEach((i) => i.classList.add("expanded"));
    } else {
      listWrapper?.classList.remove("expanded");
      geofenceWrapper?.classList.remove("expanded");
      landmarkWrapper?.classList.remove("expanded");

      masterIcon?.classList.remove("expanded");
      geofenceMasterIcon?.classList.remove("expanded");
      landmarkMasterIcon?.classList.remove("expanded");
    }
  };

  /**
   * Set up DOM event listeners.
   */
  const setupEventListeners = () => {
    // Click Delegation (Universal)
    elements.sidebarContent?.addEventListener("click", (e) => {
      // Toggle Expansion
      const masterHeader = e.target.closest(".master-section-header");
      if (masterHeader && !e.target.matches("input")) {
        toggleCollapse(
          masterHeader.nextElementSibling,
          masterHeader.querySelector(".group-toggle-icon"),
        );
        return;
      }

      const subHeader = e.target.closest(".sub-group-header");
      if (subHeader && !e.target.matches("input")) {
        toggleCollapse(
          subHeader.nextElementSibling,
          subHeader.querySelector(".group-toggle-icon"),
        );
        return;
      }

      // Vehicle Click
      const vehicleItem = e.target.closest(".vehicle-item:not(.geofence-item):not(.landmark-item)");
      if (vehicleItem && !e.target.matches("input")) {
        const checkbox = vehicleItem.querySelector(".vehicle-checkbox");
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          handleVehicleToggle(checkbox);
        }
        panToMarker(vehicleItem.dataset.vehicleId);
        return;
      }

      // Geofence Click
      const geofenceItem = e.target.closest(".geofence-item");
      if (geofenceItem && !e.target.matches("input")) {
        const checkbox = geofenceItem.querySelector(".geofence-checkbox");
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          handleGeofenceToggle(checkbox);
        }
        return;
      }

      // Landmark Click
      const landmarkItem = e.target.closest(".landmark-item");
      if (landmarkItem && !e.target.matches("input")) {
        const checkbox = landmarkItem.querySelector(".landmark-checkbox");
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          handleLandmarkToggle(checkbox);
        }
        return;
      }
    });

    // Checkbox Change Delegation
    elements.sidebarContent?.addEventListener("change", (e) => {
      // Vehicle Checkboxes
      if (e.target.matches(".vehicle-checkbox")) {
        handleVehicleToggle(e.target);
      } else if (e.target.matches(".group-checkbox")) {
        handleGroupToggle(e.target);
      } else if (e.target.id === "master-checkbox") {
        handleMasterToggle(e.target.checked);
      }
      
      // Geofence Checkboxes
      else if (e.target.matches(".geofence-checkbox")) {
        handleGeofenceToggle(e.target);
      } else if (e.target.matches(".geofence-group-checkbox")) {
        handleGeofenceGroupToggle(e.target);
      } else if (e.target.id === "geofence-master-checkbox") {
        handleGeofenceMasterToggle(e.target.checked);
      }
      
      // Landmark Checkboxes
      else if (e.target.matches(".landmark-checkbox")) {
        handleLandmarkToggle(e.target);
      } else if (e.target.matches(".landmark-group-checkbox")) {
        handleLandmarkGroupToggle(e.target);
      } else if (e.target.id === "landmark-master-checkbox") {
        handleLandmarkMasterToggle(e.target.checked);
      }
    });

    // Sidebar Toggler
    elements.toggleBtn?.addEventListener("click", () => {
      elements.sidebar.classList.toggle("collapsed");
      elements.toggleBtn.classList.toggle("collapsed");
      setTimeout(() => map.invalidateSize(), 350);
    });

    // Search input
    const debouncedSearch = debounce((query) => {
      state.searchQuery = query;
      updateSidebarView();
    }, 300);

    elements.searchInput?.addEventListener("input", (e) => {
      debouncedSearch(e.target.value.toLowerCase().trim());
    });

    // Status Filter buttons
    elements.filterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        elements.filterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        state.activeFilter = btn.dataset.filter;
        updateSidebarView();
      });
    });

    // Clear search
    elements.clearBtn?.addEventListener("click", () => {
      if (elements.searchInput) elements.searchInput.value = "";
      state.searchQuery = "";
      updateSidebarView();
    });
  };

  // --- Checkbox Helpers ---
  const handleVehicleToggle = (checkbox) => {
    const { vehicleId, group } = checkbox.dataset;
    const vehicle = vehicleDataMap.get(vehicleId);
    checkbox.checked
      ? addVehicleMarker(vehicle)
      : removeVehicleMarker(vehicleId);
    syncGroupCheckbox(group);
  };

  const handleGroupToggle = (groupCheckbox) => {
    const groupName = groupCheckbox.dataset.groupName;
    const isChecked = groupCheckbox.checked;
    const checkboxes = document.querySelectorAll(
      `#list-${groupName} .vehicle-checkbox`,
    );

    checkboxes.forEach((cb) => {
      if (cb.checked !== isChecked) {
        cb.checked = isChecked;
        const vehicle = vehicleDataMap.get(cb.dataset.vehicleId);
        isChecked
          ? addVehicleMarker(vehicle, false)
          : removeVehicleMarker(vehicle.id);
      }
    });
    updateMasterState();
  };

  const handleMasterToggle = (isChecked) => {
    const allGroupCheckboxes = document.querySelectorAll(".group-checkbox");
    allGroupCheckboxes.forEach((gcb) => {
      gcb.checked = isChecked;
      handleGroupToggle(gcb);
    });
  };

  const syncGroupCheckbox = (groupName) => {
    const checkboxes = document.querySelectorAll(
      `#list-${groupName} .vehicle-checkbox`,
    );
    const checkedCount = [...checkboxes].filter((cb) => cb.checked).length;
    const groupCb = document.querySelector(
      `.group-checkbox[data-group-name="${groupName}"]`,
    );

    if (groupCb) {
      groupCb.checked =
        checkboxes.length > 0 && checkboxes.length === checkedCount;
      groupCb.indeterminate =
        checkedCount > 0 && checkedCount < checkboxes.length;
    }
    updateMasterState();
  };

  const updateAllCheckboxStates = () => {
    state.groups.forEach((g) => syncGroupCheckbox(g.group_name));
    updateMasterState();
  };

  const updateMasterState = () => {
    const groupCbs = document.querySelectorAll(".group-checkbox");
    const checkedCount = [...groupCbs].filter((cb) => cb.checked).length;
    const indeterminateCount = [...groupCbs].filter(
      (cb) => cb.indeterminate,
    ).length;
    const masterCb = elements.masterCheckbox;

    if (masterCb) {
      masterCb.checked =
        groupCbs.length > 0 && groupCbs.length === checkedCount;
      masterCb.indeterminate =
        (checkedCount > 0 && checkedCount < groupCbs.length) ||
        indeterminateCount > 0;
    }
  };

  // --- Geofence Checkbox Helpers ---
  const handleGeofenceToggle = (checkbox) => {
    const { geofenceId } = checkbox.dataset;
    const geofence = geofenceDataMap.get(geofenceId);
    const groupName = checkbox.closest(".geofence-group")?.querySelector(".geofence-group-checkbox")?.dataset.groupName;
    
    if (geofence) {
      checkbox.checked ? addGeofence(geofence) : removeGeofence(geofenceId);
    }
    
    if (groupName) syncGeofenceGroupCheckbox(groupName);
  };

  const handleGeofenceGroupToggle = (groupCheckbox) => {
    const groupName = groupCheckbox.dataset.groupName;
    const isChecked = groupCheckbox.checked;
    
    const itemCheckboxes = groupCheckbox.closest(".geofence-group")?.querySelectorAll(".geofence-checkbox");
    
    itemCheckboxes?.forEach((cb) => {
      if (cb.checked !== isChecked) {
        cb.checked = isChecked;
        const geofence = geofenceDataMap.get(cb.dataset.geofenceId);
        if (geofence) {
          isChecked ? addGeofence(geofence) : removeGeofence(geofence.id.toString());
        }
      }
    });
    updateGeofenceMasterState();
  };

  const handleGeofenceMasterToggle = (isChecked) => {
    const allGroupCheckboxes = document.querySelectorAll(".geofence-group-checkbox");
    allGroupCheckboxes.forEach((gcb) => {
      gcb.checked = isChecked;
      handleGeofenceGroupToggle(gcb);
    });
  };

  const syncGeofenceGroupCheckbox = (groupName) => {
    const groupEl = document.querySelector(`.geofence-group-checkbox[data-group-name="${groupName}"]`)?.closest(".geofence-group");
    if (!groupEl) return;

    const checkboxes = groupEl.querySelectorAll(".geofence-checkbox");
    const checkedCount = [...checkboxes].filter((cb) => cb.checked).length;
    const groupCb = groupEl.querySelector(".geofence-group-checkbox");

    if (groupCb) {
      groupCb.checked = checkboxes.length > 0 && checkboxes.length === checkedCount;
      groupCb.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
    updateGeofenceMasterState();
  };

  const updateGeofenceMasterState = () => {
    const groupCbs = document.querySelectorAll(".geofence-group-checkbox");
    const checkedCount = [...groupCbs].filter((cb) => cb.checked).length;
    const indeterminateCount = [...groupCbs].filter((cb) => cb.indeterminate).length;
    const masterCb = elements.geofenceMasterCheckbox;

    if (masterCb) {
      masterCb.checked = groupCbs.length > 0 && groupCbs.length === checkedCount;
      masterCb.indeterminate = (checkedCount > 0 && checkedCount < groupCbs.length) || indeterminateCount > 0;
    }
  };

  // --- Landmark Checkbox Helpers ---
  const handleLandmarkToggle = (checkbox) => {
    const landmarkId = checkbox.dataset.landmarkId;
    const landmark = landmarkDataMap.get(landmarkId);
    
    if (landmark) {
      checkbox.checked ? addLandmark(landmark) : removeLandmark(landmarkId);
    }

    const groupName = checkbox.closest(".landmark-group")?.querySelector(".landmark-group-checkbox")?.dataset.groupName;
    if (groupName) syncLandmarkGroupCheckbox(groupName);
  };

  const handleLandmarkGroupToggle = (groupCheckbox) => {
    const isChecked = groupCheckbox.checked;
    const itemCheckboxes = groupCheckbox.closest(".landmark-group")?.querySelectorAll(".landmark-checkbox");
    
    itemCheckboxes?.forEach((cb) => {
      if (cb.checked !== isChecked) {
        cb.checked = isChecked;
        const landmark = landmarkDataMap.get(cb.dataset.landmarkId);
        if (landmark) {
          isChecked ? addLandmark(landmark) : removeLandmark(landmark.id.toString());
        }
      }
    });
    updateLandmarkMasterState();
  };

  const handleLandmarkMasterToggle = (isChecked) => {
    const allGroupCheckboxes = document.querySelectorAll(".landmark-group-checkbox");
    allGroupCheckboxes.forEach((gcb) => {
      if (gcb.checked !== isChecked) {
        gcb.checked = isChecked;
        handleLandmarkGroupToggle(gcb);
      }
    });
  };


  const syncLandmarkGroupCheckbox = (groupName) => {
    const groupEl = document.querySelector(`.landmark-group-checkbox[data-group-name="${groupName}"]`)?.closest(".landmark-group");
    if (!groupEl) return;

    const checkboxes = groupEl.querySelectorAll(".landmark-checkbox");
    const checkedCount = [...checkboxes].filter((cb) => cb.checked).length;
    const groupCb = groupEl.querySelector(".landmark-group-checkbox");

    if (groupCb) {
      groupCb.checked = checkboxes.length > 0 && checkboxes.length === checkedCount;
      groupCb.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
    updateLandmarkMasterState();
  };

  const updateLandmarkMasterState = () => {
    const groupCbs = document.querySelectorAll(".landmark-group-checkbox");
    const checkedCount = [...groupCbs].filter((cb) => cb.checked).length;
    const indeterminateCount = [...groupCbs].filter((cb) => cb.indeterminate).length;
    const masterCb = elements.landmarkMasterCheckbox;

    if (masterCb) {
      masterCb.checked = groupCbs.length > 0 && groupCbs.length === checkedCount;
      masterCb.indeterminate = (checkedCount > 0 && checkedCount < groupCbs.length) || indeterminateCount > 0;
    }
  };

  // --- Geofence Rendering ---
  const renderGeofenceList = (groups) => {
    if (!elements.geofenceSubList) return;

    elements.geofenceSubList.innerHTML = "";
    let totalGeofences = 0;

    groups.forEach((group) => {
      totalGeofences += group.routes.length;
      const groupHtml = createGeofenceGroupTemplate(group);
      elements.geofenceSubList.insertAdjacentHTML("beforeend", groupHtml);
    });

    if (elements.totalGeofenceSpan) {
      elements.totalGeofenceSpan.textContent = totalGeofences;
    }
  };

  const createGeofenceGroupTemplate = (group) => {
    const geofenceItems = group.routes
      .map((route) => {
        return `
          <li class="vehicle-item geofence-item" data-geofence-id="${route.id}">
            <input type="checkbox" class="geofence-checkbox" data-geofence-id="${route.id}">
            <i class="fa-solid fa-draw-polygon item-icon"></i>
            <span class="vehicle-name">${route.name}</span>
          </li>
        `;
      })
      .join("");

    return `
      <div class="vehicle-group geofence-group">
        <div class="vehicle-group-header sub-group-header" data-type="geofence">
          <i class="fa-solid fa-chevron-right group-toggle-icon"></i>
          <input type="checkbox" class="geofence-group-checkbox" data-group-name="${group.name}">
          <label class="group-title">${group.name}</label>
          <span class="vehicle-count">${group.routes.length}</span>
        </div>
        <ul class="vehicle-list geofence-list-items" id="geofence-list-${group.id}">
          ${geofenceItems}
        </ul>
      </div>
    `;
  };

  // --- Landmark Rendering ---
  const renderLandmarkList = (groups) => {
    if (!elements.landmarkSubList) return;

    elements.landmarkSubList.innerHTML = "";
    let totalLandmarks = 0;

    groups.forEach((group) => {
      totalLandmarks += group.landmarks.length;
      const groupHtml = createLandmarkGroupTemplate(group);
      elements.landmarkSubList.insertAdjacentHTML("beforeend", groupHtml);
    });

    if (elements.totalLandmarkSpan) {
      elements.totalLandmarkSpan.textContent = totalLandmarks;
    }
  };

  const createLandmarkGroupTemplate = (group) => {
    const landmarkItems = group.landmarks
      .map((l) => {
        return `
          <li class="vehicle-item landmark-item" data-landmark-id="${l.id}">
            <input type="checkbox" class="landmark-checkbox" data-landmark-id="${l.id}">
            <i class="fa-solid fa-location-dot item-icon"></i>
            <span class="vehicle-name">${l.name}</span>
          </li>
        `;
      })
      .join("");

    return `
      <div class="vehicle-group landmark-group">
        <div class="vehicle-group-header sub-group-header" data-type="landmark">
          <i class="fa-solid fa-chevron-right group-toggle-icon"></i>
          <input type="checkbox" class="landmark-group-checkbox" data-group-name="${group.name}">
          <label class="group-title">${group.name}</label>
          <span class="vehicle-count">${group.landmarks.length}</span>
        </div>
        <ul class="vehicle-list landmark-list-items" id="landmark-list-${group.id}">
          ${landmarkItems}
        </ul>
      </div>
    `;
  };

  // Initialize
  setupEventListeners();
  await loadData();

  return {
    state,
    updateStatusCounts
  };
}
