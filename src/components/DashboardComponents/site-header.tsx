import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PageHelpTooltip } from "@/components/PageHelpTooltip";
import { useState, useEffect } from "react";

export function SiteHeader() {
  const location = useLocation();
  
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      const mobile = window.innerWidth < 1536;
      setIsMobile(mobile);
      
      if (!mobile) {
        setIsHeaderVisible(true);
        return;
      }
    };

    // Initial check
    checkIsMobile();

    let lastScrollY = 0;
    let ticking = false;

    const handleScroll = (e: Event) => {
      if (!ticking) {
        requestAnimationFrame(() => {
          // Get scroll position from the SidebarInset container
          const scrollContainer = e.target as HTMLElement;
          const currentScrollY = scrollContainer.scrollTop;
          
          if (currentScrollY <= 50) {
            // Always show header when at top
            setIsHeaderVisible(true);
          } else if (currentScrollY > lastScrollY && currentScrollY > 100) {
            // Hide header when scrolling down significantly
            setIsHeaderVisible(false);
          } else if (currentScrollY < lastScrollY && lastScrollY - currentScrollY > 10) {
            // Show header when scrolling up
            setIsHeaderVisible(true);
          }

          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    // Find the correct scroll container (SidebarInset)
    const addScrollListener = () => {
      // Wait for DOM to be ready
      setTimeout(() => {
        const sidebarInset = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement;
        if (sidebarInset) {
          sidebarInset.addEventListener('scroll', handleScroll, { passive: true });
        }
      }, 100);
    };

    const removeScrollListener = () => {
      const sidebarInset = document.querySelector('main[data-slot="sidebar-inset"]') as HTMLElement;
      if (sidebarInset) {
        sidebarInset.removeEventListener('scroll', handleScroll);
      }
    };

    // Add listeners only on mobile
    if (isMobile) {
      addScrollListener();
    }

    // Handle resize
    const handleResize = () => {
      removeScrollListener();
      checkIsMobile();
      const mobile = window.innerWidth < 1536;
      if (mobile) {
        addScrollListener();
        setIsHeaderVisible(true);
      } else {
        setIsHeaderVisible(true);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      removeScrollListener();
      window.removeEventListener('resize', handleResize);
    };
  }, [location.pathname, isMobile]); // Re-run when route changes or mobile state changes

  return (
    <header 
      className={`flex h-(--header-height) items-center bg-popover/95 backdrop-blur-sm gap-2 border-b transition-all duration-300 ease-out group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) py-2 z-30 ${
        isMobile 
          ? `fixed top-0 left-0 right-0 ${isHeaderVisible ? 'translate-y-0' : '-translate-y-full'}` 
          : 'sticky top-0'
      }`}
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" size={"lg"} />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-12"
        />
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center justify-center">
            <PageHelpTooltip />
          </div>
          <Button variant="ghost" className="hidden sm:flex w-auto h-auto px-6">
            <a
              href="https://github.com/ShinyShips/Maneuver"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  )
}
