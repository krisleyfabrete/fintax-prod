import * as React from "react";
import { RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  showToast?: boolean;
  toastMessage?: string;
}

// Haptic feedback utility
const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
    };
    navigator.vibrate(patterns[type]);
  }
};

export function PullToRefresh({ 
  onRefresh, 
  children, 
  className,
  showToast = true,
  toastMessage = "Dados atualizados!"
}: PullToRefreshProps) {
  const [isPulling, setIsPulling] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const [isComplete, setIsComplete] = React.useState(false);
  const [pullDistance, setPullDistance] = React.useState(0);
  const [hasTriggeredThreshold, setHasTriggeredThreshold] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startY = React.useRef(0);
  const currentY = React.useRef(0);

  const THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;

    currentY.current = e.touches[0].clientY;
    const distance = Math.max(0, currentY.current - startY.current);
    
    if (distance > 0 && containerRef.current?.scrollTop === 0) {
      const dampedDistance = Math.min(distance * 0.5, MAX_PULL);
      setPullDistance(dampedDistance);
      
      // Trigger haptic when crossing threshold
      if (dampedDistance >= THRESHOLD && !hasTriggeredThreshold) {
        triggerHaptic('medium');
        setHasTriggeredThreshold(true);
      } else if (dampedDistance < THRESHOLD && hasTriggeredThreshold) {
        setHasTriggeredThreshold(false);
      }
    }
  };

  const handleTouchEnd = async () => {
    if (!isPulling) return;

    if (pullDistance >= THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(THRESHOLD);
      triggerHaptic('light');
      
      try {
        await onRefresh();
        setIsComplete(true);
        triggerHaptic('heavy');
        if (showToast) {
          toast.success(toastMessage);
        }
        setTimeout(() => {
          setIsComplete(false);
          setPullDistance(0);
        }, 500);
      } finally {
        setIsRefreshing(false);
        setHasTriggeredThreshold(false);
      }
    } else {
      setPullDistance(0);
    }

    setIsPulling(false);
    setHasTriggeredThreshold(false);
    startY.current = 0;
    currentY.current = 0;
  };

  const progress = Math.min(pullDistance / THRESHOLD, 1);
  const rotation = progress * 180;

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-auto", className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 flex items-center justify-center z-50 transition-all duration-200",
          pullDistance > 0 ? "opacity-100" : "opacity-0"
        )}
        style={{
          top: Math.max(pullDistance - 40, 8),
        }}
      >
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
          isComplete ? "bg-green-500/20" : "bg-primary/10",
          isRefreshing && "animate-pulse"
        )}>
          {isComplete ? (
            <Check className="h-5 w-5 text-green-500 animate-scale-in" />
          ) : (
            <RefreshCw
              className={cn(
                "h-5 w-5 transition-all",
                isRefreshing ? "text-primary animate-spin" : "text-primary"
              )}
              style={{
                transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
              }}
            />
          )}
        </div>
      </div>

      {/* Loading overlay during refresh */}
      {isRefreshing && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-40 flex items-start justify-center pt-24 pointer-events-none">
          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <p className="text-sm text-muted-foreground">Atualizando...</p>
          </div>
        </div>
      )}

      {/* Content with pull transform */}
      <div
        className={cn(
          "transition-transform duration-200 ease-out",
          isRefreshing && "opacity-60"
        )}
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : undefined,
        }}
      >
        {children}
      </div>
    </div>
  );
}
