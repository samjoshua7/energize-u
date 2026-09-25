import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { Box, CircularProgress, Typography } from '@mui/material'
import { useAuth } from '../../hooks/useAuth'

export default function AuthGuard({ children }) {
  const { user, loading, isConfigured } = useAuth()
  const location = useLocation()

  // 1. If user is already authenticated, allow access immediately
  if (user) {
    return children
  }

  // 2. If URL has OAuth callback tokens/code, keep waiting for Supabase to finish parsing
  const hasAuthInUrl =
    window.location.hash.includes('access_token') ||
    window.location.search.includes('code=')

  if (loading || hasAuthInUrl) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
          gap: 2,
        }}
      >
        <CircularProgress color="primary" size={32} />
        <Typography variant="body2" color="text.secondary">
          Authenticating session...
        </Typography>
      </Box>
    )
  }

  if (!isConfigured) {
    return children
  }

  return <Navigate to="/login" state={{ from: location }} replace />
}
