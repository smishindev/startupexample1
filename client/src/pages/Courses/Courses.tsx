import React from 'react'
import { Typography, Box } from '@mui/material'

const Courses: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold">
        Courses
      </Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Course catalog and management - Coming soon!
      </Typography>
    </Box>
  )
}

export default Courses