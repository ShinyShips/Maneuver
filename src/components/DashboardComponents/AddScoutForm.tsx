import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface AddScoutFormProps {
  onAdd: (name: string) => Promise<void>
  onCancel: () => void
  initialValue?: string
}

export function AddScoutForm({ onAdd, onCancel, initialValue = "" }: AddScoutFormProps) {
  const [newScoutName, setNewScoutName] = useState(initialValue)

  const handleAdd = async () => {
    if (newScoutName.trim()) {
      await onAdd(newScoutName.trim())
      setNewScoutName("")
    }
  }

  const handleKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      await handleAdd()
    } else if (e.key === "Escape") {
      onCancel()
    }
  }

  return (
    <div className="p-2 space-y-2">
      <Input
        placeholder="Enter scout name..."
        value={newScoutName}
        onChange={(e) => setNewScoutName(e.target.value)}
        onInput={(e) => setNewScoutName((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        autoFocus
        autoComplete="name"
      />
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={handleAdd}
          className="flex-1"
        >
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
