# TODO: Fix Image URL Issue for Teammates

## Task
Fix the issue where teammates get scan data but not images due to localhost URLs.

## Steps

- [x] 1. Add /api/config endpoint in server/src/index.ts to expose backend URL
- [x] 2. Update src/lib/api.ts to fetch and cache backend config
- [x] 3. Fix resolveImageUrl function in src/pages/Scans.tsx
- [x] 4. Check and update src/components/dashboard/PiScansWidget.tsx (No changes needed - uses user-provided URL)

## Root Cause
- rgbImageUrl / thermalImageUrl points to localhost
- On teammate laptop, localhost means their own machine, not the backend
- Frontend built with VITE_API_URL=localhost causes broken images on teammates' machines

## Solution
- Add backend config endpoint that returns the actual backend IP/domain
- Update frontend to dynamically use the backend URL for image resolution
- This works regardless of how the frontend was built

## How to Test
1. Ask teammate to open /api/solar-scans/latest and check rgbImageUrl
2. If it contains localhost, that confirms the issue
3. After fix, image URLs should resolve to the shared backend IP

## Note on Old Scans
Old scans saved with localhost URLs will still be broken. To fix:
- Capture fresh scans (new scans will have correct URLs), OR
- Manually update old URLs in the database

