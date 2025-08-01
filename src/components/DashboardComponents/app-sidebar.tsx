import * as React from "react"
import { Settings, SquarePen, Download } from "lucide-react"

// import { NavDocuments } from "@/components/DashboardComponents/nav-documents"
import { NavMain } from "@/components/DashboardComponents/nav-main"
// import { NavSecondary } from "@/components/DashboardComponents/nav-secondary"
import { NavUser } from "@/components/DashboardComponents/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Separator } from "../ui/separator"
import ManeuverHorizontalLogo from "../../assets/Maneuver Wordmark Horizontal.png"
import { haptics } from "@/lib/haptics"

const data = {
  navMain: [
    {
      title: "Data Actions",
      url: "/settings",
      icon: Settings,
      items: [
        {
          title: "Clear Data",
          url: "/clear-data",
        },
        {
          title: "Convert Scouting JSON Data",
          url: "/parse-data",
        }
      ]
    },
    {
      title: "Data Transfer",
      url: "#",
      icon: Download,
      items: [
        {
          title: "Scouting Data JSON Transfer",
          url: "/json-transfer",
        },
        {
          title: "Scouting Data QR Transfer",
          url: "/scout-data-qr",
        },
        {
          title: "Match Data API/JSON Load",
          url: "/match-data",
        },
        {
          title: "Match Data QR Transfer",
          url: "/match-data-qr",
        }
      ]
    },
    {
      title: "Strategy",
      url: "#",
      icon: SquarePen,
      items: [
        {
          title: "Match Strategy",
          url: "/match-strategy",
        },
        {
          title: "Team Stats",
          url: "/team-stats",
        },
        {
          title: "Pick Lists",
          url: "/pick-list",
        }
      ],
    },
  ],
  navSecondary: [
    {
      title: "Get Help (WIP)",
      url: "#",
      // icon: IconHelp,
    },
  ],
  documents: [
    {
      name: "Saved Match Strategies (WIP)",
      url: "#",
      // icon: IconDatabase,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { setOpenMobile } = useSidebar()
  const touchStartRef = React.useRef<{ x: number; y: number } | null>(null)
  
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    touchStartRef.current = { x: touch.clientX, y: touch.clientY }
  }
  
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStartRef.current.x
    const deltaY = touch.clientY - touchStartRef.current.y
    const minSwipeDistance = 60
    
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
      if (deltaX < -minSwipeDistance) {
        e.preventDefault()
        haptics.light()
        setOpenMobile(false)
      }
    }
    
    touchStartRef.current = null
  }

  React.useEffect(() => {
    const handleGlobalTouchStart = (e: TouchEvent) => {
      const sidebar = document.querySelector('[data-sidebar="sidebar"]')
      if (sidebar && !sidebar.contains(e.target as Node)) {
        const touch = e.touches[0]
        touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      }
    }

    const handleGlobalTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return
      
      const sidebar = document.querySelector('[data-sidebar="sidebar"]')
      if (sidebar && !sidebar.contains(e.target as Node)) {
        const touch = e.changedTouches[0]
        const deltaX = touch.clientX - touchStartRef.current.x
        const deltaY = touch.clientY - touchStartRef.current.y
        const minSwipeDistance = 60
        
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > minSwipeDistance) {
          if (deltaX < -minSwipeDistance) {
            e.preventDefault()
            haptics.light()
            setOpenMobile(false)
          }
        }
      }
      
      touchStartRef.current = null
    }

    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: true })
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart)
      document.removeEventListener('touchend', handleGlobalTouchEnd)
    }
  }, [setOpenMobile])

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button] h-fit"
            >
              <a href="/" aria-label="Maneuver Home">
                <img
                  src={ManeuverHorizontalLogo}
                  className="row-span-4 scale-75 dark:invert"
                  width="240"
                  height="160"
                  alt="Maneuver Logo Wordmark Horizontal"
                />
              </a>
            </SidebarMenuButton>
            <Separator className="my-1" />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <NavMain items={data.navMain} />
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  )
}
