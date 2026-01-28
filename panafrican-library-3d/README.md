# The Panafrican Library Will Not Be Colonized
## Interactive 3D Reading Room Simulation

[![Deploy Status](https://img.shields.io/badge/deploy-vercel-black)](https://panafrican-library-3d.vercel.app/)
[![Three.js](https://img.shields.io/badge/three.js-r128-blue)](https://threejs.org/)

> A curatorial Reading Room conceived as a living archive of panafrican and diasporic publishing. A space to read, listen, and slow down.

**Live Demo:** [panafrican-library-3d.vercel.app](https://panafrican-library-3d.vercel.app)

---

## 📋 Table of Contents

1. [Project Overview](#-project-overview)
2. [Project Team](#-project-team)
3. [Room Layout & Dimensions](#-room-layout--dimensions)
4. [Design Language](#-design-language)
5. [Furniture Library](#-furniture-library)
6. [Wall Art Collections](#-wall-art-collections)
7. [User Controls](#-user-controls)
8. [Decorator Mode](#-decorator-mode)
9. [Technical Implementation](#-technical-implementation)
10. [Deployment](#-deployment)
11. [Reference Materials](#-reference-materials)
12. [Version History](#-version-history)

---

## 🎯 Project Overview

This interactive 3D simulation recreates the Reading Room installation at **MoMA PS1**, featuring two connected gallery spaces designed as an immersive environment for exploring African and diasporic publishing, art, and culture.

The simulation allows curators and visitors to:
- Explore the space from multiple camera angles
- View furniture placement and room layout
- Decorate rooms with a library of furniture and artwork
- Capture screenshots for documentation
- Access design references via the mood board

---

## 👥 Project Team

| Role | Name | Organization | Website |
|------|------|--------------|---------|
| **Curator / Artistic Director** | Pascale Obolo | Afrikadaa | [afrikadaa.com](http://www.afrikadaa.com/) |
| **Curator / Creative Director** | Nalini Cazaux | Coolhunt Paris | [coolhuntparis.com](http://coolhuntparis.com) |
| **3D Simulation & Development** | Gordon Cyrus | Luvlab | [luvlab.io](http://luvlab.io) |

---

## 🏛️ Room Layout & Dimensions

### Floor Plan Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         CORRIDOR / STUDIO                        │
│                              (NORTH)                             │
├─────────────┬───────────────────────────────────────────────────┤
│    DOOR     │                      DOOR                          │
│  (centered) │               (offset to left)                     │
├─────────────┼───────────────────────────────────────────────────┤
│             │                                                    │
│  VESTIBULE  │                                                    │
│  CORRIDOR   │                                                    │
│   (1.2m     │                                                    │
│    wide)    │                                                    │
├─────────────┤              ROOM 5203                             │
│             │           "READING ROOM"                           │
│             │                                                    │
│  ROOM 5202  │         • Poster wall (back)                       │
│  "SPECIAL   │         • Floor seating area                       │
│   SPECIAL"  │         • Layered Persian rugs                     │
│             │         • Red book displays                        │
│  • Display  │◄─DOOR──►• Cushions & mattress                      │
│    table    │         • Coffee table                             │
│  • Books    │         • Bookshelves                              │
│  • Cushions │         • Plants                                   │
│  • Blue     │         • Pendant lights                           │
│    carpet   │                                                    │
├─────────────┼───────────────────────────────────────────────────┤
│   WINDOWS   │                    WINDOWS                         │
│  (2 panes)  │                   (3 panes)                        │
│   + column  │                  + 2 columns                       │
└─────────────┴───────────────────────────────────────────────────┘
                              (SOUTH - Exterior)
```

### Room 5202 — Special Special

| Dimension | Imperial | Metric |
|-----------|----------|--------|
| Width | 11'-5⅝" | 3.496m |
| Depth | 25'-3¾" | 7.715m |
| Area | 289.4 sq ft | 26.9 m² |
| Ceiling | 12'-0" | 3.66m |

**Architectural Features:**
- Entry vestibule/corridor with enclosed side walls (~1.2m wide, 1.5m deep)
- 2 industrial windows with 1 white fluted column between
- Door to corridor at back (centered)
- Door to Room 5203 in shared wall

**Interior Features:**
- Deep navy blue carpet (`#1a3a5c`)
- Display table with yellow cloth
- Floor cushions for listening/reading
- Bookshelf against partition wall
- Pendant lighting

### Room 5203 — Reading Room

| Dimension | Imperial | Metric |
|-----------|----------|--------|
| Width | 14'-7¾" | 4.465m |
| Depth | 25'-3¾" | 7.715m |
| Area | 369.5 sq ft | 34.3 m² |
| Ceiling | 12'-0" | 3.66m |

**Architectural Features:**
- 3 industrial windows with 2 white fluted columns
- Door to corridor at back (offset toward left/shared wall)
- Door to Room 5202 in shared wall
- Poster-covered back wall

**Interior Features:**
- Layered Persian/African rugs (burgundy, teal)
- Tufted ochre floor mattress
- Multiple floor cushions (pink, red, teal, orange, yellow, gray)
- 2 red book display stands
- Low round coffee table
- Wooden bookshelves
- Potted plants
- Multiple pendant lights

### Shared Specifications

| Element | Imperial | Metric |
|---------|----------|--------|
| Ceiling Height | 12'-0" | 3.66m |
| Door Width | 3'-5⅛" | 1.044m |
| Door Height | 7'-0" | 2.134m |
| Wall Thickness | 6" | 0.152m |
| Total Combined Area | 658.9 sq ft | 61.2 m² |

---

## 🎨 Design Language

### Color Palette

| Color | Name | Hex | RGB | Usage |
|-------|------|-----|-----|-------|
| 🔵 | Navy Blue | `#1a3a5c` | 26, 58, 92 | Carpet (5202), window fabric |
| ⬜ | Off-White | `#f8f8f5` | 248, 248, 245 | Walls |
| 🏛️ | Warm Cream | `#f0ebe5` | 240, 235, 229 | Brick-tone walls |
| 🪵 | Natural Wood | `#d4a76a` | 212, 167, 106 | Tables, shelving |
| 🟡 | Ochre Gold | `#c9a227` | 201, 162, 39 | Floor mattress |
| 🍷 | Burgundy | `#8b2942` | 139, 41, 66 | Layered rugs |
| 🔴 | Crimson Red | `#c41e3a` | 196, 30, 58 | Book display stands |
| 🩵 | Teal | `#4ecdc4` | 78, 205, 196 | Accent books, rugs |
| 💛 | Yellow | `#ffd93d` | 255, 217, 61 | Table cloth, books |
| 🩷 | Pink | `#d63384` | 214, 51, 132 | Cushions |
| 🧡 | Orange | `#fd7e14` | 253, 126, 20 | Cushions |
| 💚 | Green | `#20c997` | 32, 201, 151 | Cushions, plants |

### Window Style (MoMA PS1 Industrial)

Based on reference photography:

```
┌─────────────────────────────┐
│  ┌─────────┬─────────┐     │ ← Top frame
│  │         │         │     │
│  │  pane   │  pane   │     │ ← Upper row
│  │         │         │     │
│  ├─────────┼─────────┤     │ ← Horizontal divider
│  │         │         │     │
│  │  pane   │  pane   │     │ ← Middle row
│  │         │         │     │
│  ├─────────┼─────────┤     │ ← Horizontal divider
│  │         │         │     │
│  │  pane   │  pane   │     │ ← Lower row
│  │         │         │     │
│  └─────────┴─────────┘     │ ← Bottom frame
└─────────────────────────────┘
        ↑ Center divider

Window Dimensions:
- Width: ~1.3m (~4.25')
- Height: ~2.2m (~7.25')
- Sill height: ~0.75m (~2.5')
- Frame: White painted wood
- Glass: 6 panes (2 columns × 3 rows)
```

### Fluted Columns

White painted pilasters between windows:
- Width: ~0.25m
- Vertical fluting detail
- Classical architectural reference

---

## 🛋️ Furniture Library

### Seating

| ID | Item | Description | Dimensions | Colors |
|----|------|-------------|------------|--------|
| `cushion-round` | Round Floor Cushion | Soft round floor cushion | Ø60cm, H15cm | Orange, Teal, Pink, Yellow, Gray, Green |
| `cushion-square` | Square Cushion | Square meditation cushion | 50×50cm, H12cm | Various patterns |
| `beanbag` | Bean Bag | Large comfortable bean bag | 80×80×60cm | Orange, Ochre, Gray |
| `mattress-tufted` | Tufted Mattress | Low floor mattress with button tufting | 220×140cm, H20cm | Ochre gold |
| `sofa-low` | Low Gray Sofa | Modern low-profile gallery sofa | 180×80×60cm | Gray |

### Tables

| ID | Item | Description | Dimensions |
|----|------|-------------|------------|
| `table-display` | Display Table | Long wooden table with cloth cover | 200×80×72cm |
| `table-coffee` | Coffee Table | Round 3-legged low table | Ø80cm, H25cm |
| `table-side` | Side Table | Small round side table | Ø40cm, H45cm |
| `table-console` | Console Table | Long narrow display table | 180×40×75cm |
| `bench-wood` | Wooden Bench | Simple wooden seating bench | 150×40×45cm |

### Storage & Display

| ID | Item | Description | Dimensions |
|----|------|-------------|------------|
| `shelf-wood` | Wooden Bookshelf | Multi-tier open shelving | 120×30×160cm |
| `display-red` | Red Book Display | Angled display stand | 70×50×90cm |
| `rack-wire` | Wire Magazine Rack | Metal wire display rack | 40×30×120cm |
| `screen-folding` | Folding Screen | 3-panel wooden display screen | 180×180cm (open) |
| `lectern` | Lectern/Podium | Standing reading podium | 50×40×110cm |

### Rugs & Textiles

| ID | Item | Description | Dimensions | Patterns |
|----|------|-------------|------------|----------|
| `rug-persian-lg` | Persian Rug (Large) | Traditional layered rug | 350×250cm | Burgundy, Red, Blue |
| `rug-persian-sm` | Persian Rug (Small) | Accent rug | 220×180cm | Various |
| `rug-african` | African Textile Rug | Woven pattern rug | 200×150cm | Earth tones |
| `rug-striped` | Striped Runner | Long narrow rug | 300×80cm | Multi-stripe |
| `rug-solid` | Solid Color Rug | Simple colored rug | 250×200cm | Navy, Ochre |
| `tablecloth` | Table Cloth | Colorful table covering | 210×90cm | Yellow, Orange |

### Lighting

| ID | Item | Description |
|----|------|-------------|
| `light-pendant` | Pendant Light | Hanging cone shade with warm bulb |
| `light-floor` | Floor Lamp | Standing reading lamp (adjustable) |
| `disco-ball` | Disco Ball | Decorative mirror ball |

### Plants & Decor

| ID | Item | Description |
|----|------|-------------|
| `plant-large` | Large Potted Plant | Terracotta pot with greenery |
| `plant-small` | Small Potted Plant | Small accent plant |
| `plant-hanging` | Hanging Plant | Trailing vine plant |
| `vase-flowers` | Vase with Flowers | Decorative vase arrangement |

---

## 🖼️ Wall Art Collections

### Afrikadaa Collection

Art and publication covers from [Afrikadaa](http://www.afrikadaa.com/) magazine:

| ID | Title | Type | Size |
|----|-------|------|------|
| `afrikadaa-01` | Afrikadaa Magazine Cover #1 | Framed Print | 60×80cm |
| `afrikadaa-02` | Afrikadaa Magazine Cover #2 | Framed Print | 50×70cm |
| `afrikadaa-03` | African Contemporary Art | Poster | 40×60cm |
| `afrikadaa-04` | Diaspora Artists Feature | Print | 45×60cm |
| `afrikadaa-05` | Cultural Celebration | Poster | 50×70cm |

### Coolhunt Paris Collection

Curated prints from [Coolhunt Paris](http://coolhuntparis.com):

| ID | Title | Type | Size |
|----|-------|------|------|
| `coolhunt-01` | Fashion Photography | Framed Photo | 50×70cm |
| `coolhunt-02` | Street Art Print | Poster | 60×80cm |
| `coolhunt-03` | Design Print | Framed Print | 40×50cm |
| `coolhunt-04` | Cultural Artifacts | Photo Series | 30×40cm ×3 |
| `coolhunt-05` | Paris Scene | Photography | 50×70cm |

### Activist Art Collection

Social justice and political artwork:

| ID | Title | Type | Size |
|----|-------|------|------|
| `activist-01` | "We Want To Live Free" | Typography | 80×60cm |
| `activist-02` | "Somos Personas" | Handwritten | 100×70cm |
| `activist-03` | Gender Liberation | Collage | 60×80cm |
| `activist-04` | Resistance Imagery | Mixed Media | 70×90cm |
| `activist-05` | Black Lives Matter | Print | 50×70cm |
| `activist-06` | Decolonize | Typography | 60×40cm |

### Fabric Banners

| ID | Title | Color | Size |
|----|-------|-------|------|
| `banner-blue-01` | Window Text Banner | Navy Blue | 40×200cm |
| `banner-blue-02` | Calligraphy Banner | Navy Blue | 30×180cm |

### Poster Collage Elements

For creating the signature poster wall:

| Category | Count | Sizes |
|----------|-------|-------|
| Small posters | 20 | 15-30cm |
| Medium posters | 15 | 30-50cm |
| Large posters | 10 | 50-80cm |
| Mixed colors | 60+ | Various |

---

## 🎮 User Controls

### Navigation Controls

| Control | Action |
|---------|--------|
| **Mouse Drag** | Rotate camera around target |
| **Scroll Wheel** | Zoom in/out |
| **W / ↑** | Move camera forward |
| **S / ↓** | Move camera backward |
| **A / ←** | Move camera left |
| **D / →** | Move camera right |

### Touch Controls (Mobile)

| Gesture | Action |
|---------|--------|
| **Single finger drag** | Rotate view |
| **Pinch** | Zoom in/out |
| **Two finger drag** | Pan view |

### View Presets

| Button | View | Description |
|--------|------|-------------|
| 🏠 Bird's Eye | Overview | Both rooms from elevated angle |
| 📐 Floor Plan | Top-down | Architectural plan view |
| 🚪 Entry Vestibule | Room 5202 | Entry corridor perspective |
| 🔊 Inside View | Room 5202 | Interior from entry looking at windows |
| 🪟 Window Wall | Room 5202 | Focus on window wall |
| 📚 Display Table | Room 5202 | Focus on central table |
| 🚪 Entry | Room 5203 | Entry from corridor door |
| 📖 Inside View | Room 5203 | Interior overview |
| 🪟 Windows | Room 5203 | Arched windows view |
| 🛋️ Seating Area | Room 5203 | Floor seating focus |
| 📚 Book Displays | Room 5203 | Red display stands |
| 🎬 Auto Tour | Animated | Guided tour through all views |

### Toggle Options

| Button | Default | Function |
|--------|---------|----------|
| **Grid** | ON | Show/hide floor grid |
| **Labels** | ON | Show/hide room labels |
| **Ceiling** | ON | Show/hide ceiling (auto-hides from above) |
| **Hide Near Wall** | OFF | Hide wall nearest to camera |
| **Wireframe** | OFF | Toggle wireframe rendering |

### Action Buttons

| Button | Function |
|--------|----------|
| **📷 Capture** | Download PNG screenshot |
| **🎨 Mood Board** | Open design reference modal |
| **🛋️ Decorator** | Open furniture placement mode |

---

## 🎨 Decorator Mode

### Overview

Decorator mode allows Pascale and Nalini to customize the room layout by placing, moving, and removing furniture and artwork.

### How to Use

1. Click **🛋️ Decorator** button to enter decorator mode
2. Select category from sidebar (Seating, Tables, Storage, etc.)
3. Click item thumbnail to select
4. Click in the room to place item
5. Click placed item to select for editing
6. Use controls to move, rotate, or delete
7. Click **Save Layout** to preserve changes
8. Click **Exit** to return to view mode

### Decorator Controls

| Control | Action |
|---------|--------|
| **Click item in library** | Select for placement |
| **Click in room** | Place selected item |
| **Click placed item** | Select for editing |
| **Arrow keys** | Move selected item |
| **R** | Rotate 15° clockwise |
| **Shift+R** | Rotate 15° counter-clockwise |
| **Delete/Backspace** | Remove selected item |
| **Escape** | Deselect |

### Layout Management

| Action | Description |
|--------|-------------|
| **Save Layout** | Store current arrangement to browser |
| **Load Layout** | Restore saved arrangement |
| **Reset Layout** | Return to default furniture |
| **Export JSON** | Download layout as JSON file |
| **Import JSON** | Load layout from JSON file |

### Placement Guidelines

- Items snap to floor level automatically
- Collision detection prevents overlapping
- Grid snap available (toggle with G key)
- Room boundaries enforced

---

## 🖥️ Technical Implementation

### Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Three.js | r128 | WebGL 3D rendering |
| JavaScript | ES6+ | Application logic |
| HTML5 | - | Structure & semantics |
| CSS3 | - | Styling & responsive layout |

### Browser Support

| Browser | Minimum Version |
|---------|-----------------|
| Chrome | 80+ |
| Firefox | 75+ |
| Safari | 13+ |
| Edge | 80+ |
| Mobile Safari | iOS 13+ |
| Chrome Android | 80+ |

### Performance

| Metric | Target |
|--------|--------|
| Initial load | < 3 seconds |
| Frame rate | 60 FPS |
| Memory usage | < 200MB |
| Mobile frame rate | 30+ FPS |

### File Structure

```
panafrican-library-3d/
├── index.html              # Main application (single-file)
├── README.md               # This documentation
└── docs/
    ├── FLOOR_PLAN_NOTES.md     # Detailed floor plan analysis
    ├── DESIGN_DIRECTION.md     # Design reference notes
    └── PROJECT_BRIEF.md        # Project scope & credits
```

### 3D Coordinate System

```
        +Y (up/ceiling)
         │
         │    (camera looks down -Y for floor plan view)
         │
         └───────── +X (right/east → Room 5203)
        /
       /
      +Z (front/south → windows/exterior)

Positions:
- Room 5202: -X side (left/west)
- Room 5203: +X side (right/east)
- Doors to corridor: -Z (back/north)
- Windows: +Z (front/south)
- Floor: Y = 0
- Ceiling: Y = 3.66m
```

### Key Code Constants

```javascript
// Room dimensions (meters)
const ROOM_5202_WIDTH = 3.496;   // 11'-5⅝"
const ROOM_5202_DEPTH = 7.715;   // 25'-3¾"
const ROOM_5203_WIDTH = 4.465;   // 14'-7¾"
const ROOM_5203_DEPTH = 7.715;   // 25'-3¾"
const CEILING_HEIGHT = 3.66;     // 12'-0"
const WALL_THICKNESS = 0.152;    // 6"
const DOOR_WIDTH = 1.044;        // 3'-5⅛"
const DOOR_HEIGHT = 2.134;       // 7'-0"
const VESTIBULE_DEPTH = 1.5;     // ~5' corridor

// Window dimensions (PS1 style)
const PS1_WINDOW_WIDTH = 1.3;    // ~4.25'
const PS1_WINDOW_HEIGHT = 2.2;   // ~7.25'
const PS1_WINDOW_SILL = 0.75;    // ~2.5'
const PS1_COLUMN_WIDTH = 0.25;   // Fluted columns
```

---

## 🚀 Deployment

### Current Deployment

- **Platform:** Vercel
- **URL:** [panafrican-library-3d.vercel.app](https://panafrican-library-3d.vercel.app)
- **Auto-deploy:** Connected to GitHub main branch

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Other Platforms

The application is a single HTML file with no build process:

1. Download `index.html`
2. Upload to any static hosting (Netlify, GitHub Pages, S3, etc.)
3. No configuration required

### Local Development

```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000

# Then open http://localhost:8000
```

---

## 📁 Reference Materials

### Floor Plan

| File | Description |
|------|-------------|
| `PLAN ROOM 202+203-2026_RR.png` | Official architectural floor plan |

### Photography References

| Folder | Contents |
|--------|----------|
| `/Photos reading room NY/` | MoMA PS1 installation photos |
| `/photos refs reading room/Style mobilier/` | Furniture inspiration |
| `/photos refs reading room/ambiance/` | Atmosphere references |
| `/photos refs reading room/inspiration afrique/` | African library inspiration |
| `/photos refs reading room/bibliotheque/` | Library references |

### Key Reference Images

| Image | Shows |
|-------|-------|
| `Copy of BFA_51041_7356937.jpg` | Window wall with display table |
| `Copy of DSC06684.jpg` | Interior with people, poster wall |
| `Copy of DSC07081.JPG` | Poster wall close-up |
| `Copy of NYABF_9.14.25_CindyTrinh_086.jpg` | Full room with seating |
| `Copy of NYABF_9.14.25_CindyTrinh_088.jpg` | Folding screen and furniture |

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | Jan 2026 | Initial 3D simulation with basic room geometry |
| 1.1.0 | Jan 2026 | Fixed vestibule corridor walls, added side walls |
| 1.2.0 | Jan 2026 | Updated to PS1-style industrial windows with fluted columns |
| 1.3.0 | Jan 2026 | Added mood board modal with design references |
| 1.4.0 | Jan 2026 | Added decorator mode with furniture library |
| 1.5.0 | Jan 2026 | Mobile responsive improvements |
| 1.6.0 | Jan 2026 | Added wall art collections from Afrikadaa and Coolhunt Paris |

---

## 🐛 Known Issues

| Issue | Status | Workaround |
|-------|--------|------------|
| Ceiling flickers at certain angles | Low priority | Toggle ceiling off |
| Touch zoom sensitivity on iOS | Investigating | Use preset views |

---

## 🗺️ Roadmap

| Feature | Priority | Status |
|---------|----------|--------|
| VR support (WebXR) | Medium | Planned |
| Collaborative editing | Low | Considering |
| Audio integration | Medium | Planned |
| Print layout export | Low | Considering |

---

## 📝 License

This project is created for **The Panafrican Library Will Not Be Colonized** exhibition at MoMA PS1.

© 2026 Afrikadaa / Coolhunt Paris / Luvlab

All rights reserved. This simulation is provided for exhibition documentation and curatorial planning purposes.

---

## 🙏 Acknowledgments

- **MoMA PS1** — Host venue
- **New York Art Book Fair** — Exhibition context
- **Three.js Community** — 3D rendering library
- **Vercel** — Hosting platform

---

## 📧 Contact

For inquiries about the Reading Room or this 3D simulation:

| Organization | Contact |
|--------------|---------|
| **Afrikadaa** | [afrikadaa.com](http://www.afrikadaa.com/) |
| **Coolhunt Paris** | [coolhuntparis.com](http://coolhuntparis.com) |
| **Luvlab** | [luvlab.io](http://luvlab.io) • info@luvlab.io |

---

*Last updated: January 2026*
