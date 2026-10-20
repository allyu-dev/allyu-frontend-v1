import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { firebaseConfig, firebaseConfigured } from './env'

export const firebaseAuth = firebaseConfigured
  ? getAuth(initializeApp(firebaseConfig))
  : null