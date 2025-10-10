import { useState } from "react"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ChevronsUpDown } from "lucide-react"
import { useScoutManagement } from "@/hooks/useScoutManagement"
import { ScoutDisplay } from "./ScoutDisplay"
import { ScoutSelectorContent } from "./ScoutSelectorContent"

export function NavUser() {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useState(false)
  
  const {
    currentScout,
    currentScoutStakes,
    scoutsList,
    saveScout,
    removeScout
  } = useScoutManagement()

  const handleClose = () => setOpen(false)

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Use Modal on mobile, Popover on desktop */}
        {isMobile ? (
          <>
            <SidebarMenuButton
              size="lg"
              onClick={() => setOpen(true)}
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <ScoutDisplay 
                currentScout={currentScout}
                currentScoutStakes={currentScoutStakes}
              />
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
            
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="w-[90vw] max-w-md p-0 top-[30%] translate-y-[-30%] sm:top-[50%] sm:translate-y-[-50%]">
                <DialogHeader className="p-4 pb-0">
                  <DialogTitle>Select Scout</DialogTitle>
                </DialogHeader>
                <div className="p-0">
                  <ScoutSelectorContent
                    currentScout={currentScout}
                    scoutsList={scoutsList}
                    onScoutSelect={saveScout}
                    onScoutRemove={removeScout}
                    onClose={handleClose}
                  />
                </div>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              >
                <ScoutDisplay 
                  currentScout={currentScout}
                  currentScoutStakes={currentScoutStakes}
                />
                <ChevronsUpDown className="ml-auto size-4" />
              </SidebarMenuButton>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[300px] p-0" 
              side="right"
              align="start"
            >
              <ScoutSelectorContent
                currentScout={currentScout}
                scoutsList={scoutsList}
                onScoutSelect={saveScout}
                onScoutRemove={removeScout}
                onClose={handleClose}
              />
            </PopoverContent>
          </Popover>
        )}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
