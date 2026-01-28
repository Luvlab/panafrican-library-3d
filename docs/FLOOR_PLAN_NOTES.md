# Floor Plan Analysis - DETAILED

## Source Document
- **File:** `PLAN ROOM 202+203-2026_RR.png`
- **Location:** MoMA PS1, New York
- **Room Names:** S202 (Special Special) and S203 (Reading Room)

---

## ORIENTATION (Critical!)

```
                    NORTH
                      ↑
    ┌─────────────────────────────────────────┐
    │              STUDIO (Corridor)           │
    │         ══════════════════════          │
    │              DOORS HERE                  │
    ├─────────────────┬───────────────────────┤
    │                 │                        │
    │   Room S202     │     Room S203          │
    │ "Special Special"│   "Reading Room"       │
    │                 │                        │
    │  [Vestibule     │                        │
    │   corridor]     │                        │
    │       ↓         │                        │
    │  [Main Room]    █   SOLID WALL           │
    │                 █   (no door/passage)    │
    │   [WINDOWS]     │     [ARCHED WINDOWS]   │
    ├─────────────────┴───────────────────────┤
    │              EXTERIOR WALL               │
    │         ══════════════════════          │
    │            WINDOWS HERE                  │
    └─────────────────────────────────────────┘
                      ↓
                    SOUTH

```

## Key Layout Rules (FROM THE PLAN)

1. **DOORS are on the NORTH wall** (facing STUDIO corridor)
2. **WINDOWS are on the SOUTH wall** (exterior, opposite doors)
3. **Room S202 is on the WEST (left)**
4. **Room S203 is on the EAST (right)**
5. **SOLID WALL between rooms - NO door, NO passage, NO connection**

---

## Room S202 - "Special Special" (LEFT/WEST)

### Entry Sequence (from STUDIO corridor)
1. Enter through door on NORTH wall
2. Walk through narrow vestibule/corridor (interior partition walls on both sides)
3. Enter main room space
4. Windows are on the FAR wall (SOUTH)

### Walls
| Wall | Direction | Features |
|------|-----------|----------|
| NORTH (Back) | -Z in 3D | Door to STUDIO corridor |
| SOUTH (Front) | +Z in 3D | Windows (rectangular) - EXTERIOR |
| WEST (Left) | -X in 3D | Door to "Three Star" room (near south/window end) |
| EAST (Right) | +X in 3D | **SOLID WALL** shared with S203 (NO door/passage) |

### Interior Features
- **Vestibule**: Created by two interior partition walls extending from NORTH wall into room
- **Corridor width**: ~4 feet (1.2m)
- **Partition depth**: ~5 feet (1.5m) into room

### Dimensions (from plan)
- Width (E-W): 11'-5⅝" (3.496m)
- Depth (N-S): 25'-3¾" (7.715m)
- Area: 289.4 sq ft (26.9 m²)

---

## Room S203 - "Reading Room" (RIGHT/EAST)

### Entry
- Direct entry from STUDIO corridor through door on NORTH wall
- No vestibule - open floor plan

### Walls
| Wall | Direction | Features |
|------|-----------|----------|
| NORTH (Back) | -Z in 3D | Door to STUDIO corridor |
| SOUTH (Front) | +Z in 3D | Arched windows with blue fabric frames - EXTERIOR |
| WEST (Left) | -X in 3D | **SOLID WALL** shared with S202 (NO door/passage) |
| EAST (Right) | +X in 3D | Solid wall (exterior) |

### Dimensions (from plan)
- Width (E-W): 14'-7¾" (4.465m)
- Depth (N-S): 25'-3¾" (7.715m)
- Area: 369.5 sq ft (34.3 m²)

---

## 3D Coordinate Mapping

In Three.js:
- **X axis**: East-West (positive = East/Right)
- **Y axis**: Up-Down (positive = Up)
- **Z axis**: North-South (positive = South/toward windows)

| Real Direction | 3D Direction | 3D Coordinate |
|----------------|--------------|---------------|
| North (Corridor/Doors) | Back | -Z |
| South (Windows/Exterior) | Front | +Z |
| West (Room S202) | Left | -X |
| East (Room S203) | Right | +X |

---

## View Entry Points

When entering the rooms, the user should:
1. **Start at the door** (NORTH side, -Z)
2. **Look toward the windows** (SOUTH side, +Z)
3. **Walk forward into the room**

This means camera views should start from -Z looking toward +Z.

---

## Common Mistakes to Avoid

1. ❌ Putting windows on the same wall as doors
2. ❌ Reversing North/South orientation
3. ❌ Forgetting the vestibule in Room S202
4. ❌ Making views look away from windows when entering
5. ❌ **Adding a door or passage between S202 and S203 - THERE IS NONE!**

## Correct Implementation

1. ✅ Doors on NORTH wall (-Z in 3D)
2. ✅ Windows on SOUTH wall (+Z in 3D)
3. ✅ Entry views start at door, looking toward windows
4. ✅ Room S202 has interior partition walls creating vestibule
5. ✅ **SOLID WALL between S202 and S203 - no door, no passage, no connection**
6. ✅ Room names are S202 and S203 (not 5202/5203)
