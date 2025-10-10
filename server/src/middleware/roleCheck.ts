import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';

export const checkRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;
    
    if (!userRole) {
      res.status(401).json({ error: 'User role not found' });
      return;
    }

    if (!allowedRoles.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};