import React from 'react'
import { Navigate } from 'react-router-dom'
import { Box, CircularProgress } from '@mui/material'
import { useAuth } from '../../hooks/useAuth'

export default function PublicGuard({ children }) {
  const { user, loading } = useAuth()

  // 1. If user is already authenticated, redirect to home immediately
  if (user) {
    return <Navigate to="/" replace />
  }

  // 2. If OAuth callback is currently resolving in URL, show spinner
  const hasAuthInUrl =
    window.location.hash.includes('access_token') ||
    window.location.search.includes('code=')

  if (loading && hasAuthInUrl) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" size={32} />
      </Box>
    )
  }

  return children
}
