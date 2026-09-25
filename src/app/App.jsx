import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import { ThemeModeProvider } from './theme/ThemeModeContext'
import { AuthProvider } from '../hooks/useAuth'
import { SimulationProvider } from '../features/simulator/SimulationContext'
import AppRoutes from '../routes'

export default function App() {
  return (
    <ThemeModeProvider>
      <AuthProvider>
        <SimulationProvider>
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
          </BrowserRouter>
        </SimulationProvider>
      </AuthProvider>
    </ThemeModeProvider>
  )
}
