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
import SimulatorPage from '../features/simulator/SimulatorPage'
import BenchmarkPage from '../features/benchmarks/BenchmarkPage'
import EmissionsPage from '../features/emissions/EmissionsPage'
import LiveDashboardPage from '../features/liveDemo/LiveDashboardPage'
import LiveSimulatorPage from '../features/liveDemo/LiveSimulatorPage'
import MobileDashboardPage from '../features/liveDemo/MobileDashboardPage'

export default function AppRoutes() {
  return (
    <Routes>
      {/* ── Live Demo Routes (no auth, for hackathon two-device demo) ── */}
      <Route path="/live" element={<LiveDashboardPage />} />
      <Route path="/live/simulator" element={<LiveSimulatorPage />} />
      <Route path="/mobile" element={<MobileDashboardPage />} />

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
        <Route path="benchmarks" element={<BenchmarkPage />} />
        <Route path="emissions" element={<EmissionsPage />} />
        <Route path="recommendations" element={<RecommendationsPage />} />
        <Route path="simulator" element={<SimulatorPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="upload" element={<UploadPage />} />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
