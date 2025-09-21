import React from 'react'
import { Typography, Box, Grid, Card, CardContent, Paper } from '@mui/material'

const Dashboard: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Dashboard
      </Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                My Courses
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                5
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="secondary">
                Study Hours
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                24h
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                Completed
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                3
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="warning.main">
                In Progress
              </Typography>
              <Typography variant="h4" fontWeight="bold">
                2
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Dashboard with learning analytics, progress charts, and AI recommendations coming soon!
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}

export default Dashboard