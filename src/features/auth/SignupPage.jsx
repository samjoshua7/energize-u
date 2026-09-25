import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Link,
  CircularProgress,
  Alert,
} from '@mui/material'
import { BoltOutlined as EnergyIcon } from '@mui/icons-material'
import { useNavigate, Link as RouterLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export default function SignupPage() {
  const navigate = useNavigate()
  const { signUp, isConfigured } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.')
      return
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.')
      return
    }
    if (password.length < 6) {
      setErrorMsg('Password should be at least 6 characters.')
      return
    }

    try {
      setLoading(true)
      setErrorMsg('')
      const { user } = await signUp({ email, password })
      if (user && !user.identities?.length) {
        setSuccessMsg('Account created! Please check your email to confirm your registration.')
      } else {
        navigate('/onboarding')
      }
    } catch (err) {
      console.error('Sign-up error:', err)
      setErrorMsg(err.message || 'Failed to create account. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: '#0B0F19',
        p: 2,
        backgroundImage: 'radial-gradient(ellipse at 50% 20%, rgba(16, 185, 129, 0.12) 0%, transparent 60%)',
      }}
    >
      <Card sx={{ maxWidth: 420, width: '100%', p: { xs: 1.5, sm: 2.5 } }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0B0F19',
                mb: 1.5,
                boxShadow: '0 0 24px rgba(16, 185, 129, 0.45)',
              }}
            >
              <EnergyIcon sx={{ fontSize: 32 }} />
            </Box>
            <Typography variant="h2" align="center" sx={{ fontWeight: 800 }}>
              Create Account
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
              Start cutting energy costs for your facility
            </Typography>
          </Box>

          {!isConfigured && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Supabase is not configured yet. Set credentials in <code>.env.local</code>.
            </Alert>
          )}

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMsg}
            </Alert>
          )}

          {successMsg && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {successMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              label="Email Address"
              type="email"
              fullWidth
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoFocus
              placeholder="owner@myfactory.com"
            />
            <TextField
              label="Password (min 6 chars)"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={loading}
              sx={{ mt: 2.5, mb: 1.5, py: 1.2 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Get Started'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already registered?{' '}
                <Link component={RouterLink} to="/login" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  Sign In
                </Link>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
