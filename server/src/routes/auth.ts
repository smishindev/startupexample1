import { Router } from 'express';

const router = Router();

// Login
router.post('/login', (req, res) => {
  res.json({ message: 'Auth login endpoint - coming soon' });
});

// Register
router.post('/register', (req, res) => {
  res.json({ message: 'Auth register endpoint - coming soon' });
});

// Refresh token
router.post('/refresh', (req, res) => {
  res.json({ message: 'Auth refresh endpoint - coming soon' });
});

export { router as authRoutes };