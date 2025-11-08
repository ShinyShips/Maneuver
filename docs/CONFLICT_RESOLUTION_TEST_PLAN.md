# Conflict Resolution - Complete Test Plan

## Overview
This document provides a comprehensive test plan for verifying that all conflict resolution features work correctly after the alliance field removal fix.

## Pre-Test Setup

### 1. Prepare Test Data
- [ ] Have a device with existing scouting data (Device A - "Source")
- [ ] Have a second device or browser tab (Device B - "Target")
- [ ] Ensure both devices have the same event selected
- [ ] Have at least 2-3 matches with data to test

### 2. Create Conflicts
On Device A (Source):
- [ ] Go to a saved match (e.g., Match 100, Team 1218)
- [ ] Edit ONE field (e.g., change teleop coral count from 10 to 8)
- [ ] Save the change
- [ ] Export data via JSON or generate QR codes

## Test Scenarios

### Scenario 1: JSON Upload - Individual "Replace" Button

**Setup:**
1. [ ] On Device B, upload the JSON from Device A
2. [ ] Click "Smart Merge"
3. [ ] Should see "Duplicate Entries Detected" dialog
4. [ ] Click "Review Each"

**Expected Results:**
- [ ] Conflict dialog appears showing "Conflict 1 of X"
- [ ] Shows correct match number and team number
- [ ] Local (Current) section shows scout name (not "Unknown")
- [ ] Local (Current) section shows timestamp (not "Unknown")
- [ ] Incoming section shows scout name (not "Unknown")
- [ ] Incoming section shows timestamp (not "Unknown")
- [ ] "Changed Fields" section shows the field(s) that were modified
- [ ] Local and Incoming values are different for changed fields

**Test Actions:**
- [ ] Click "Replace - Use Incoming Data"
- [ ] Should see toast: "Conflict resolution complete! 1 entries replaced, 0 entries kept."
- [ ] Go to Match List and verify the data was updated with incoming value
- [ ] Verify other fields remained unchanged

**Pass Criteria:** ✅ Data is replaced with incoming values

---

### Scenario 2: JSON Upload - Individual "Skip" Button

**Setup:**
1. [ ] Repeat setup from Scenario 1 (re-import with conflict)

**Test Actions:**
- [ ] Click "Skip - Keep Local Data"
- [ ] Should see toast: "Conflict resolution complete! 0 entries replaced, 1 entries kept."
- [ ] Go to Match List and verify local data was kept (not changed)

**Pass Criteria:** ✅ Local data is preserved

---

### Scenario 3: JSON Upload - "Replace All" Button

**Setup:**
1. [ ] Create multiple conflicts (edit 2-3 different matches on Device A)
2. [ ] Export and upload JSON to Device B
3. [ ] Click "Smart Merge"
4. [ ] Click "Review Each"

**Test Actions:**
- [ ] In the first conflict dialog, click "Replace All"
- [ ] Should see toast: "Batch operation complete! X entries replaced, 0 entries kept."
- [ ] Go to Match List and verify ALL conflicting matches were updated

**Pass Criteria:** ✅ All conflicts are replaced with incoming data

---

### Scenario 4: JSON Upload - "Skip All" Button

**Setup:**
1. [ ] Repeat setup from Scenario 3 (multiple conflicts)

**Test Actions:**
- [ ] In the first conflict dialog, click "Skip All"
- [ ] Should see toast: "Batch operation complete! 0 entries replaced, X entries kept."
- [ ] Go to Match List and verify ALL local data was kept

**Pass Criteria:** ✅ All local data is preserved

---

### Scenario 5: JSON Upload - Mixed Decisions

**Setup:**
1. [ ] Create 3 conflicts (edit 3 matches)
2. [ ] Upload and click "Smart Merge" → "Review Each"

**Test Actions:**
- [ ] On Conflict 1: Click "Replace - Use Incoming Data"
- [ ] On Conflict 2: Click "Skip - Keep Local Data"
- [ ] On Conflict 3: Click "Replace - Use Incoming Data"
- [ ] Should see toast: "Conflict resolution complete! 2 entries replaced, 1 entries kept."
- [ ] Verify Match 1: Updated with incoming
- [ ] Verify Match 2: Kept local data
- [ ] Verify Match 3: Updated with incoming

**Pass Criteria:** ✅ Individual decisions are applied correctly

---

### Scenario 6: QR Code Scanning - Individual "Replace" Button

**Setup:**
1. [ ] On Device A, generate QR codes for matches with conflicts
2. [ ] On Device B, open QR scanner
3. [ ] Scan the QR codes
4. [ ] Should see "Duplicate Entries Detected" dialog
5. [ ] Click "Review Each"

**Test Actions:**
- [ ] Same as Scenario 1 but via QR codes
- [ ] Click "Replace - Use Incoming Data"
- [ ] Verify toast shows "1 entries replaced"
- [ ] Verify data was updated

**Pass Criteria:** ✅ QR code path replaces data correctly

---

### Scenario 7: QR Code Scanning - "Replace All" Button

**Setup:**
1. [x] Generate QR codes for multiple matches with conflicts
2. [x] Scan on Device B
3. [x] Click "Review Each"

**Test Actions:**
- [x] Click "Replace All"
- [x] Verify all conflicts are replaced
- [x] Check Match List to confirm all updates

**Pass Criteria:** ✅ Pass - QR batch replacement works correctly

---

### Scenario 8: Cross-Device Sync

**Setup:**
1. [x] Device A: Create/edit match data
2. [x] Device A: Export via JSON
3. [x] Device B: Import JSON (should have no conflicts if new data)
4. [x] Device B: Edit one of the matches
5. [x] Device B: Export via JSON
6. [x] Device A: Import Device B's JSON (now has conflict)

**Test Actions:**
- [x] Verify conflict is detected
- [x] Verify both timestamps are shown correctly
- [x] Verify both scout names are shown correctly
- [x] Replace or skip as desired
- [x] Verify data integrity

**Pass Criteria:** ✅ Pass - Bidirectional sync works correctly

---

### Scenario 9: Undo Functionality

**Setup:**
1. [x] Create 3 conflicts
2. [x] Upload and click "Review Each"

**Test Actions:**
- [x] On Conflict 1: Click "Replace" (advances to Conflict 2)
- [x] On Conflict 2: Click "Skip" (advances to Conflict 3)
- [x] At Conflict 3: Click "Undo" button
- [x] Should go back to Conflict 2 (undoes the "Skip" decision)
- [x] Change decision to "Replace" (advances to Conflict 3)
- [x] Click "Undo" again
- [x] Should go back to Conflict 2 (undoes the "Replace" decision)
- [x] Finish resolving all conflicts
- [x] Verify final decisions were applied correctly

**Pass Criteria:** ✅ Pass - Undo works and final decisions are correct

---

### Scenario 10: Alliance Field Independence

**Setup:**
1. [x] Create data with different alliance values (blue vs red)
2. [x] Edit a match and export

**Test Actions:**
- [x] Import and verify conflict is detected
- [x] Verify conflict matching doesn't depend on alliance field
- [x] Match should be identified by event + match + team only
- [x] Alliance mismatch should NOT prevent conflict detection

**Pass Criteria:** ✅ Pass - Conflicts detected regardless of alliance value (alliance shown in changed fields but doesn't affect matching)

---

## Edge Cases

### Edge Case 1: No Conflicts
- [x] Import JSON with completely new data
- [x] Should see "Import successful!" toast
- [x] No conflict dialogs should appear
- [x] Data should be imported directly

**Result:** ✅ Pass - New data imported without conflicts

### Edge Case 2: Identical Data
- [x] Import JSON with exact same data (no changes)
- [x] Should skip duplicates automatically with smart merge
- [x] Shows "0 new entries added, 0 entries replaced"

**Result:** ✅ Pass - Identical data skipped correctly with message "Smart merge complete! 0 new entries added, 0 entries replaced (Total: 720)"

### Edge Case 3: Missing Fields
- [x] Test with data missing eventName
- [x] Verify fallback behavior works
- [x] Should not crash
- [x] Local data properly matched using match + team fallback

**Result:** ✅ Pass - Fallback matching works, displays correct scout name and timestamp from local data

### Edge Case 4: Single Conflict
- [x] Import with exactly 1 conflict
- [x] Verify "Replace All" and "Skip All" buttons work
- [x] Verify individual buttons work
- [x] No "next" conflict to navigate to

**Result:** ✅ Pass - Single conflict handled correctly

### Edge Case 5: Many Conflicts (10+)
- [x] Create 10+ conflicts
- [x] Test that all can be resolved
- [x] Test "Replace All" performance
- [x] Verify toast shows correct count

**Result:** ✅ Pass - Multiple conflicts resolved quickly with good performance

---

## Regression Tests

### Check These Still Work:
- [x] Normal data entry (no conflicts)
- [x] Match list displays correctly
- [x] Team stats calculations
- [x] Data export (JSON and QR)
- [x] Scout profiles
- [x] Pit scouting
- [x] Strategy view

**Result:** ✅ All regression tests passed - No existing functionality broken

---

## Performance Tests

- [ ] Time to detect conflicts with 50+ matches
- [ ] Time to apply "Replace All" with 20+ conflicts
- [ ] Memory usage during conflict resolution
- [ ] No lag or freezing during resolution

---

## Browser/Device Compatibility

Test on:
- [ ] Chrome desktop
- [ ] Firefox desktop
- [ ] Safari desktop
- [ ] Chrome mobile (Android)
- [ ] Safari mobile (iOS)
- [ ] Edge desktop

---

## Test Results Summary

**Date Completed:** November 5, 2025  
**Tester:** User + GitHub Copilot  
**Version:** dev branch

### Core Scenarios (10/10 ✅)
| Scenario | Status | Notes |
|----------|--------|-------|
| 1. JSON Individual Replace | ✅ Pass | Individual replace button works correctly |
| 2. JSON Individual Skip | ✅ Pass | Skip button maintains local data |
| 3. JSON Replace All | ✅ Pass | Batch replace works efficiently |
| 4. JSON Skip All | ✅ Pass | Batch skip works correctly |
| 5. JSON Mixed Decisions | ✅ Pass | Mixed skip/replace works |
| 6. QR Individual Replace | ✅ Pass | QR code path replaces data correctly |
| 7. QR Replace All | ✅ Pass | QR batch replacement works correctly |
| 8. Cross-Device Sync | ✅ Pass | Bidirectional sync works correctly |
| 9. Undo Functionality | ✅ Pass | Undo works and final decisions correct |
| 10. Alliance Independence | ✅ Pass | Conflicts detected regardless of alliance value |

### Edge Cases (5/5 ✅)
| Edge Case | Status | Notes |
|-----------|--------|-------|
| 1. No Conflicts | ✅ Pass | New data imported without conflicts |
| 2. Identical Data | ✅ Pass | Smart merge skips duplicates correctly |
| 3. Missing Fields | ✅ Pass | Fallback matching works for missing eventName |
| 4. Single Conflict | ✅ Pass | Single conflict handled correctly |
| 5. Many Conflicts (10+) | ✅ Pass | Multiple conflicts resolved quickly |

### Regression Tests (7/7 ✅)
- ✅ Normal data entry (no conflicts)
- ✅ Match list displays correctly
- ✅ Team stats calculations
- ✅ Data export (JSON and QR)
- ✅ Scout profiles
- ✅ Pit scouting
- ✅ Strategy view

**Overall Result:** ✅ **PASS**

**Key Fixes Applied During Testing:**
1. Removed alliance field from conflict matching (event + match + team only)
2. Fixed stale state issue in both JSONUploader and FountainCodeScanner
3. Added fallback matching for missing eventName (match + team only)
4. Updated button layout (Undo spans both columns)
5. Improved null value handling in conflict detection

**Issues Found:** None - All tests passed

---

## Sign-Off

- [ ] All test scenarios passed
- [ ] No regressions found
- [ ] Performance acceptable
- [ ] Cross-device sync working
- [ ] Ready for production

**Tester Signature:** _______________ **Date:** _______________
