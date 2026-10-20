/**
 * ============================================================================
 *  Uttar Pradesh Police — District Lucknow (North)
 *  Police Station Malihabad (थाना मलिहाबाद) — Duty Management System
 *  FRONT-END CONFIGURATION
 * ============================================================================
 */
window.APP_CONFIG = {
  // Google Cloud ▸ APIs & Services ▸ Credentials ▸ OAuth 2.0 Client ID (Web application)
  GOOGLE_CLIENT_ID: "891939995278-ig2u9ej2u7ft3q5sb4u9dbogceprv7bj.apps.googleusercontent.com",

  // Apps Script ▸ Deploy ▸ Web app URL (ends with /exec)
  // अपनी स्वयं की Google Apps Script Deploy करने के बाद यहाँ उसका URL डालें।
  // खाली ("") रहने पर सिस्टम तुरंत बिना सर्वर के लोकल डेमो मोड में चलेगा (सभी ID/PW तुरंत काम करेंगे)।
  API_URL: "",

  // Record the public IP address of the officer's network in the login log
  CAPTURE_PUBLIC_IP: true,

  // How often (seconds) the app checks Google Drive for updates made by other officers
  POLL_SECONDS: 30
};
