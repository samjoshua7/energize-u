import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeModeProvider } from './theme/ThemeModeContext'
import { AuthProvider } from '../hooks/useAuth'
import AppRoutes from '../routes'

export default function App() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeModeProvider>
  )
}
