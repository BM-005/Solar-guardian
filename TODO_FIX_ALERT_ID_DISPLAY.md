# TODO: Fix Alert ID not being displayed in Scan Details

## Task
Panel ID (P3) is being displayed correctly, but Alert ID is not being displayed in the scan details.

## Root Cause
The SolarScan model in Prisma doesn't have an alertId field, and the API doesn't include the related Alert's alertId when fetching scans.

## Plan

### Step 1: Update GET /api/solar-scans endpoint
- Modify the Prisma query in `server/src/routes/solarScans.ts` to include the Alert relation
- Map the alertId from the related Alert to the scan response

### Step 2: Test the fix
- Verify that scans now include alertId in the API response
- Verify that the Scan Details dialog displays the Alert ID correctly

## Implementation

### Edit: server/src/routes/solarScans.ts
1. Update the GET '/' endpoint to include alert: true in the include clause
2. Map the alert.alertId to the response

