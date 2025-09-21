import React from 'react'
import { Container, Paper, Typography, Box } from '@mui/material'

const Register: React.FC = () => {
  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
      <Paper sx={{ p: 4, width: '100%', borderRadius: 4 }}>
        <Box textAlign="center">
          <Typography variant="h3" fontWeight="bold" sx={{ mb: 2 }}>
            Get Started
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Registration page - Coming soon! This will include user registration form.
          </Typography>
        </Box>
      </Paper>
    </Container>
  )
}

export default Register