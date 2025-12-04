/**
 * PresenceStatusSelector Component
 * Dropdown to change user's presence status
 */

import React, { useState } from 'react';
import {
  Box,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  FiberManualRecord as OnlineIcon,
  RadioButtonUnchecked as OfflineIcon,
  Schedule as AwayIcon,
  DoNotDisturb as BusyIcon,
  ArrowDropDown as DropdownIcon,
} from '@mui/icons-material';
import { PresenceStatus } from '../../types/presence';
import { presenceApi } from '../../services/presenceApi';
import { toast } from 'sonner';

interface PresenceStatusSelectorProps {
  currentStatus: PresenceStatus;
  onStatusChange: (status: PresenceStatus) => void;
}

const PresenceStatusSelector: React.FC<PresenceStatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [updating, setUpdating] = useState(false);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleStatusSelect = async (status: PresenceStatus) => {
    if (status === currentStatus) {
      handleClose();
      return;
    }

    setUpdating(true);
    try {
      await presenceApi.updateStatus(status);
      onStatusChange(status);
      toast.success(`Status changed to ${status}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
      handleClose();
    }
  };

  const getStatusIcon = (status: PresenceStatus) => {
    switch (status) {
      case 'online':
        return <OnlineIcon sx={{ color: '#44b700', fontSize: 16 }} />;
      case 'away':
        return <AwayIcon sx={{ color: '#ffa500', fontSize: 16 }} />;
      case 'busy':
        return <BusyIcon sx={{ color: '#ff0000', fontSize: 16 }} />;
      case 'offline':
        return <OfflineIcon sx={{ color: '#9e9e9e', fontSize: 16 }} />;
    }
  };

  const getStatusLabel = (status: PresenceStatus) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const statusOptions: PresenceStatus[] = ['online', 'away', 'busy', 'offline'];

  return (
    <Box>
      <Tooltip title="Change status">
        <IconButton
          onClick={handleClick}
          size="small"
          disabled={updating}
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            px: 1,
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          <Box display="flex" alignItems="center" gap={0.5}>
            {getStatusIcon(currentStatus)}
            <Typography variant="body2" sx={{ mx: 0.5 }}>
              {getStatusLabel(currentStatus)}
            </Typography>
            <DropdownIcon fontSize="small" />
          </Box>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {statusOptions.map((status) => (
          <MenuItem
            key={status}
            onClick={() => handleStatusSelect(status)}
            selected={status === currentStatus}
          >
            <ListItemIcon>
              {getStatusIcon(status)}
            </ListItemIcon>
            <ListItemText>
              {getStatusLabel(status)}
            </ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
};

export default PresenceStatusSelector;
