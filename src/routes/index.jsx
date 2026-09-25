import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import AuthGuard from './guards/AuthGuard'
import PublicGuard from './guards/PublicGuard'

import LoginPage from '../features/auth/LoginPage'
import SignupPage from '../features/auth/SignupPage'
import OnboardingPage from '../features/businessProfile/OnboardingPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import LedgerPage from '../features/energyLedger/LedgerPage'
import UploadPage from '../features/energyEntries/UploadPage'
import RecommendationsPage from '../features/recommendations/RecommendationsPage'
import ProfilePage from '../features/businessProfile/ProfilePage'

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route
        path="/login"
        element={
          <PublicGuard>
            <LoginPage />
          </PublicGuard>
        }
      />
      <Route path="/signup" element={<Navigate to="/login" replace />} />

      {/* Onboarding Flow */}
      <Route path="/onboarding" element={<OnboardingPage />} />

      {/* Protected App Routes inside AppShell */}
      <Route
        path="/"
        element={
          <AuthGuard>
            <AppShell />
          </AuthGuard>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="ledger" element={<LedgerPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
