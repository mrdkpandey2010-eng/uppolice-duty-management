/**
 * ============================================================================
 *  Uttar Pradesh Police — District Lucknow (North)
 *  Police Station Malihabad (थाना मलिहाबाद) — Duty Management System
 *  FRONT-END CONFIGURATION (Edit API_URL after deploying backend/Code.gs)
 * ============================================================================
 *
 *  SETUP INSTRUCTIONS:
 *  1. Deploy backend/Code.gs to Google Apps Script (see backend/SETUP-GUIDE.md).
 *  2. Paste your Google Apps Script Web App URL (ends with /exec) into API_URL below.
 *  3. (Optional) Paste your Google OAuth 2.0 Web Client ID into GOOGLE_CLIENT_ID.
 *
 *  NOTE: While API_URL contains "PASTE_", the application runs in local DEMO MODE:
 *  All features work instantly and save in this browser's local database!
 */
window.APP_CONFIG = {
  // Google Cloud ▸ APIs & Services ▸ Credentials ▸ OAuth 2.0 Client ID (Optional for Google Sign-In)
  GOOGLE_CLIENT_ID: "",

  // Apps Script ▸ Deploy ▸ Web app URL (ends with /exec)
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  API_URL: "https://script.google.com/macros/s/AKfycbxj03QfiDV-hovl8WEJGhbSSd45jtkvIUEgRrqb-uEjDn_V_FdW_Mu_KoqtD4dm3nWRmA/exec",

  // Record the public IP address of the officer's network in the login log
  CAPTURE_PUBLIC_IP: true,

  // How often (seconds) the app checks Google Drive for updates made by other officers
  POLL_SECONDS: 30
};
