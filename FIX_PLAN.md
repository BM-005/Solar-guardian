# Solar Guardian - Fix Plan

## Issues Identified

### 1. Badge Component Missing Variants
- **File**: `src/components/ui/badge.tsx`
- **Issue**: Badge only has `default`, `secondary`, `destructive`, `outline` variants
- **Fix**: Add `info`, `warning`, `success` variants to `badgeVariants`

### 2. AlertCard Uses Invalid Classes
- **File**: `src/components/dashboard/AlertCard.tsx`
- **Issue**: Uses `bg-info`, `text-info`, `bg-warning`, etc. as classes
- **Fix**: Replace with proper Badge variants (`variant="info"`, `variant="warning"`)

### 3. WeatherWidget Uses Invalid Classes
- **File**: `src/components/dashboard/WeatherWidget.tsx`
- **Issue**: Uses `text-info` class for icons
- **Fix**: Replace with `text-blue-500` (or use CSS variable `text-[hsl(var(--info))]`)

### 4. Technicians.tsx Status Colors
- **File**: `src/pages/Technicians.tsx`
- **Issue**: Uses `statusColors` with classes like `bg-success text-success-foreground`
- **Fix**: Keep using classes (they reference CSS variables), but ensure consistency

### 5. Dashboard.tsx AlertCard Usage
- **File**: `src/pages/Dashboard.tsx`
- **Issue**: Passes `onCreateTicket` and `onDismiss` props
- **Fix**: Check if props are properly used

## Files to Modify

1. `src/components/ui/badge.tsx` - Add info, warning, success variants
2. `src/components/dashboard/AlertCard.tsx` - Replace custom classes with Badge variants
3. `src/components/dashboard/WeatherWidget.tsx` - Fix text-info usage

## Implementation Steps

### Step 1: Update Badge Component
Add new variants for info, warning, success colors

### Step 2: Update AlertCard
Replace `className={severityBadgeStyles[fault.severity]}` with `variant="default"` and custom classes

### Step 3: Update WeatherWidget
Replace `text-info` with `text-[hsl(var(--info))]` or `text-blue-500`

### Step 4: Verify Technicians.tsx
Keep statusColors as-is since they use CSS variables properly

### Step 5: Run and Test
Start the frontend and verify no console errors

