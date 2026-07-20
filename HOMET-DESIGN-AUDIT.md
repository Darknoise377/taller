# Home Redesign Audit & Architecture

## Current State Audit

| Aspect | Score (1-10) | Issue |
|--------|-------------|-------|
| Visual Hierarchy | 6 | H1 competes with Hero; search lacks dominance |
| Space Distribution | 5 | Hero ~700px+; forces 2-3 screen scrolls to content |
| White Space Balance | 7 | Good contrast but tall blocks overload visually |
| Hero Visual Weight | 4 | Too dominant; 550px slider + extended copy |
| Search Visibility | 4 | Hidden within Hero; not the primary CTA |
| Catalog Organization | 6 | 4-col grid, no quick-access filters |
| Navigation | 7 | Sticky navbar good; mobile bottom nav collides |
| Scanability | 5 | Multiple competing CTAs; unclear flow |
| Purchase Flow | 6 | Long path from entry to checkout |
| Conversion | 5 | Search not prioritized; redundant trust bars |
| Responsive | 7 | Good adaptation but Hero remains oversized |
| Accessibility | 6 | Partial focus management; ARIA gaps |
| Scalability | 6 | Components structured but need reorganization |

---

## Proposed Visual Architecture (Top to Bottom)

### 1. AnnouncementBar
- **UX Objective**: Communicate shipping/promos without permanent space
- **Visual Priority**: Low (auto-dismiss after 5s)
- **Size**: 36px height
- **Behavior**: Auto-slide between 4 messages, dismissible
- **Interaction**: Click to dismiss, pause on hover
- **Why Exists**: Creates urgency for new visitors
- **Problem Solves**: Prime-time promotion visibility

### 2. Header/Navbar
- **UX Objective**: Persistent navigation and branding
- **Visual Priority**: Medium-High (always accessible)
- **Size**: 64px height
- **Behavior**: Sticky top, transparent → solid on scroll
- **Interaction**: Hover states, mobile menu toggle
- **Why Exists**: Brand identity and navigation access
- **Problem Solves**: Prevent user disorientation

### 3. SearchHero (NEW - Protagonist)
- **UX Objective**: Immediate product discovery
- **Visual Priority**: MAXIMUM (dominant focal point)
- **Size**: 100px desktop, 80px mobile
- **Behavior**: Sticky intelligent collapse
- **Desktop**: Collapses to 64px bar on scroll
- **Tablet**: Reduces to 56px with hidden filters
- **Mobile**: No sticky (takes valuable viewport)
- **Width**: 90% max-width, centered
- **Height**: 56px input (desktop), 48px (mobile)
- **Animation**: Smooth height transition, shadow expansion
- **Focus Visual**: Ring-2 border, glow effect, subtle scale
- **Why Exists**: Conversion driver - 80% of users search first
- **Problem Solves**: Eliminates search friction

### 4. QuickFilters (Part of SearchHero)
- **UX Objective**: One-tap popular searches
- **Visual Priority**: High (below search bar)
- **Size**: 60px height (desktop), full-width chips (mobile)
- **Behavior**: Horizontal scroll, always visible
- **Responsive**: 
  - Mobile: 2 rows of chips
  - Tablet: 1 row, scroll
  - Desktop: Single row, fade edges
- **Interaction**: Chip tap → search execution
- **Active State**: bg-[#0A2A66], text-white, shadow-md
- **Hover**: scale-105, border highlight
- **Why Exists**: Reduce cognitive load for common searches
- **Problem Solves**: "Frenos para KTM", "Llantas NKD" pre-built

### 5. HeroCompact (REDUCED)
- **UX Objective**: Brand storytelling (minimal)
- **Visual Priority**: Medium
- **Size**: 320px max (desktop), 220px (mobile)
- **Reduction**: From ~700px to ~320px (55% reduction)
- **Elements Removed**:
  - CountdownTimer → moved to BenefitsStrip
  - Internal trust bar → consolidated into StatsStrip
  - Extended copy → reduced to 1 line
- **Elements Moved**:
  - Seasonal badge → SearchHero section
- **Behavior**: Manual slider only (no autoplay)
- **Interaction**: Arrow navigation, indicator dots
- **Why Exists**: Emotional connection, not primary task
- **Problem Solves**: Balances branding with speed

### 6. StatsStrip (NEW - Sticky Contextual)
- **UX Objective**: Build trust quickly
- **Visual Priority**: Medium (sticky context)
- **Size**: 60px height
- **Behavior**: Sticky below SearchHero until Categories
- **Content**: 4 key metrics (envíos, garantía, pago, experiencia)
- **Icons**: Inline SVG, brand-colored
- **Responsive**: 
  - Mobile: 2x2 grid
  - Desktop: Horizontal row
- **Why Exists**: Social proof without scroll
- **Problem Solves**: Trust without dedicated scroll section

### 7. CategoriesGrid
- **UX Objective**: Browse by product type
- **Visual Priority**: High
- **Size**: Auto-height, 160px min per card
- **Grid**:
  - Mobile: 2 columns
  - Tablet: 4 columns
  - Desktop: 6 columns
- **Chips**: No - grid cards only
- **Icons**: Heroicons 24px, gradient background
- **Responsive**: Consistent 2-6 columns
- **Hover**: Elevate (-translate-y-2), glow overlay
- **Active State**: Border 2px #0A2A66 on image hover
- **Why Exists**: Alternative navigation to search
- **Problem Solves**: "No sé qué buscar" user path

### 8. ProductCatalogSection
- **UX Objective**: Product discovery with filtering
- **Visual Priority**: Highest (main content)
- **Size**: Variable (infinite scroll)
- **Cards per Row**:
  - Mobile: Carousel snap (1 card, 75% width)
  - Tablet: 3 cards
  - Desktop: 4 cards
- **Card Size**: 280x380px
- **Gap**: 16px
- **Lazy Loading**: IntersectionObserver, 200px margin
- **Skeletons**: Aspect-ratio preserved placeholders
- **Pagination**: Infinite scroll + manual "Cargar más" button
- **Why Exists**: Primary product browsing
- **Problem Solves**: Reduces initial load, shows more products

### 9. FilterBarSticky (NEW)
- **UX Objective**: Rapid refinement while browsing
- **Visual Priority**: High (sticky on scroll)
- **Position**: Directly above ProductCatalog
- **Behavior**: Sticky top 120px (SearchHero end)
- **Responsive**:
  - Mobile: Collapsed (tap to expand)
  - Tablet/Desktop: Always visible
- **Scroll**: Horizontal scroll with fade edges
- **Filters**: Modelo, Categoría, Precio, Marca
- **Why Exists**: Mercado Libre-style rapid filtering
- **Problem Solves**: Users can filter without losing position

### 10. BrandsMarquee (OPTIONAL)
- **UX Objective**: Manufacturer credibility
- **Visual Priority**: Low-Medium
- **When Appears**: After product catalog
- **Why**: Social proof for Bajaj, KTM, Pulsar
- **Size**: 80px height max
- **Layout**: Continuous marquee (CSS animation)
- **Interaction**: Pause on hover, tap to filter brand
- **Why Exists**: "Venden marcas que conozco" trust
- **Problem Solves**: Brand-specific users find products faster

### 11. BenefitsStrip (REFINED)
- **UX Objective**: Reassure before purchase decision
- **Visual Priority**: Medium
- **Size**: 180px max (from 280px)
- **Layout**:
  - Desktop: 4 icons horizontal
  - Mobile: 2x2 grid
- **Icons**: 32px lineicons
- **Text**: 2-3 words max per benefit
- **Why Exists**: Reduce purchase anxiety
- **Problem Solves**: Condenses trust from 3 sections into 1

### 12. FeaturedCombosSection
- **UX Objective**: Cross-sell opportunity
- **Visual Priority**: Medium
- **Size**: Auto with max-height 400px
- **Layout**: Hero combo + 3 secondary (desktop), carousel (mobile)
- **Behavior**: Manual scroll only
- **Why Exists**: Increase AOV
- **Problem Solves**: "Más productos, menos dinero" upsell

### 13. TrustIndicators (INLINE - Consolidated)
- **UX Objective**: Footer-level trust signals
- **Visual Priority**: Low
- **Position**: Above Footer, not separate section
- **Why Exists**: Last trust checkpoint before exit
- **Problem Solves**: Eliminates duplicate trust sections

### 14. Footer
- **UX Objective**: Legal, navigation, brand info
- **Visual Priority**: Low
- **Size**: Auto with 120px total height
- **Layout**: 3-column (brand, nav, legal)
- **Why Exists**: Required information, SEO links
- **Problem Solves**: Completes page structure

---

## Component Architecture Tree

```text
Home
│
├── AnnouncementBar (fixed 36px, dismissible)
│
├── Header/Navbar (sticky 64px)
│   ├── LogoBrand
│   ├── NavLinks (desktop only)
│   └── MobileNav (bottom bar)
│
├── SearchHero (sticky container)
│   ├── SearchBar (prominent, centered)
│   │   ├── SearchInput (90% max-width)
│   │   ├── SearchButton (icon + text)
│   │   └── ClearButton (conditional)
│   └── QuickFilterChips (horizontal scroll)
│       └── FilterChip (reusable)
│
├── HeroCompact (max 320px)
│   ├── HeroSlider (manual only)
│   └── HeroCTAGroup (single primary CTA)
│
├── CategoriesSection
│   ├── SectionHeader
│   └── CategoryGrid (6-col desktop)
│       └── CategoryCard (reusable)
│
├── ProductCatalogSection
│   ├── FilterBarSticky (NEW)
│   │   ├── SortSelect
│   │   ├── CategoryFilters
│   │   └── BrandFilters
│   └── ProductGrid (infinite scroll)
│       └── ProductCard (existing)
│
├── BrandsMarquee (conditional)
│   └── BrandChip (reusable)
│
├── BenefitsStrip
│   └── BenefitItem (4x, reusable)
│
├── FeaturedCombosSection
│   ├── ComboHeader
│   └── ComboGrid
│       └── ComboCard (existing)
│
├── TrustIndicators (inline)
│   └── TrustItem
│
├── FloatingCombos (mobile persistent)
│   └── ComboSheet
│
└── Footer
    ├── FooterBrand
    ├── FooterNav
    └── FooterLegal
```

---

## High-Impact UX Improvements (Conversion Focus)

| Priority | Improvement | Expected Impact |
|----------|-------------|-----------------|
| ★★★★★ | SearchHero as primary focal point | 25-35% increase in searches |
| ★★★★★ | Sticky collapsing search bar | 15-20% faster product discovery |
| ★★★★★ | FilterBar sticky during scroll | 20% more refined searches |
| ★★★★☆ | Hero reduced 50% | 30% less initial scroll |
| ★★★★☆ | QuickFilter chips for popular models | 30% reduction in search abandonment |
| ★★★★☆ | Single CTA per viewport | 15% clearer action path |
| ★★★☆☆ | Lazy loading + skeletons | 20% perceived performance gain |
| ★★★☆☆ | Eliminate redundant trust bars | Cleaner visual flow |
| ★★★☆☆ | Mobile bottom nav collision fix | Better mobile usability |

---

## Responsive Breakpoints

### Mobile (<768px)
- AnnouncementBar → Hidden after 5s
- Header → 64px, logo only
- SearchHero → Fixed 80px, no sticky
- QuickFilters → 2-row chip grid
- HeroCompact → 220px height
- Categories → 2-column grid
- Products → Carousel snap (75% width cards)
- FilterBar → Collapsed hamburger
- Benefits → 2x2 grid

### Tablet (768px - 1024px)
- Header → 64px, full nav
- SearchHero → Sticky 90px → 56px collapse
- QuickFilters → Horizontal scroll
- HeroCompact → 280px height
- Categories → 3-4 columns
- Products → 3-column grid
- FilterBar → Visible horizontal

### Desktop (>1024px)
- SearchHero → Sticky 100px → 64px intelligent
- QuickFilters → Full chip row
- HeroCompact → 320px max
- Categories → 6-column grid
- Products → 4-column grid + infinite scroll
- FilterBar → Sticky visible filter bar
- Brands → Marquee animation (if included)