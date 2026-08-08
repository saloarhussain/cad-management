# Design System Strategy: The Electric Kinetic

## 1. Overview & Creative North Star
The "Creative North Star" for this design system is **"The Electric Kinetic."** 

In an industry filled with flat, static tools, this system introduces a sense of high-voltage momentum. We are moving away from the "grid-of-boxes" toward a high-visibility, technical environment that feels like a precision instrument. By utilizing piercing neon accents against a muted, industrial base, we create a UI that doesn't just display data—it broadcasts it with intent.

The system achieves focus through **balanced density** and **chromatic intensity**. We use precise spacing (normal density, level 2) to maintain functional efficiency while employing "high-vis" glows to highlight critical interactive paths. The result is a high-energy, performance-driven experience that feels engineered and urgent.

---

## 2. Colors & Surface Logic

### The Palette
Our color strategy relies on a muted, volcanic stone base (`neutral` - #7b7767) contrasted with a high-visibility spectrum of `primary` (electric yellow - #fce003), `secondary` (acid olive - #84782d), and `tertiary` (glacial cyan - #00fbfe).

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections or separate modules. Global structure is defined strictly through background shifts. For example, a sidebar should use `surface_container_low` against the main `background`, or a header should be distinguished simply by a `surface_bright` tone. Tonal shifts define the architecture of the space.

### Surface Hierarchy & Nesting
Think of the UI as machined layers of industrial glass. Use the `surface_container` tiers to create natural nesting:
*   **Base:** `surface` (#7b7767)
*   **Sectioning:** `surface_container_low` for large structural areas.
*   **Component Base:** `surface_container` for cards and modules.
*   **Active/Elevated:** `surface_container_high` or `highest` for items requiring immediate attention.

### The "Glass & Gradient" Rule
To achieve a signature look, utilize **Glassmorphism**. For floating panels or navigation, use a semi-transparent `surface_variant` with a `backdrop-filter: blur(20px)`. 

**Signature Gradients:** 
Apply a linear gradient (45deg) from `primary` (#fce003) to `tertiary` (#00fbfe) for primary action buttons and "glowing" borders. This provides the visual "charge" that defines the Electric Kinetic identity.

---

## 3. Typography: The Editorial Edge

Our typography uses a high-contrast scale to create an engineered feel, moving between the geometric authority of **Plus Jakarta Sans** and the functional clarity of **Inter**.

*   **Display & Headlines (Plus Jakarta Sans):** These are your "vibe" setters. Use `display-lg` and `headline-lg` with tight letter-spacing (-0.02em) to create a bold, technical impact. 
*   **UI & Body (Inter):** All functional data—task names, descriptions, and labels—must use Inter. It is optimized for high-contrast readability in dark modes.
*   **Visual Hierarchy:** Use `label-sm` in all-caps with increased letter-spacing (+0.05em) for secondary metadata to create a "tactical" aesthetic that balances the vibrant yellow accents.

---

## 4. Elevation & Depth

We avoid traditional drop shadows. Instead, we use **Tonal Layering** and **Luminescent Depth**.

*   **The Layering Principle:** A `surface_container_highest` card sitting on a `surface_container_low` background creates a natural, clean lift.
*   **Ambient Glows:** When an element must float (like a modal), use a high-blur (40px-60px), low-opacity (12%) shadow tinted with the `primary` color (#fce003) rather than black. This creates a "light-spill" effect.
*   **The "Ghost Border" Fallback:** If a container requires a border for accessibility, use the `outline_variant` token at **15% opacity**.
*   **Interactive Borders:** For high-energy cards, use a 1.5px gradient border (Primary to Tertiary) but only on hover. This "ignition" effect reinforces the Kinetic North Star.

---

## 5. Components

### Buttons
*   **Primary:** A vibrant gradient background (Primary → Tertiary) with `on_primary_container` text. Use `md` (roundedness 2) for a precise, modern feel.
*   **Secondary:** A "Ghost" style. No fill, but a border using the `primary` token at 40% opacity. 
*   **Tertiary:** Purely text-based using `primary_fixed`, appearing only on hover with a subtle `surface_bright` background shift.

### Cards (Task/Project)
*   **Styling:** Use `surface_container` with `md` (roundedness 2) corner radius. 
*   **Interaction:** On hover, apply a subtle `primary` outer glow (`box-shadow: 0 0 15px rgba(252, 224, 3, 0.25)`).
*   **Content:** No dividers. Use standard 16px-20px vertical padding (from the spacing 2 scale) to separate content blocks.

### Input Fields
*   **Base:** `surface_container_lowest` with a `md` (roundedness 2) radius.
*   **Focus State:** The border transitions from `outline_variant` to a 2px solid `primary` (#fce003). Add a subtle inner glow to the text to make it feel "powered on."

### Progress Indicators
*   **Track:** `surface_container_highest`.
*   **Indicator:** A multi-stop gradient (Yellow → Lime → Cyan). This reinforces the "High-Voltage" energy of the system.

### Custom Component: The "Pulse" Chip
*   **Usage:** For "Live" or "Urgent" tasks. 
*   **Style:** A `secondary_container` chip with a small, 4px dot that has a CSS animation pulse effect using the `primary` color.

---

## 6. Do's and Don'ts

### Do
*   **DO** use high-contrast text ratios. The primary yellow is very bright; ensure `on_primary` text maintains legibility.
*   **DO** use the `full` (9999px) roundedness for tags and status indicators to contrast against the `md` (roundedness 2) containers.
*   **DO** maintain the "Normal" spacing (level 2) to keep the interface feeling like a professional dashboard rather than a loose blog layout.

### Don't
*   **DON'T** use pure black (#000000). Always use the `neutral_color_hex` base (#7b7767) to maintain the industrial, tonal richness.
*   **DON'T** use 1px dividers. If you feel the need for a line, use a gap of empty space or a subtle shift in surface tone instead.
*   **DON'T** use soft, rounded edges (level 3). Stay with level 2 (Moderate) to preserve the "Electric Kinetic" edge.
*   **DON'T** clutter the screen. Even with "Normal" spacing, use progressive disclosure to hide secondary data and keep the focus on high-priority tasks.