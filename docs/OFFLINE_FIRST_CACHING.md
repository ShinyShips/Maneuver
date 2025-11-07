# Offline-First Caching Strategy

## Overview

The Match Validation Data system uses an **offline-first caching strategy** to ensure data availability even without internet connectivity. This is critical for FRC events where internet access can be unreliable.

## Core Principle

**NEVER delete cached data unless we have fresh replacement data.**

This means:
- ✅ Cache persists indefinitely until replaced
- ✅ Expired cache is still usable offline
- ✅ Users always have access to previously loaded data
- ❌ No automatic deletion of "stale" data
- ❌ No forced online requirement to view cached data

## How It Works

### 1. First Load (Online)
```
User clicks "Load Match Validation Data"
         ↓
System checks: Are we online?
         ↓
    YES → Fetch from TBA API
         ↓
Store in IndexedDB with timestamp
         ↓
Set expiration: now + 1 hour
         ↓
Display data to user
```

### 2. Subsequent Load Within 1 Hour (Online)
```
User reloads or returns to page
         ↓
System checks cache
         ↓
Found data, check expiration
         ↓
now < expirationTime (fresh!)
         ↓
Return cached data (no API call)
         ↓
Display data instantly
```

### 3. Load After 1 Hour (Online)
```
User reloads after 1+ hours
         ↓
System checks cache
         ↓
Found data, check expiration
         ↓
now > expirationTime (expired!)
         ↓
System checks: Are we online?
         ↓
    YES → Fetch fresh data from TBA
         ↓
Replace old cache with new data
         ↓
Display fresh data
```

### 4. Load While Offline (ANY TIME)
```
User opens app without internet
         ↓
System checks cache
         ↓
Found data (expired or not)
         ↓
System checks: Are we online?
         ↓
    NO → Return cached data anyway
         ↓
Show warning: "Offline - showing cached data"
         ↓
Display last known data
```

## Cache Expiration Behavior

### Traditional Caching (WRONG for offline-first) ❌
```typescript
if (now > expirationTime) {
  await db.delete(matchKey);  // ← DELETES DATA!
  return null;
}
```

**Problem**: User loses data when offline after expiration.

### Offline-First Caching (CORRECT) ✅
```typescript
if (now > expirationTime && !navigator.onLine) {
  // Keep expired data if offline
  return cachedData;
}

if (now > expirationTime && navigator.onLine) {
  // Try to fetch fresh, but keep old as fallback
  try {
    const fresh = await fetchFromAPI();
    await cache.replace(fresh);
    return fresh;
  } catch (error) {
    // API failed, return stale data
    return cachedData;
  }
}
```

**Benefit**: Data is always available, refreshes when possible.

## Implementation Details

### Cache Storage (`tbaCache.ts`)

```typescript
// Cache duration (when to consider data "stale")
const CACHE_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour

// Get cached match - ALWAYS returns data if available
export async function getCachedTBAMatch(
  matchKey: string,
  allowExpired: boolean = true  // Default: true for offline-first
): Promise<TBAMatchData | null> {
  const cached = await db.matches.get(matchKey);
  
  if (!cached) return null;
  
  // Offline-first: Return even if expired
  if (allowExpired) {
    return cached.data;
  }
  
  // Only filter expired if explicitly requested
  if (Date.now() > cached.expiresAt) {
    return null;
  }
  
  return cached.data;
}

// Check expiration WITHOUT deleting
export async function getCacheExpiration(eventKey: string) {
  const metadata = await db.metadata.get(eventKey);
  const ageMs = Date.now() - metadata.lastFetchedAt;
  const isExpired = ageMs > CACHE_EXPIRATION_MS;
  
  return { hasCache: true, isExpired, ageMs };
}
```

### React Hook (`useTBAMatchData.ts`)

```typescript
// Fetch with offline-first logic
const fetchEventMatches = async (eventKey, apiKey, forceRefresh) => {
  // 1. Check cache (include expired)
  const cached = await getCachedTBAEventMatches(eventKey, true);
  const expiration = await getCacheExpiration(eventKey);
  
  // 2. If offline, use cache regardless of expiration
  if (cached.length > 0 && !navigator.onLine) {
    if (expiration.isExpired) {
      toast.warning("Showing cached data (offline)");
    }
    return cached;
  }
  
  // 3. If fresh cache and online, use it (no API call)
  if (cached.length > 0 && !expiration.isExpired && !forceRefresh) {
    return cached;
  }
  
  // 4. If online, fetch fresh data
  if (navigator.onLine) {
    try {
      const fresh = await fetchFromTBA(eventKey, apiKey);
      await cacheTBAMatches(fresh);  // Replace old cache
      return fresh;
    } catch (error) {
      // Fetch failed, fall back to cache
      if (cached.length > 0) {
        toast.warning("Using cached data (fetch failed)");
        return cached;
      }
      throw error;
  }
  
  // 5. No cache and offline = error
  throw new Error("No cached data and you are offline");
};
```

### UI Display (`MatchValidationDataDisplay.tsx`)

```typescript
// Show offline/stale warnings
{(!isOnline || cacheExpired) && (
  <Alert>
    {!isOnline 
      ? "You are offline. Showing cached data."
      : "Cache expired. Data may be stale. Reload for fresh data."
    }
  </Alert>
)}

// Disable cache clearing when offline
<Button 
  onClick={onClearCache}
  disabled={!isOnline}
>
  {isOnline 
    ? "Clear Validation Cache" 
    : "Clear Cache (requires internet)"
  }
</Button>
```

## User Experience

### Online with Fresh Cache
```
✅ Load matches from cache
✅ Instant display
ℹ️ "Loaded 45 matches from cache"
```

### Online with Expired Cache
```
⚠️ Cache is stale (> 1 hour old)
🔄 Fetching fresh data from TBA
✅ Updated cache with new data
ℹ️ "Loaded 45 matches from TBA"
```

### Offline with Fresh Cache
```
📡 No internet detected
✅ Load matches from cache
ℹ️ "Loaded 45 matches from cache (offline)"
```

### Offline with Expired Cache
```
📡 No internet detected
⚠️ Cache is stale but still usable
✅ Load matches from cache anyway
⚠️ "Showing cached data (offline). Last updated 2h 15m ago"
```

### Offline with No Cache
```
📡 No internet detected
❌ No cached data available
❌ "No cached data available and you are offline"
```

## Best Practices

### For Users
1. **Load data while online** to cache it for offline use
2. **Check cache age** in the display (shows "Last Updated")
3. **Reload when online** to get fresh data after expiration
4. **Don't clear cache** unless you have internet to reload

### For Developers
1. **Always check `navigator.onLine`** before fetching
2. **Never delete cache** without replacement
3. **Show stale data warnings** when appropriate
4. **Provide manual refresh** option for user control
5. **Disable destructive actions** (like clear cache) when offline

## Cache Management

### When to Clear Cache
- ❌ NEVER automatically due to expiration
- ✅ Only when user explicitly requests
- ✅ Only when online (to allow reload)
- ✅ When loading fresh data (replacement)

### When to Refresh Cache
- ✅ On user request ("Load Match Validation Data")
- ✅ When cache is expired AND online
- ✅ When force refresh is requested
- ❌ Never automatically in background

### Cache Expiration Timeline
```
Time 0:00  → Data loaded, cache fresh
Time 0:30  → Cache still fresh, use it
Time 1:00  → Cache expires (stale threshold)
Time 1:15  → Cache stale, but still usable
Time 2:00  → Cache very stale, show warning
Time 24:00 → Cache ancient, but STILL USABLE if offline

Cache NEVER deleted unless:
1. User explicitly clears it (while online)
2. Fresh data fetched to replace it
```

## Comparison with Other Strategies

### Traditional Cache (Bad for FRC)
```
Fresh → Use
Stale → Delete → Fetch → Error if offline
```
**Problem**: No data when offline after expiration

### Offline-First (Good for FRC)
```
Fresh → Use
Stale + Online → Fetch fresh → Use fresh
Stale + Offline → Use stale → Show warning
```
**Benefit**: Always have data, refresh when possible

### Online-Only (Worst for FRC)
```
Always fetch from API
```
**Problem**: Completely broken at events with poor internet

## Future Enhancements

### Possible Improvements
1. **Background sync**: Auto-refresh when connection restored
2. **Smart expiration**: Longer cache for historical events, shorter for live
3. **Partial updates**: Fetch only new matches, not entire event
4. **Conflict resolution**: Handle local edits vs remote updates
5. **Cache size management**: Limit total storage with LRU eviction

### Not Recommended
- ❌ Auto-delete old data (breaks offline-first)
- ❌ Require online for viewing (defeats purpose)
- ❌ Force refresh on page load (wastes bandwidth)

## Testing Checklist

### Manual Tests
- [ ] Load data while online
- [ ] View data immediately (should use cache)
- [ ] Wait 1+ hours, reload (should fetch fresh)
- [ ] Turn off internet, reload (should use stale cache)
- [ ] Turn off internet, clear cache (should be disabled)
- [ ] Turn on internet, reload (should fetch fresh)
- [ ] Check warnings appear for offline/stale data

### Edge Cases
- [ ] No cache + offline = proper error
- [ ] Cache + offline = always works
- [ ] Expired cache + online + API error = falls back to cache
- [ ] Fresh cache + force refresh = fetches anyway

## Conclusion

Offline-first caching ensures FRC teams can:
- ✅ Scout at events with poor internet
- ✅ Review data between matches without connectivity
- ✅ Never lose access to previously loaded information
- ✅ Automatically get fresh data when connection allows

**Key Principle**: Data availability > Data freshness

For a scouting app at live events, having slightly stale data is infinitely better than having no data at all.
