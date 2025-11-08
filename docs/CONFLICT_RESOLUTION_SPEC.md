# Data Transfer Conflict Resolution Specification

## Overview
When importing scouting data via QR codes or JSON transfers, we need to detect and handle conflicts between incoming data and existing local data, particularly when local data has been corrected via the re-scout workflow.

## Conflict Scenarios

### Scenario 1: Fresh Import (No Conflict)
**Situation:** Importing data for a match/team/alliance that doesn't exist locally
**Action:** Import directly, no dialog needed
**Example:** Importing Match 5, Team 254, Red alliance when local DB has no data for this combination

### Scenario 2: Duplicate - Same Data
**Situation:** Importing data that matches existing data exactly (same scores, same metadata)
**Action:** Skip silently, no dialog needed
**Example:** Re-scanning the same QR code twice

### Scenario 3: Duplicate - Different Uncorrected Data
**Situation:** Importing data for match/team/alliance that exists locally, but neither version is marked as corrected
**Action:** **Replace automatically** (incoming data is newer/more recent transfer)
**Example:** 
- Local: Match 1, Team 316, Blue - scouted by Scout A
- Import: Match 1, Team 316, Blue - scouted by Scout B on different tablet
- Result: Replace with imported data (assume it's more recent)

### Scenario 4: Duplicate - Incoming Corrected, Local Uncorrected
**Situation:** Importing corrected data when local data is not corrected
**Action:** **Replace automatically** (corrected data takes priority)
**Example:**
- Local: Match 1, Team 316, Blue - regular scout
- Import: Match 1, Team 316, Blue - marked as corrected (isCorrected: true)
- Result: Replace with imported corrected data

### Scenario 5: Duplicate - Local Corrected, Incoming Uncorrected ⚠️ CONFLICT
**Situation:** Importing regular scouting data when local data has been corrected via re-scout
**Action:** **Show conflict dialog** with options:
- **Replace:** Overwrite local corrected data with incoming data (lose correction)
- **Skip:** Keep local corrected data, discard incoming data
**Example:**
- Local: Match 1, Team 316, Blue - **CORRECTED** by Scout Lead (isCorrected: true)
- Import: Match 1, Team 316, Blue - regular scout from another tablet
- Result: Show dialog, let user decide
**Default/Recommended:** Skip (protect corrections)

### Scenario 6: Duplicate - Both Corrected ⚠️ CONFLICT
**Situation:** Importing corrected data when local data is also corrected
**Action:** **Show conflict dialog** with comparison:
- Show correction timestamps, scout names, notes from both versions
- **Replace:** Use incoming corrected data
- **Skip:** Keep local corrected data
**Example:**
- Local: Match 1, Team 316, Blue - corrected by Scout Lead A at 2:30 PM
- Import: Match 1, Team 316, Blue - corrected by Scout Lead B at 2:45 PM
- Result: Show dialog with full comparison
**Default/Recommended:** Keep newer timestamp (or let user decide)

## Decision Matrix

| Local State | Incoming State | Action |
|------------|---------------|---------|
| None | Any | Import |
| Uncorrected | Uncorrected | Replace |
| Uncorrected | Corrected | Replace |
| Corrected | Uncorrected | **CONFLICT** - Show Dialog |
| Corrected | Corrected | **CONFLICT** - Show Dialog |

## User Behavior Goals

### Goal 1: Seamless Regular Transfers
**Use Case:** Scouts are collecting data on multiple tablets, periodically transferring to lead tablet
**Expectation:** Data flows smoothly without interruptions
**Implementation:** Scenarios 1-4 handle automatically (no dialogs)

### Goal 2: Protect Corrected Data
**Use Case:** Scout lead corrected bad data, then receives old/incorrect data from another scout
**Expectation:** System warns before overwriting corrections
**Implementation:** Scenario 5 shows conflict dialog

### Goal 3: Enable Re-Scout Overwriting
**Use Case:** Scout B re-scouts a match on their tablet, transfers to lead tablet (which already has data from Scout A)
**Expectation:** Scout B's new data replaces Scout A's old data
**Implementation:** 
- If Scout B's data is NOT marked as corrected, it's just Scenario 3 (replace automatically)
- This is the "just scouting a match on another tablet and then transfer it over it should overwrite" behavior you want

### Goal 4: Handle Correction Conflicts
**Use Case:** Two scout leads both corrected the same match independently
**Expectation:** System shows both versions, user picks the right one
**Implementation:** Scenario 6 shows comparison dialog

## Technical Implementation

### Phase 1: Conflict Detection
```typescript
interface ConflictInfo {
  matchNumber: string;
  teamNumber: string;
  alliance: string;
  eventName: string;
  
  localEntry: ScoutingEntryDB;
  incomingEntry: ScoutingDataWithId;
  
  conflictType: 'corrected-vs-uncorrected' | 'corrected-vs-corrected';
}

function detectConflicts(
  incomingData: ScoutingDataWithId[],
  localData: ScoutingEntryDB[]
): {
  autoReplace: ScoutingDataWithId[],
  autoImport: ScoutingDataWithId[],
  conflicts: ConflictInfo[]
}
```

### Phase 2: Conflict Resolution Dialog
- Show one conflict at a time
- Display side-by-side comparison:
  - Scout name, timestamp, correction info
  - Key score differences (if any)
- Two buttons: **Replace** (use incoming) or **Skip** (keep local)
- Handle batch imports (pause on conflict, resume after resolution)

### Phase 3: Apply Resolutions
- Replace: Delete local, import incoming
- Skip: Do nothing, continue to next import

## Questions to Resolve

### 1. **Batch Conflicts: Import Order** ✅ DECIDED
**Decision:** Import all non-conflicting entries first, then show conflicts one at a time

**Rationale:**
- User gets bulk of data imported quickly
- Can review conflicts without blocking the import process
- Clear separation between "automated" and "manual" decisions

### 2. **Correction Metadata Preservation: Source vs Destination**

When importing data with correction metadata, we have two approaches:

#### Option A: Always Preserve Source Metadata (Recommended)
**How it works:**
- Incoming data has `isCorrected: true, lastCorrectedBy: "Scout B"`
- If user chooses "Replace", we save with those exact fields
- Local correction history is lost, replaced by incoming metadata

**Pros:**
- Simple and predictable
- Maintains data integrity from source
- Clear audit trail of who did the correction
- Matches mental model: "Replace means use their data completely"

**Cons:**
- Loses local correction history
- If local was corrected by Scout Lead A, then imported data corrected by Scout B replaces it, we lose A's work record

**Example:**
```
Local:  isCorrected: true, lastCorrectedBy: "Lead A", lastCorrectedAt: 2:30 PM
Import: isCorrected: true, lastCorrectedBy: "Lead B", lastCorrectedAt: 2:45 PM
User chooses "Replace" → Result: Uses Lead B's metadata (2:45 PM)
```

#### Option B: Merge/Increment Metadata
**How it works:**
- Incoming data has `isCorrected: true, correctionCount: 1`
- Local data has `isCorrected: true, correctionCount: 1`
- If user chooses "Replace", we increment: `correctionCount: 2`
- Store both correction timestamps/scouts somehow

**Pros:**
- Preserves full correction history
- Can track "this entry was corrected twice"
- Better audit trail

**Cons:**
- Complex logic: need to store array of corrections
- Confusing: "correctionCount: 2" but user only did one correction
- Doesn't match data transfer model (we're replacing, not merging)
- Requires schema changes (correction history array)

#### Option C: Hybrid - Preserve Source, Track Local
**How it works:**
- Use incoming metadata (Scout B, 2:45 PM)
- Add new field: `previousCorrectionBy` with local data
- Single "previous" snapshot, not full history

**Pros:**
- Simple: just one extra field
- Preserves one level of history
- Shows "this replaced a correction by X"

**Cons:**
- Still somewhat complex
- Only tracks one previous correction
- What if there are multiple transfers?

**Recommendation:** **Option A** - Always preserve source metadata
- Cleanest implementation
- Matches "Replace" semantics
- If full history is needed, implement proper correction history array later (separate feature)

### 3. **Auto-Replace Notification** ✅ DECIDED
**Decision:** Show summary toast after import completes

**Format:** "Imported 45 new entries, Replaced 5 existing"
- If conflicts exist: "3 conflicts to review" → then show conflict dialogs
- Simple, non-intrusive
- User can see it worked without detailed logs

### 4. **Timestamp Comparison for Corrected Conflicts** ✅ DECIDED
**Decision:** Always show dialog, but highlight which correction is newer

**Implementation:**
- Dialog shows both corrections side-by-side
- Newer correction has visual indicator (badge, highlight, or "NEWER" label)
- User makes final decision
- Recommended action: Usually keep newer, but user can override

**Rationale:**
- Safety first - don't auto-replace corrections
- Newer isn't always better (could be wrong correction)
- User context matters (they know which scout is more reliable)

## Implementation Summary

### Confirmed Decisions
1. ✅ **Import Order:** Non-conflicting first, then conflicts
2. ✅ **Metadata Handling:** Option A - Always preserve source metadata (clean and simple)
3. ✅ **Notifications:** Toast summary after import
4. ✅ **Conflict Display:** Show dialog with newer correction highlighted

### Next Steps

1. Implement `detectConflicts()` function in scoutingDataUtils.ts
2. Build ConflictResolutionDialog component with side-by-side comparison
3. Update CombinedDataFountainScanner import flow:
   - Separate auto-import/replace from conflicts
   - Show toast for auto-processed entries
   - Show dialog for each conflict
4. Update JSON import flow with same logic
5. Add conflict resolution to import summary/statistics

### Dialog UI Mockup
```
┌─────────────────────────────────────────┐
│  Data Conflict Detected                 │
├─────────────────────────────────────────┤
│  Match 1 • Team 316 • Blue Alliance     │
│                                         │
│  ┌────────────┬─────────────┐          │
│  │ LOCAL (Current)  │ IMPORT (New) │   │
│  ├────────────┼─────────────┤          │
│  │ Scout: Lead A    │ Scout: Lead B│   │
│  │ Time: 2:30 PM    │ Time: 2:45 PM│   │
│  │ ✓ CORRECTED      │ ✓ CORRECTED  │   │
│  │ Notes: "Fixed    │ Notes: "Re-  │   │
│  │  missed L4"      │  scouted"    │   │
│  │                  │ [NEWER] 🟢   │   │
│  └────────────┴─────────────┘          │
│                                         │
│  [Skip - Keep Local]  [Replace] →      │
└─────────────────────────────────────────┘
```
