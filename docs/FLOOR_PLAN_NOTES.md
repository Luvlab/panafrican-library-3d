# Floor Plan Analysis - DETAILED

## Source Document
- **File:** `PLAN ROOM 202+203-2026_RR.png`
- **Location:** MoMA PS1, New York
- **Room Designation:** Both rooms are **S202** on the floor plan
- **Sub-spaces:** S202 Three Stars (PANAFRICAN LIBRARY) and S202 Special Special (SOUND LIBRARY)
- **Connection:** Connecting door in the shared wall between the two sub-spaces

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
    │   S202 WEST     │     S202 EAST          │
    │ "Panafrican     │   "SOUND LIBRARY"      │
    │  Library"       │                        │
    │                 │                        │
    │  [Vestibule     │                        │
    │   corridor]     │                        │
    │       ↓         │                        │
    │  [Main Room]    ◄──CONNECTING DOOR──►    │
    │                 │                        │
    │   [WINDOWS]     │     [WINDOWS]          │
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
3. **S202 Three Stars (PANAFRICAN LIBRARY) is on the WEST (left)**
4. **S202 Special Special (SOUND LIBRARY) is on the EAST (right)**
5. **CONNECTING DOOR in shared wall** between the two sub-spaces (near south/window end)

---

## S202 Three Stars - "PANAFRICAN LIBRARY" (LEFT/WEST)

### Entry Sequence (from STUDIO corridor)
1. Enter through door on NORTH wall (offset toward exterior/east side)
2. Walk through narrow vestibule/corridor (interior partition walls on both sides)
3. Enter main room space
4. Windows are on the FAR wall (SOUTH)

### Walls
| Wall | Direction | Features |
|------|-----------|----------|
| NORTH (Back) | +Z in 3D | Door to STUDIO corridor |
| SOUTH (Front) | -Z in 3D | PS1 Industrial Windows (2 windows, 1 column) - EXTERIOR |
| WEST (Left) | -X in 3D | Shared wall with S202 Special Special — **CONNECTING DOOR** (near south end) |
| EAST (Right) | +X in 3D | Solid exterior wall |

### Interior Features
- **Vestibule**: Created by two interior partition walls extending from NORTH wall into room
- **Corridor width**: ~2'-9⅝" (0.85m)
- **Partition depth**: ~5' (1.5m) into room

### Dimensions (from plan)
- Width (E-W): 14'-3 13/16" (4.36m)
- Depth (N-S): 25'-3¾" (7.715m)
- Ceiling Height: 12' (3.66m)

---

## S202 Special Special - "SOUND LIBRARY" (RIGHT/EAST)

### Entry
- Entry corridor at NORTH-CENTER with thick partition shafts
- Corridor opening: 2'-9⅝" (0.85m) wide

### Walls
| Wall | Direction | Features |
|------|-----------|----------|
| NORTH (Back) | +Z in 3D | Entry corridor from STUDIO |
| SOUTH (Front) | -Z in 3D | PS1 Industrial Windows (2 windows, 1 column) - EXTERIOR |
| WEST (Left) | -X in 3D | Solid exterior wall |
| EAST (Right) | +X in 3D | Shared wall with S202 Three Stars (wall built by west room, with connecting door) |

### Dimensions (from plan)
- Width (E-W): 11'-5⅝" (3.496m)
- Depth (N-S): 25'-3¾" (7.715m)
- Ceiling Height: 12' (3.66m)

---

## Connecting Door

The shared wall between the two S202 sub-spaces has a connecting door:
- **Position**: Near the south (window) end of the shared wall
- **Distance from south facade**: 4'-5 15/16" (1.37m) from south wall to door edge
- **Door width**: 3'-5⅛" (1.044m)
- **Door height**: 7'-0" (2.134m)

---

## 3D Coordinate Mapping

In Three.js:
- **X axis**: East-West (positive = East/Right)
- **Y axis**: Up-Down (positive = Up)
- **Z axis**: North-South (positive = North/toward STUDIO corridor)

| Real Direction | 3D Direction | 3D Coordinate |
|----------------|--------------|---------------|
| North (Corridor/Doors) | Back | +Z |
| South (Windows/Exterior) | Front | -Z |
| West (S202 Three Stars / PANAFRICAN LIBRARY) | Left | +X (in floor plan view) |
| East (S202 Special Special / SOUND LIBRARY) | Right | -X (in floor plan view) |

---

## View Entry Points

When entering the rooms, the user should:
1. **Start at the door** (NORTH side, +Z)
2. **Look toward the windows** (SOUTH side, -Z)
3. **Walk forward into the room**

This means camera views should start from +Z looking toward -Z.

---

## Common Mistakes to Avoid

1. ❌ Putting windows on the same wall as doors
2. ❌ Reversing North/South orientation
3. ❌ Forgetting the vestibule in S202 Special Special
4. ❌ Making views look away from windows when entering
5. ❌ Using different room numbers (both rooms are S202)
6. ❌ Forgetting the connecting door between the two sub-spaces

## Correct Implementation

1. ✅ Doors on NORTH wall (+Z in 3D)
2. ✅ Windows on SOUTH wall (-Z in 3D)
3. ✅ Entry views start at door, looking toward windows
4. ✅ S202 Special Special has interior partition walls creating entry corridor
5. ✅ **CONNECTING DOOR in shared wall between S202 Three Stars and S202 Special Special**
6. ✅ Both rooms labeled as S202
7. ✅ Both rooms same depth: 25'-3¾" (7.715m)
