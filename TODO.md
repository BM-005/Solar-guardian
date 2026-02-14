# Real-Time Data Display Fix Plan

## Task
Fix the dashboard to display real-time data from ESP32 sensor updates.

## Files to Modify
1. `server/src/routes/panels.ts` - Add endpoint to track last sensor update time
2. `src/pages/Dashboard.tsx` - Improve LivePanelsDisplay component

## Steps
1. [ ] Add /api/panels/sensor-status endpoint to track ESP32 connection status
2. [ ] Update Dashboard LivePanelsDisplay component to show:
    - Last time data was received from ESP32
    - Connection status indicator
    - More prominent real-time data display
3. [ ] Test the implementation
