import React, { useState } from 'react'
import {
  Box,
  Drawer,
  IconButton,
  TextField,
  Typography,
  Button,
  CircularProgress,
  Divider,
  Tooltip,
} from '@mui/material'
import {
  AutoAwesomeOutlined as AssistantIcon,
  Close as CloseIcon,
  SendRounded as SendIcon,
} from '@mui/icons-material'
import { useAuth } from '../../hooks/useAuth'
import { askEnergyAssistant } from '../../lib/ai/chatClient'

export default function EnergyAssistant() {
  const { business } = useAuth()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [messages, setMessages] = useState([])

  const handleSend = async (event) => {
    event?.preventDefault()
    const trimmedMessage = message.trim()
    if (!trimmedMessage || sending || !business?.business_id) return

    const nextUserMessage = { role: 'user', content: trimmedMessage }
    const history = [...messages, nextUserMessage]
    setMessages(history)
    setMessage('')
    setError('')
    setSending(true)

    const result = await askEnergyAssistant({
      businessId: business.business_id,
      message: trimmedMessage,
      history: messages,
    })

    if (result.success) {
      setMessages([...history, { role: 'assistant', content: result.reply }])
    } else {
      setError(result.error)
    }
    setSending(false)
  }

  return (
    <>
      <Tooltip title="Ask the energy assistant">
        <IconButton
          aria-label="Open energy assistant"
          onClick={() => setOpen(true)}
          sx={{
            position: 'fixed',
            right: { xs: 16, sm: 28 },
            bottom: { xs: 72, sm: 28 },
            zIndex: 1200,
            bgcolor: 'var(--color-amber)',
            color: '#14181D',
            borderRadius: '4px',
            boxShadow: 'none',
            '&:hover': { bgcolor: '#c47d25' },
          }}
        >
          <AssistantIcon />
        </IconButton>
      </Tooltip>

      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: '100%', sm: 390 },
            display: 'flex',
            bgcolor: 'var(--color-surface, #1C222A)',
            borderLeft: '1px solid var(--color-line)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1.5, borderBottom: '1px solid var(--color-line)' }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Energy assistant</Typography>
            <Typography variant="caption" sx={{ color: 'var(--color-ink-muted)' }}>Answers from your live ledger</Typography>
          </Box>
          <IconButton aria-label="Close energy assistant" onClick={() => setOpen(false)} sx={{ color: 'var(--color-ink-muted)' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 1.25 }}>
          {messages.length === 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Ask about your energy data.</Typography>
              <Typography variant="body2" sx={{ color: 'var(--color-ink-muted)', mt: 0.5 }}>Try a question about spend, fuel mix, trends, or your open recommendations.</Typography>
            </Box>
          )}
          {messages.map((item, index) => (
            <Box
              key={`${item.role}-${index}`}
              sx={{
                alignSelf: item.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '88%',
                px: 1.5,
                py: 1.1,
                borderRadius: '4px',
                bgcolor: item.role === 'user' ? 'var(--color-amber)' : 'rgba(255, 255, 255, 0.04)',
                color: item.role === 'user' ? '#14181D' : 'var(--color-ink)',
                border: item.role === 'user' ? 'none' : '1px solid var(--color-line)',
              }}
            >
              <Typography variant="body2">{item.content}</Typography>
            </Box>
          ))}
          {sending && <CircularProgress size={18} sx={{ alignSelf: 'flex-start', mt: 1, color: 'var(--color-amber)' }} />}
          {error && <Typography variant="caption" sx={{ color: 'var(--color-rust)' }}>{error}</Typography>}
        </Box>

        <Box component="form" onSubmit={handleSend} sx={{ p: 1.5, borderTop: '1px solid var(--color-line)' }}>
          <TextField
            fullWidth
            multiline
            maxRows={4}
            placeholder="Ask about your energy data"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            slotProps={{
              input: {
                sx: { borderRadius: '4px' },
                endAdornment: (
                  <Button type="submit" aria-label="Send message" disabled={!message.trim() || sending} sx={{ color: 'var(--color-amber)', minWidth: 'auto', p: 0.75 }}>
                    <SendIcon />
                  </Button>
                ),
              },
            }}
          />
        </Box>
      </Drawer>
    </>
  )
}