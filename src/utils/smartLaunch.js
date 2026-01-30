// src/utils/smartLaunch.js
const STORAGE_KEY = "bt_smart_launch_rules";

export function loadSmartLaunchRules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("Failed to load SmartLaunch rules", e);
    return [];
  }
}

export function saveSmartLaunchRules(rules) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rules));
  } catch (e) {
    console.error("Failed to save SmartLaunch rules", e);
  }
}
