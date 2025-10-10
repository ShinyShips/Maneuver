import { useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Check, Plus, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { AddScouterForm } from "./AddScouterForm"

interface ScouterSelectorContentProps {
  currentScouter: string
  scoutersList: string[]
  onScouterSelect: (name: string) => Promise<void>
  onScouterRemove: (name: string) => Promise<void>
  onClose?: () => void
}

export function ScouterSelectorContent({ 
  currentScouter, 
  scoutersList, 
  onScouterSelect, 
  onScouterRemove,
  onClose
}: ScouterSelectorContentProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [searchValue, setSearchValue] = useState("")

  const getScouterInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3) // Limit to 3 characters
  }

  const handleScouterSelect = async (name: string) => {
    await onScouterSelect(name)
    onClose?.()
    setShowAddForm(false)
  }

  const handleAddScouter = async (name: string) => {
    await onScouterSelect(name) // This will create and select the scouter
    onClose?.()
    setShowAddForm(false)
    setSearchValue("")
  }

  const handleCancelAdd = () => {
    setShowAddForm(false)
    setSearchValue("")
  }

  return (
    <Command shouldFilter={true}>
      {!showAddForm ? (
        <>
          <CommandInput 
            placeholder="Search scouters..."
            onInput={(e) => {
              const target = e.target as HTMLInputElement
              setSearchValue(target.value)
            }}
          />
          <CommandEmpty>
            <div className="text-center p-4">
              <p className="text-sm text-muted-foreground mb-2">No scouters found</p>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowAddForm(true)
                }}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Scouter
              </Button>
            </div>
          </CommandEmpty>
          <CommandList>
            <CommandGroup>
              {scoutersList.map((scouter) => (
                <CommandItem
                  key={scouter}
                  value={scouter}
                  onSelect={() => handleScouterSelect(scouter)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        currentScouter === scouter ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-muted">
                          {getScouterInitials(scouter)}
                        </AvatarFallback>
                      </Avatar>
                      {scouter}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async (e) => {
                      e.stopPropagation()
                      await onScouterRemove(scouter)
                    }}
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </CommandItem>
              ))}
            </CommandGroup>
            
            {scoutersList.length > 0 && (
              <CommandGroup>
                <div 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowAddForm(true)
                  }}
                  className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Scouter
                </div>
              </CommandGroup>
            )}
          </CommandList>
        </>
      ) : (
        <AddScouterForm 
          onAdd={handleAddScouter}
          onCancel={handleCancelAdd}
          initialValue={searchValue}
        />
      )}
    </Command>
  )
}
