import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Collapse,
  IconButton,
  Tooltip,
} from '@mui/material'
import {
  BoltOutlined as EnergyIcon,
  PlayArrowRounded as DemoIcon,
  ContentCopyRounded as CopyIcon,
  CheckRounded as CheckIcon,
  HelpOutlineRounded as HelpIcon,
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const SUPABASE_CALLBACK_URI = 'https://prxuoaquvbbgqjxbvabl.supabase.co/auth/v1/callback'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    signInWithGoogle,
    signInWithDemo,
    authError,
    clearAuthError,
  } = useAuth()

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [copied, setCopied] = useState(false)
  const [showConfigHelp, setShowConfigHelp] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setErrorMsg('')
      clearAuthError?.()
      await signInWithGoogle()
    } catch (err) {
      console.error('Google Sign In error:', err)
      const msg = err.message || 'Google sign-in could not be initiated.'
      setErrorMsg(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDemoSignIn = async () => {
    try {
      setLoading(true)
      setErrorMsg('')
      clearAuthError?.()
      await signInWithDemo()
      const from = location.state?.from?.pathname || '/'
      navigate(from, { replace: true })
    } catch (err) {
      console.error('Demo login error:', err)
      setErrorMsg(err.message || 'Failed to start demo session.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyUri = () => {
    navigator.clipboard.writeText(SUPABASE_CALLBACK_URI)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const rawActiveError = errorMsg || authError
  const isExchangeErrorCode = rawActiveError && rawActiveError.includes('Unable to exchange external code')

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        p: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          maxWidth: 440,
          width: '100%',
          p: { xs: 2.5, sm: 3.5 },
          borderRadius: 2.5,
          borderColor: 'divider',
          bgcolor: 'background.paper',
        }}
      >
        <CardContent sx={{ p: 0 }}>
          {/* Logo & Headline */}
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2,
                bgcolor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                mb: 1.5,
              }}
            >
              <EnergyIcon sx={{ fontSize: 30 }} />
            </Box>
            <Typography variant="h5" align="center" sx={{ fontWeight: 800, letterSpacing: '-0.02em' }}>
              Energize <Box component="span" sx={{ color: 'primary.main' }}>U</Box>
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 0.5 }}>
              MSME Multi-Fuel Energy Intelligence
            </Typography>
          </Box>

          {/* Active Error Notice */}
          {rawActiveError && (
            <Alert
              severity="warning"
              sx={{ mb: 2.5, fontSize: '0.825rem', '& .MuiAlert-message': { width: '100%' } }}
              action={
                <IconButton
                  size="small"
                  color="inherit"
                  onClick={() => setShowConfigHelp((prev) => !prev)}
                  title="View setup help"
                >
                  <HelpIcon fontSize="small" />
                </IconButton>
              }
            >
              <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.825rem' }}>
                {isExchangeErrorCode ? 'Google Client Secret Mismatch' : 'Sign-In Notice'}
              </Typography>
              <Typography variant="caption" sx={{ display: 'block', mt: 0.25, color: 'text.secondary' }}>
                {isExchangeErrorCode
                  ? 'Supabase could not verify the Google code because the Client Secret in Supabase does not match the Google Cloud Secret (it should start with GOCSPX-).'
                  : rawActiveError}
              </Typography>
            </Alert>
          )}

          {/* Troubleshooting Accordion for Google Cloud Setup */}
          <Collapse in={showConfigHelp || Boolean(isExchangeErrorCode)}>
            <Box
              sx={{
                mb: 2.5,
                p: 2,
                borderRadius: 2,
                bgcolor: 'action.hover',
                border: '1px solid',
                borderColor: 'divider',
                fontSize: '0.8rem',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                How to Fix Google Login in 2 Minutes:
              </Typography>
              <Typography variant="caption" component="div" color="text.secondary" sx={{ mb: 1.5, lineHeight: 1.5 }}>
                1. Open <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" style={{ color: '#10B981' }}>Google Cloud Console</a>.<br />
                2. Click your OAuth 2.0 Web Client.<br />
                3. Copy the <strong>Client Secret</strong> (starts with <code>GOCSPX-</code>).<br />
                4. Paste it into <a href="https://supabase.com/dashboard/project/prxuoaquvbbgqjxbvabl/auth/providers" target="_blank" rel="noreferrer" style={{ color: '#10B981' }}>Supabase Google Provider</a> as Client Secret and Save.<br />
                5. Ensure this exact <strong>Authorized redirect URI</strong> is added in Google Cloud Console:
              </Typography>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  bgcolor: 'background.paper',
                  p: 1,
                  borderRadius: 1.5,
                  border: '1px solid',
                  borderColor: 'divider',
                  gap: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontFamily: 'monospace',
                    fontSize: '0.72rem',
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {SUPABASE_CALLBACK_URI}
                </Typography>
                <Tooltip title={copied ? 'Copied!' : 'Copy URI'}>
                  <IconButton size="small" onClick={handleCopyUri} color={copied ? 'success' : 'default'}>
                    {copied ? <CheckIcon fontSize="small" /> : <CopyIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          </Collapse>

          {/* SINGLE Unified Sign in with Google Button */}
          <Button
            variant="outlined"
            fullWidth
            size="large"
            disabled={loading}
            onClick={handleGoogleSignIn}
            startIcon={
              <svg width="20" height="20" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
            }
            sx={{
              py: 1.3,
              fontWeight: 600,
              fontSize: '0.925rem',
              borderColor: 'divider',
              color: 'text.primary',
              '&:hover': {
                borderColor: 'text.secondary',
                bgcolor: 'action.hover',
              },
            }}
          >
            {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign in with Google'}
          </Button>

          <Divider sx={{ my: 2.5 }}>
            <Typography variant="caption" color="text.secondary">
              OR
            </Typography>
          </Divider>

          {/* 1-Click Instant Demo Access (Works instantly with zero setup) */}
          <Button
            variant="contained"
            color="primary"
            fullWidth
            size="large"
            disabled={loading}
            onClick={handleDemoSignIn}
            startIcon={<DemoIcon sx={{ fontSize: 22 }} />}
            sx={{
              py: 1.3,
              fontWeight: 700,
              fontSize: '0.925rem',
            }}
          >
            1-Click Instant Demo (Owner Access)
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            align="center"
            sx={{ display: 'block', mt: 2, fontSize: '0.75rem', lineHeight: 1.5 }}
          >
            Instant access with zero passwords and zero setup required.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}
