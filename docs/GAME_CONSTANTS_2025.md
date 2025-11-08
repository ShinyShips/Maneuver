# Game Constants Documentation

## Overview
Created `src/lib/gameConstants2025.ts` to document the official 2025 FIRST Reefscape scoring values. This serves as the single source of truth for game scoring in the application.

## File Contents

### Scoring Constants

**Auto Period:**
- Coral L1-L4: 3, 4, 6, 7 points
- Algae (Net/Processor): 4, 2 points
- Mobility: 3 points

**Teleop Period:**
- Coral L1-L4: 2, 3, 4, 5 points
- Algae (Net/Processor): 4, 2 points

**Endgame:**
- Park: 2 points
- Shallow Climb: 6 points
- Deep Climb: 12 points

**Penalties:**
- Foul: 3 points (to opponent)
- Tech Foul: 8 points (to opponent)

### Helper Functions

The file provides calculation helpers:
- `calculateAutoCoralPoints()` - Calculate points from level-specific counts
- `calculateTeleopCoralPoints()` - Calculate teleop coral points
- `calculateAlgaePoints()` - Calculate algae points (auto or teleop)
- `calculateEndgamePoints()` - Calculate endgame points
- `calculateMatchPoints()` - Calculate total match points

### Type Exports

Type-safe constants for:
- `CoralLevel` - 'L1' | 'L2' | 'L3' | 'L4'
- `AlgaeLocation` - 'NET' | 'PROCESSOR'
- `EndgameAction` - 'PARK' | 'SHALLOW_CLIMB' | 'DEEP_CLIMB'

## Usage Examples

### Calculate Coral Points
```typescript
import { calculateAutoCoralPoints } from '@/lib/gameConstants2025';

const points = calculateAutoCoralPoints(2, 3, 1, 0); // 2×L1, 3×L2, 1×L3, 0×L4
// Result: (2×3) + (3×4) + (1×6) + (0×7) = 6 + 12 + 6 + 0 = 24 points
```

### Calculate Full Match
```typescript
import { calculateMatchPoints } from '@/lib/gameConstants2025';

const totalPoints = calculateMatchPoints({
  autoCoralL1: 2, autoCoralL2: 1, autoCoralL3: 0, autoCoralL4: 1,
  autoAlgaeNet: 3, autoAlgaeProcessor: 2,
  autoMobility: 3,
  teleopCoralL1: 5, teleopCoralL2: 4, teleopCoralL3: 2, teleopCoralL4: 1,
  teleopAlgaeNet: 8, teleopAlgaeProcessor: 4,
  parks: 0, shallowClimbs: 1, deepClimbs: 2
});
```

## Relationship to Match Validation

### Why Validation Uses TBA's Per-Piece Calculation

The match validation system (`matchValidationUtils.ts`) doesn't use these constants directly because:

1. **Aggregation Issue:** Scouted data is aggregated by total pieces, not level-by-level
   - We know: "10 auto coral pieces total"
   - We don't know: "2×L1, 3×L2, 4×L3, 1×L4"

2. **TBA Has Details:** TBA provides both level counts AND calculated points
   - TBA: "10 pieces scored for 54 points"
   - Per-piece value: 54 / 10 = 5.4 points/piece

3. **Accuracy Trade-off:** 
   - Using fixed values would require assuming a level distribution
   - Using TBA's per-piece adapts to each match's actual distribution
   - More accurate given our aggregated data structure

### Example Comparison

**Scenario: TBA scored mostly high-level coral**
- TBA: 1×L1 (3pt) + 1×L2 (4pt) + 2×L3 (6pt) + 6×L4 (7pt) = 61 points / 10 pieces = **6.1 pts/piece**
- Scouted: 12 pieces counted
- Estimated: 12 × 6.1 = **73 points**

**If we used a fixed average (e.g., 5 pts/piece):**
- Estimated: 12 × 5 = **60 points**
- Error: Would underestimate by 13 points!

**Using TBA's per-piece is more accurate for that match's specific scoring pattern.**

## Future Enhancements

To achieve perfect scoring accuracy:

1. **Phase 1 Enhancement:** Track level-by-level in aggregation
   ```typescript
   interface AllianceData {
     autoCoralL1: number; // Instead of just autoCoralTotal
     autoCoralL2: number;
     autoCoralL3: number;
     autoCoralL4: number;
     // ...
   }
   ```

2. **Phase 3 Enhancement:** Use `gameConstants2025.ts` directly
   ```typescript
   import { calculateAutoCoralPoints } from '@/lib/gameConstants2025';
   
   const scoutedPoints = calculateAutoCoralPoints(
     scoutedData.autoCoralL1,
     scoutedData.autoCoralL2,
     scoutedData.autoCoralL3,
     scoutedData.autoCoralL4
   );
   ```

3. **Benefits:**
   - Exact score calculation
   - No level distribution assumptions
   - Better discrepancy identification

4. **Trade-offs:**
   - Requires changes to Phase 1 aggregation
   - More complex data structures
   - Backward compatibility concerns

## Related Files

- `src/lib/gameConstants2025.ts` - Official scoring constants (NEW)
- `src/lib/matchValidationUtils.ts` - Validation logic using per-piece calculation
- `src/hooks/useTeamStatistics.ts` - Team stats using these exact values
- `docs/SCORE_CALCULATION_FIX.md` - Explanation of the scoring approach

## Maintenance

When game rules change:
1. Update constants in `gameConstants2025.ts`
2. Update helper functions if needed
3. No changes needed to validation logic (uses TBA's values automatically)
4. Team statistics calculations will use updated values

For future FRC seasons:
1. Create `gameConstants2026.ts` with new game values
2. Switch imports in relevant files
3. Archive previous season's constants
