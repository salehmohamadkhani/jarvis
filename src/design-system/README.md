# Design System

## Current State

### Styling Strategy

- **Main stylesheet**: Single `App.css` file (~1400 lines) with CSS variables
- **UI Library**: Mantine UI (@mantine/core) used in 22+ files
- **Custom CSS classes**: `.container`, `.page-title`, `.today-card`, `.badge`, `.pill`, `.task-priority-pill`, `.task-tag-pill`
- **Theme**: Light theme with CSS variables for colors, shadows, and radius

### Existing Patterns

1. **Page Layout**
   - `.container` - Full width container wrapper
   - `.page-title` - Page heading (1.5rem, bold)

2. **Section Cards**
   - `.today-card` - Dark themed cards with backdrop blur (`rgba(15,23,42,0.85)`)
   - Used for Today page sections (Tasks, Meetings, Money)

3. **Badges & Pills**
   - `.badge` - Small rounded labels
   - `.badge--ok`, `.badge--warn`, `.badge--danger`, `.badge--project` - Variants
   - `.pill` - Status indicators with `.pill--ok`, `.pill--warn` variants
   - `.task-priority-pill` - Priority indicators (high/medium/low)
   - `.task-tag-pill` - Tag labels

4. **Color System**
   - Light theme base: `#f4f6fb` (background), `#ffffff` (surface)
   - Dark cards: `rgba(15,23,42,0.85)` with `rgba(148,163,184,0.4)` borders
   - Primary accent: `#0ea5e9`
   - Status colors: Success `rgba(34,197,94,.5)`, Warning `rgba(248,113,113,.6)`, Danger `rgba(239,68,68,.7)`

## Standardization Goals

### What We Will Standardize

1. **Layout Components**
   - `DSPage` - Unified page wrapper with title and actions
   - `DSSection` - Consistent section containers (replaces `.today-card` pattern)
   - `DSCard` - Generic card component for reusable containers

2. **Interactive Components**
   - `DSButton` - Standardized buttons (primary/secondary variants)
   - `DSPill` - Status/priority indicators with consistent styling
   - `DSTagPill` - Tag labels

3. **Design Tokens**
   - Colors extracted from CSS variables
   - Spacing scale (xs: 4px → xl: 24px)
   - Border radius values (sm: 8px → xl: 24px)
   - Shadow definitions

4. **Migration Strategy**
   - Keep Mantine components for now (gradual migration)
   - New components should use DS components
   - Existing pages will be refactored incrementally

### Benefits

- **Consistency**: Unified styling across all pages
- **Maintainability**: Single source of truth for design tokens
- **Scalability**: Easy to add new components following established patterns
- **Type Safety**: Design tokens as JS objects for better IDE support

