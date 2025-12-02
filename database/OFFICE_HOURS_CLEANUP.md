# Office Hours Database Management

## Clear All Office Hours Data

To reset/clear all office hours schedules and queue entries for testing:

### Method 1: PowerShell Script (Recommended)
```powershell
.\database\clear_office_hours.ps1
```

This script will:
- ✅ Delete all queue entries
- ✅ Deactivate all office hours schedules (soft delete)
- ✅ Show verification results

### Method 2: Direct SQL
```powershell
sqlcmd -S localhost,61299 -U mishin_learn_user -P "MishinLearn2024!" -d startUp1 -i database\clear_office_hours_data.sql
```

## Files
- `clear_office_hours.ps1` - PowerShell automation script
- `clear_office_hours_data.sql` - SQL cleanup script

## Notes
- Queue entries are **hard deleted** (no recovery)
- Schedules are **soft deleted** (IsActive = 0, preserves history)
- To permanently delete schedules, modify the SQL script
