/**
 * Theme Utility
 * Handles switching between light and dark themes and persists preference.
 */

import { setMapTheme } from "../components/map.js";

export function initTheme() {
  const themeToggle = document.getElementById("theme-toggle");
  const body = document.body;

  // 1. Check for saved theme in localStorage
  const savedTheme = localStorage.getItem("vts-theme") || "light";
  
  if (savedTheme === "dark") {
    applyDarkTheme();
  }

  // 2. Add click listener
  themeToggle?.addEventListener("click", () => {
    if (body.classList.contains("dark-theme")) {
      applyLightTheme();
    } else {
      applyDarkTheme();
    }
  });

  function applyDarkTheme() {
    body.classList.add("dark-theme");
    localStorage.setItem("vts-theme", "dark");
    setMapTheme("dark");
  }

  function applyLightTheme() {
    body.classList.remove("dark-theme");
    localStorage.setItem("vts-theme", "light");
    setMapTheme("light");
  }
}
