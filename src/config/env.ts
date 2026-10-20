const requiredFirebaseValues = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? '',
}

export const firebaseConfig = requiredFirebaseValues
export const firebaseConfigured = Object.values(requiredFirebaseValues).every(Boolean)
export const apiBaseUrl = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL?.trim() ?? '').replace(/\/+$/, '')