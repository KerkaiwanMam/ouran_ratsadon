# Design system & Civic Layer UI specifics

> ส่วนขยายจาก CLAUDE.md — ใช้ตอนตัด component / เขียน Tailwind config

## Design tokens

- **Primary color**: Purple #7F77DD (lighter: #AFA9EC, darker: #534AB7, darkest: #3C3489)
- **Success**: Green #1D9E75 (text on green bg: #3B6D11)
- **Warning**: Amber #BA7517 / #EF9F27 (text on amber bg: #854F0B)
- **Error**: Red #E24B4A / #A32D2D (text on red bg: #791F1F)
- **Treemap colors** (categorical): Purple, Amber, Teal, Coral, Gray — assigned by ministry category
- **Backgrounds**: shadcn/ui defaults (light/dark mode support)
- **Border radius**: `rounded-md` (8px) for inputs, `rounded-lg` (12px) for cards
- **Borders**: 0.5px solid for default, 1px for emphasis. No 2px.
- **Fonts**: System font stack (Tailwind default), Thai font fallback via Noto Sans Thai
- **Icons**: Lucide React icons (comes with shadcn/ui)
- **Dark mode**: Mandatory. Use Tailwind `dark:` classes.
- **Responsive**: Mobile-first. Breakpoints: sm (640), md (768), lg (1024)
- **Sidebar**: 220px fixed on desktop (Civic Layer has filter sidebar), 200px for Business Layer, collapsible on mobile
- **Language**: All UI text in Thai. Code and variable names in English.

## Civic Layer UI specifics

Based on WeVis (thbudget68) and USASpending.gov patterns:

### Treemap component
- Use D3.js or Recharts Treemap
- Proportional rectangles by amount
- Color by ministry category (not by amount)
- Cell content: name (font-weight 500), amount + percentage (smaller), red flag count badge (bottom-right)
- Hover: tooltip with full info
- Click: drill down (update breadcrumb, refetch sub-level data)

### Filter panel (search page)
- Collapsible groups with title in uppercase 10px gray
- Active filters shown as tags at top with X to remove
- Each filter row: checkbox + label + count
- Multi-select for ministry, budget type, status
- Range inputs for amount (min-max)
- "Clear all" link in filter group header

### Breadcrumb
- Horizontal pills separated by chevron
- Each pill clickable to go back to that level
- Right-aligned: total amount at current level

### Project detail page
- Two-column layout: main content (left) + sidebar (right, 280px)
- Red flag box: left-border accent (3px), light red background, no rounded corners on left side
- 5-year history bar chart with current year highlighted
- Sidebar sections: Share, Related Projects, Download, Data Source
