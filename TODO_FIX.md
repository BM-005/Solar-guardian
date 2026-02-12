# Fix Plan

## Critical Errors to Fix

### 1. Tickets.tsx - JSX Structure Error
- Issue: Missing closing `</CardContent>` and `</Card>` tags inside the ticket mapping
- Location: Inside `filteredTickets.map(ticket => {` block

### 2. Dashboard.tsx - Missing Button Closing Tags  
- Issue: Missing `</Button>` tags after onClick handlers in AlertCard
- Location: Line 93 area - `onCreateTicket={handleCreateTicket}` and `onDismiss={handleDismiss}`

### 3. Badge Color Issues - Invalid "info" color
- Issue: Using undefined `info` color variant that doesn't exist in shadcn/ui
- Files affected:
  - Technicians.tsx (line 116: `text-info`)
  - Dashboard.tsx (line 93: `variant="info"`)
  - Tickets.tsx (multiple `text-info` and `bg-info` usages)

## Fix Strategy

1. Fix Tickets.tsx JSX structure - close the CardContent and Card properly
2. Fix Dashboard.tsx - add missing </Button> closing tags
3. Replace `info` color with `default` or `secondary` (valid shadcn/ui colors)

## Files to Modify
- src/pages/Tickets.tsx
- src/pages/Dashboard.tsx
- src/pages/Technicians.tsx

