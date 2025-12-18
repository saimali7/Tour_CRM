"use client";

import * as React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  collapsed?: boolean;
  minimal?: boolean;
}

export function ThemeToggle({ collapsed, minimal }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  const CurrentIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  // Minimal mode: icon-only toggle in footer row
  if (minimal) {
    if (!mounted) {
      return (
        <button
          className="flex items-center justify-center rounded-lg p-2 text-muted-foreground"
          disabled
        >
          <Sun className="h-4 w-4" />
        </button>
      );
    }

    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "flex items-center justify-center rounded-lg p-2 text-muted-foreground transition-all duration-150",
                  "hover:bg-accent hover:text-foreground hover:scale-105 active:scale-95"
                )}
              >
                <CurrentIcon className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side={collapsed ? "right" : "top"}>
            Theme
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent align={collapsed ? "end" : "start"} side={collapsed ? "right" : "top"}>
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Legacy mode: full button
  if (!mounted) {
    return (
      <button
        className={cn(
          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground",
          collapsed && "justify-center px-2"
        )}
        disabled
      >
        <Sun className="h-[18px] w-[18px]" />
        {!collapsed && <span>Theme</span>}
      </button>
    );
  }

  if (collapsed) {
    return (
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground"
              >
                <CurrentIcon className="h-[18px] w-[18px]" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">Theme</TooltipContent>
        </Tooltip>
        <DropdownMenuContent align="end" side="right">
          <DropdownMenuItem onClick={() => setTheme("light")}>
            <Sun className="mr-2 h-4 w-4" />
            Light
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("dark")}>
            <Moon className="mr-2 h-4 w-4" />
            Dark
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setTheme("system")}>
            <Monitor className="mr-2 h-4 w-4" />
            System
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-all duration-150 hover:bg-accent hover:text-foreground"
        >
          <CurrentIcon className="h-[18px] w-[18px]" />
          <span>Theme</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
