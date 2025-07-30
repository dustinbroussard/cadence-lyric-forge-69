
import * as React from "react"
import { cn } from "@/lib/utils"

// Completely independent tooltip implementation without any Radix UI dependencies
const TooltipProvider = ({ 
  children, 
  delayDuration, 
  skipDelayDuration,
  disableHoverableContent,
  ...props 
}: { 
  children: React.ReactNode; 
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
}) => {
  // Simply render children without any external dependencies
  return <>{children}</>
}

// Simple tooltip context for managing visibility
const TooltipContext = React.createContext<{
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
}>({
  isVisible: false,
  setIsVisible: () => {}
});

const Tooltip = ({ children, ...props }: { children: React.ReactNode }) => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  return (
    <TooltipContext.Provider value={{ isVisible, setIsVisible }}>
      <div className="relative inline-block" {...props}>
        {children}
      </div>
    </TooltipContext.Provider>
  );
}

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ children, asChild = false, ...props }, ref) => {
  const { setIsVisible } = React.useContext(TooltipContext);
  
  const handleMouseEnter = () => setIsVisible(true);
  const handleMouseLeave = () => setIsVisible(false);

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, { 
      ...props, 
      ref,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave
    } as any)
  }
  
  return (
    <span 
      ref={ref as any} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {children}
    </span>
  );
})
TooltipTrigger.displayName = "TooltipTrigger"

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    sideOffset?: number;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    hidden?: boolean;
  }
>(({ className, sideOffset = 4, side = "top", align = "center", hidden, ...props }, ref) => {
  const { isVisible } = React.useContext(TooltipContext);
  
  if (!isVisible || hidden) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95",
        // Position based on side prop
        side === "top" && "bottom-full mb-1",
        side === "bottom" && "top-full mt-1",
        side === "left" && "right-full mr-1",
        side === "right" && "left-full ml-1",
        // Alignment
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className
      )}
      style={{ marginTop: side === "bottom" ? sideOffset : undefined }}
      {...props}
    />
  )
})
TooltipContent.displayName = "TooltipContent"

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider }
