// src/utils/loadStops.js
import Papa from "papaparse";

export async function loadStops() {
  const url = `${import.meta.env.BASE_URL}stops.csv`; // served from public/

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load stops.csv: ${response.status} ${response.statusText}`);
  }

  const csvText = await response.text();

  return new Promise((resolve) => {
    Papa.parse(csvText, {
      header: true,
      dynamicTyping: true,
      complete: (results) => resolve(results.data),
    });
  });
}
