import { useState, useEffect, useCallback } from "react"
import { toast } from "sonner"
import { getOrCreateScoutByName, deleteScout, getScout } from "@/lib/scoutGameUtils"

export function useScoutManagement() {
  const [currentScout, setCurrentScout] = useState("")
  const [currentScoutStakes, setCurrentScoutStakes] = useState(0)
  const [scoutsList, setScoutsList] = useState<string[]>([])

  // Load saved scouts and current scout
  const loadScouts = useCallback(async () => {
    // Load from localStorage - this is the source of truth for selectable scouts
    const savedScouts = localStorage.getItem("scoutsList")
    const savedCurrentScout = localStorage.getItem("scoutName") || localStorage.getItem("currentScout")
    
    let localStorageScouts: string[] = []
    if (savedScouts) {
      try {
        localStorageScouts = JSON.parse(savedScouts)
      } catch {
        localStorageScouts = []
      }
    }
    
    // Set the selectable scouts list from localStorage only
    // This respects the user's choice when importing ("Import Data Only" vs "Add to Selectable List")
    setScoutsList(localStorageScouts)
    
    // Ensure any localStorage scouts exist in DB (for backwards compatibility)
    try {
      for (const scoutName of localStorageScouts) {
        await getOrCreateScoutByName(scoutName)
      }
    } catch (error) {
      console.error("Error ensuring scouts exist in database:", error)
    }
    
    if (savedCurrentScout) {
      setCurrentScout(savedCurrentScout)
      // Ensure current scout exists in DB and load their stakes
      try {
        const scout = await getOrCreateScoutByName(savedCurrentScout)
        setCurrentScoutStakes(scout.stakes)
      } catch (error) {
        console.error("Error creating current scout in database:", error)
      }
    }
  }, [])

  // Function to update current scout stakes
  const updateCurrentScoutStakes = async (scoutName: string) => {
    if (!scoutName) {
      setCurrentScoutStakes(0)
      return
    }
    
    try {
      const scout = await getScout(scoutName)
      setCurrentScoutStakes(scout?.stakes || 0)
    } catch (error) {
      console.error("Error fetching scout stakes:", error)
      setCurrentScoutStakes(0)
    }
  }

  const saveScout = async (name: string) => {
    if (!name.trim()) return
    
    const trimmedName = name.trim()
    const updatedList = scoutsList.includes(trimmedName) 
      ? scoutsList 
      : [...scoutsList, trimmedName].sort()
    
    setScoutsList(updatedList)
    setCurrentScout(trimmedName)
    
    // Save to localStorage
    localStorage.setItem("scoutsList", JSON.stringify(updatedList))
    localStorage.setItem("currentScout", trimmedName)
    localStorage.setItem("scoutName", trimmedName) // For backwards compatibility
    
    // Create/update scout in ScoutGameDB and get their stakes
    try {
      const scout = await getOrCreateScoutByName(trimmedName)
      setCurrentScoutStakes(scout.stakes)
    } catch (error) {
      console.error("Error creating scout in database:", error)
      toast.error(`Failed to save scout to database: ${error}`)
    }
    
    toast.success(`Switched to scout: ${trimmedName}`)
  }

  const removeScout = async (name: string) => {
    const updatedList = scoutsList.filter(s => s !== name)
    setScoutsList(updatedList)
    localStorage.setItem("scoutsList", JSON.stringify(updatedList))
    
    // Remove from database
    try {
      await deleteScout(name)
    } catch (error) {
      console.error("Error removing scout from database:", error)
      // Don't show error toast as this is not critical
    }
    
    if (currentScout === name) {
      setCurrentScout("")
      setCurrentScoutStakes(0)
      localStorage.removeItem("currentScout")
      localStorage.removeItem("scoutName")
    }
    
    toast.success(`Removed scout: ${name}`)
  }

  const clearScoutData = () => {
    setCurrentScout("")
    setCurrentScoutStakes(0)
    setScoutsList([])
  }

  // Load saved scouts and current scout on component mount
  useEffect(() => {
    const handleScoutDataCleared = () => {
      clearScoutData()
      // Don't reload data since it was just cleared - the component will remain in cleared state
    }
    
    // Listen for scout data updated event (when profiles are imported)
    const handleScoutDataUpdated = async () => {
      // Reload scouts to pick up any newly imported ones
      await loadScouts()
      // Also refresh current scout stakes in case they were updated
      const savedCurrentScout = localStorage.getItem("currentScout") || localStorage.getItem("scoutName")
      if (savedCurrentScout) {
        await updateCurrentScoutStakes(savedCurrentScout)
      }
    }
    
    loadScouts()
    
    // Add event listeners
    window.addEventListener('scoutDataCleared', handleScoutDataCleared)
    window.addEventListener('scoutDataUpdated', handleScoutDataUpdated)
    
    // Cleanup event listeners
    return () => {
      window.removeEventListener('scoutDataCleared', handleScoutDataCleared)
      window.removeEventListener('scoutDataUpdated', handleScoutDataUpdated)
    }
  }, [loadScouts])

  // Refresh current scout stakes periodically
  useEffect(() => {
    if (!currentScout) return

    const refreshStakes = async () => {
      await updateCurrentScoutStakes(currentScout)
    }

    // Initial load
    refreshStakes()

    // Refresh every 30 seconds
    const interval = setInterval(refreshStakes, 30000)

    return () => clearInterval(interval)
  }, [currentScout])

  return {
    currentScout,
    currentScoutStakes,
    scoutsList,
    saveScout,
    removeScout,
    loadScouts
  }
}
