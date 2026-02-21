import React from 'react'
import { Container, Paper, Typography, Box } from '@mui/material'

const Register: React.FC = () => {
  return (
    <Container maxWidth="sm" sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', px: { xs: 2, sm: 3 } }}>
      <Paper sx={{ p: { xs: 2.5, sm: 4 }, width: '100%', borderRadius: 4 }}>
        <Box textAlign="center">
          <Typography variant="h3" fontWeight="bold" sx={{ mb: 2, fontSize: { xs: '1.75rem', sm: '3rem' } }}>
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