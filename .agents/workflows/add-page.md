---
description: How to add a new page/screen to the CRM frontend
---

# Add New Page Workflow

## Steps

### 1. Create the Page Component
Create a new file at `frontend/src/pages/<PageName>.jsx`.

Follow this template pattern:
```jsx
export default function PageNamePage() {
  return (
    <>
      {/* Page Header - Always start with this */}
      <div className="mb-8">
        <h2 className="text-[32px] font-bold text-on-surface leading-[40px]" style={{ letterSpacing: '-0.02em' }}>
          Page Title
        </h2>
        <p className="text-sm text-on-surface-variant mt-1">
          Brief description of the page.
        </p>
      </div>

      {/* Page content cards go here */}
      <div className="bg-surface-container-lowest rounded-xl border border-outline-variant shadow-sm p-6">
        {/* Content */}
      </div>
    </>
  );
}
```

### 2. Add the Route
Open `frontend/src/App.jsx` and add a new `<Route>` inside the `DashboardLayout` routes:
```jsx
<Route path="new-page" element={<NewPage />} />
```

### 3. Add Sidebar Navigation
Open `frontend/src/components/Sidebar.jsx` and add an entry to the `navItems` array:
```js
{ icon: 'icon_name', label: 'Page Label', path: '/new-page' },
```
Use icons from [Material Symbols](https://fonts.google.com/icons).

### 4. Verify
// turbo
```bash
# Dev server should auto-reload. Navigate to the new route in the browser.
```

## Design Rules
- Use design tokens from `index.css` — never use raw hex colors
- Card backgrounds: `bg-surface-container-lowest`
- Page background: `bg-surface-container-low` (handled by layout)
- Borders: `border border-outline-variant`
- Shadow: `shadow-sm`
- Headings: `text-[32px] font-bold` with `letterSpacing: '-0.02em'`
- Body text: `text-sm` (14px)
- Labels: `text-xs font-semibold`
- Cross-reference existing pages and `stitch_ref/` HTML files for patterns
