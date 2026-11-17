# Tab-Scoped Campaign Chronicle Storage

Status: Accepted

The campaign chronicle (`mission1SurvivorId` and Mission 2 oath choices for Havel Řezáč and Ondřej Štěrba) persists through tab-scoped `sessionStorage` (`campaignStorage.ts`) rather than `localStorage` or user profiles, surviving page refreshes and scenario resets within one playing session and resetting cleanly when the browser tab closes.
