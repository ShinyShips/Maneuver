import { Binoculars, Wifi, QrCode, TrendingUp, Map } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { usePWA } from '@/hooks/usePWA';
import { useIsMobile } from '@/hooks/use-mobile';
import { useNavigationConfirm } from '@/hooks/useNavigationConfirm';
import { NavigationConfirmDialog } from '@/components/NavigationConfirmDialog';
import { haptics } from '@/lib/haptics';
import Button from '@/components/ui/button';

/**
 * Bottom Navigation Component
 * 
 * Shows a bottom navigation bar on mobile devices (under 2xl breakpoint) 
 * ONLY when the app is installed as a PWA. This prevents conflicts with 
 * iOS Safari's native navigation bar.
 * 
 * In development mode, the navigation is visible for testing purposes
 * with a warning indicator.
 */

interface BottomNavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}

const navItems: BottomNavItem[] = [
  {
    icon: Binoculars,
    label: 'Scout',
    href: '/game-start',
  },
  {
    icon: Wifi,
    label: 'WiFi Data',
    href: '/peer-transfer',
  },
  {
    icon: QrCode,
    label: 'QR Data',
    href: '/qr-data-transfer',
  },
  {
    icon: TrendingUp,
    label: 'Strategy',
    href: '/strategy-overview',
  },
  {
    icon: Map,
    label: 'Match',
    href: '/match-strategy',
  },
];

export function BottomNavigation() {
  const location = useLocation();
  const isPWA = usePWA();
  const isMobile = useIsMobile();
  const { 
    confirmNavigation, 
    handleConfirm, 
    handleCancel, 
    isConfirmDialogOpen, 
    pendingDestinationLabel 
  } = useNavigationConfirm();

  // Show in development for testing, or on mobile when installed as PWA
  const isDevelopment = import.meta.env.DEV;
  const shouldShow = isMobile && (isPWA || isDevelopment);

  if (!shouldShow) {
    return null;
  }

  const handleNavigation = (href: string, label: string) => {
    haptics.light();
    confirmNavigation(href, label);
  };

  return (
    <>
      <div 
        className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {isDevelopment && !isPWA && (
          <div className="text-xs text-center py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
            Development Mode: Bottom nav will only show in PWA
          </div>
        )}
        <nav className="flex items-center justify-around py-2 px-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <Button
                key={item.href}
                variant="ghost"
                onClick={() => handleNavigation(item.href, item.label)}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                  "min-w-0 flex-1 max-w-16 h-auto",
                  isActive 
                    ? "text-primary bg-primary/10" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="text-xs font-medium truncate">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </div>
      
      <NavigationConfirmDialog
        open={isConfirmDialogOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        destinationLabel={pendingDestinationLabel}
      />
    </>
  );
}
