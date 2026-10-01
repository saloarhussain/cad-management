import json
import re

with open('explore.html', 'r', encoding='utf-8') as f:
    html = f.read()

config_match = re.search(r'tailwind\.config=(.*?);?</script>', html, re.DOTALL)
if config_match:
    config_str = config_match.group(1).strip()
    
    # We need to make the config string valid JSON. It has unquoted keys.
    # Actually, a simpler way is to just do a quick regex replace to quote keys, 
    # but it's risky. Let's use a simpler heuristic or just write the CSS directly.
    # Let me just regex parse the colors and spacings.
    pass

css = """
/* Injected Explore Page Theme */
@theme {
  --color-on-primary-fixed: #1a1e00;
  --color-on-error-container: #ffdad6;
  --color-text-muted: #5A6172;
  --color-on-background: #e3e2e7;
  --color-surface-dim: #121317;
  --color-tertiary-fixed-dim: #1ce19f;
  --color-on-primary-fixed-variant: #434b00;
  --color-secondary-fixed: #ffddb4;
  --color-surface-container-high: #292a2e;
  --color-error: #ffb4ab;
  --color-secondary-fixed-dim: #ffb955;
  --color-inverse-surface: #e3e2e7;
  --color-tertiary-fixed: #4ffeb9;
  --color-surface-container: #1f1f24;
  --color-accent-glow: rgba(226, 248, 70, 0.18);
  --color-surface-container-lowest: #0d0e12;
  --color-tertiary: #ffffff;
  --color-primary-fixed-dim: #bdd11a;
  --color-on-tertiary-container: #00734f;
  --color-surface-border-subtle: #1B1E28;
  --color-secondary: #ffb955;
  --color-outline: #91927a;
  --color-inverse-primary: #596400;
  --color-error-container: #93000a;
  --color-primary-fixed: #d9ee3c;
  --color-text-primary: #F7F8FA;
  --color-text-secondary: #9CA3AF;
  --color-on-secondary-fixed: #291800;
  --color-on-secondary-container: #4f3100;
  --color-surface-deep: #08090C;
  --color-on-tertiary-fixed-variant: #005237;
  --color-surface-bright: #38393d;
  --color-inverse-on-surface: #2f3035;
  --color-surface-canvas: #0D0E12;
  --color-surface-tint: #bdd11a;
  --color-surface-variant: #343439;
  --color-on-primary-container: #5f6a00;
  --color-amber-glow: rgba(245, 166, 35, 0.20);
  --color-tertiary-container: #4ffeb9;
  --color-surface-card: #14161E;
  --color-outline-variant: #464834;
  --color-background: #121317;
  --color-surface-container-low: #1a1b20;
  --color-on-primary: #2d3400;
  --color-on-tertiary-fixed: #002114;
  --color-primary: #ffffff;
  --color-on-error: #690005;
  --color-on-tertiary: #003824;
  --color-surface: #121317;
  --color-surface-card-elevated: #1E222D;
  --color-surface-container-highest: #343439;
  --color-on-surface-variant: #c7c8ae;
  --color-on-secondary: #452b00;
  --color-primary-container: #d9ee3c;
  --color-on-surface: #e3e2e7;
  --color-on-secondary-fixed-variant: #633f00;
  --color-secondary-container: #dc9100;
  --color-surface-border: #282D3C;

  --spacing-space-xs: 0.25rem;
  --spacing-gutter-mobile: 1rem;
  --spacing-space-xl: 2.5rem;
  --spacing-space-lg: 1.5rem;
  --spacing-space-md: 1rem;
  --spacing-gutter: 1.5rem;
  --spacing-margin-mobile: 1rem;
  --spacing-space-sm: 0.5rem;
  --spacing-margin: 2.5rem;

  --font-body-sm: "Inter";
  --font-body-lg: "Inter";
  --font-headline-lg: "Hanken Grotesk";
  --font-display-hero: "Hanken Grotesk";
  --font-headline-sm: "Hanken Grotesk";
  --font-stat-counter: "Hanken Grotesk";
  --font-headline-md: "Hanken Grotesk";
  --font-headline-lg-mobile: "Hanken Grotesk";
  --font-label-caps: "Hanken Grotesk";
  --font-body-md: "Inter";
  --font-label-md: "Hanken Grotesk";
  --font-display-hero-mobile: "Hanken Grotesk";

  --text-body-sm: 12px;
  --text-body-sm--line-height: 18px;
  --text-body-sm--font-weight: 400;

  --text-body-lg: 16px;
  --text-body-lg--line-height: 26px;
  --text-body-lg--font-weight: 400;

  --text-headline-lg: 30px;
  --text-headline-lg--line-height: 38px;
  --text-headline-lg--letter-spacing: -0.02em;
  --text-headline-lg--font-weight: 700;

  --text-display-hero: 48px;
  --text-display-hero--line-height: 56px;
  --text-display-hero--letter-spacing: -0.03em;
  --text-display-hero--font-weight: 800;

  --text-headline-sm: 16px;
  --text-headline-sm--line-height: 24px;
  --text-headline-sm--font-weight: 600;

  --text-stat-counter: 28px;
  --text-stat-counter--line-height: 32px;
  --text-stat-counter--letter-spacing: -0.02em;
  --text-stat-counter--font-weight: 800;

  --text-headline-md: 20px;
  --text-headline-md--line-height: 28px;
  --text-headline-md--letter-spacing: -0.01em;
  --text-headline-md--font-weight: 600;

  --text-headline-lg-mobile: 24px;
  --text-headline-lg-mobile--line-height: 32px;
  --text-headline-lg-mobile--letter-spacing: -0.01em;
  --text-headline-lg-mobile--font-weight: 700;

  --text-label-caps: 11px;
  --text-label-caps--line-height: 16px;
  --text-label-caps--letter-spacing: 0.12em;
  --text-label-caps--font-weight: 700;

  --text-body-md: 14px;
  --text-body-md--line-height: 22px;
  --text-body-md--font-weight: 400;

  --text-label-md: 13px;
  --text-label-md--line-height: 18px;
  --text-label-md--letter-spacing: 0.02em;
  --text-label-md--font-weight: 600;

  --text-display-hero-mobile: 32px;
  --text-display-hero-mobile--line-height: 40px;
  --text-display-hero-mobile--letter-spacing: -0.02em;
  --text-display-hero-mobile--font-weight: 800;
}
"""

with open('prism_logic/cad-dashboard-app/src/app/globals.css', 'a', encoding='utf-8') as out:
    out.write(css)

print('Added config to globals.css')
