"use client";

import { Menu } from "lucide-react";
import * as React from "react";
import { cn } from "../../utils";
import { Button } from "../ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "../ui/sheet";

export interface NavItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  external?: boolean;
}

export interface MobileNavProps {
  items: NavItem[];
  logo?: React.ReactNode;
  title?: string;
  footer?: React.ReactNode;
  className?: string;
  onNavigate?: (href: string) => void;
}

export function MobileNav({
  items,
  logo,
  title = "Menu",
  footer,
  className,
  onNavigate,
}: MobileNavProps) {
  const [open, setOpen] = React.useState(false);

  const handleNavigation = (href: string) => {
    setOpen(false);
    onNavigate?.(href);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-9 w-9 rounded-xl md:hidden",
          "text-muted-foreground hover:text-foreground hover:bg-muted/80",
          className,
        )}
        onClick={() => setOpen(true)}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="border-b px-4 py-4">
          {logo && <div className="mb-1">{logo}</div>}
          <SheetTitle className="sr-only">{title}</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col p-4">
          {items.map((item) => (
            <SheetClose key={item.href} asChild>
              <a
                href={item.href}
                onClick={(e) => {
                  if (!item.external && onNavigate) {
                    e.preventDefault();
                    handleNavigation(item.href);
                  }
                }}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-3",
                  "text-foreground/80 hover:text-foreground",
                  "hover:bg-muted/80 transition-colors duration-200",
                )}
              >
                {item.icon && (
                  <span className="text-muted-foreground">{item.icon}</span>
                )}
                <span className="font-medium">{item.label}</span>
              </a>
            </SheetClose>
          ))}
        </nav>
        {footer && <div className="mt-auto border-t p-4">{footer}</div>}
      </SheetContent>
    </Sheet>
  );
}
