import React from 'react'
import { Alert, AlertTitle, Box, Button } from '@mui/material'

export default function StatusAlert({
  severity = 'info',
  title,
  message,
  actionText,
  onAction,
  sx = {},
}) {
  return (
    <Box sx={{ my: 1.5, ...sx }}>
      <Alert
        severity={severity}
        action={
          actionText && onAction ? (
            <Button color="inherit" size="small" onClick={onAction}>
              {actionText}
            </Button>
          ) : null
        }
        sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: (theme) => `${theme.palette[severity]?.main}40`,
        }}
      >
        {title && <AlertTitle sx={{ fontWeight: 700 }}>{title}</AlertTitle>}
        {message}
      </Alert>
    </Box>
  )
}
