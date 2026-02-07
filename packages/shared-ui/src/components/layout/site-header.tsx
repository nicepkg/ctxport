"use client";

import { useI18n } from "@ui/i18n";
import type { Locale } from "@ui/i18n/core";
import { Github } from "lucide-react";
import * as React from "react";
import { cn } from "../../utils";
import { Button } from "../ui/button";
import { LocaleToggle } from "./locale-toggle";
import { MobileNav, type NavItem } from "./mobile-nav";
import { ThemeToggle } from "./theme-toggle";

export interface SiteHeaderProps {
  logo: React.ReactNode;
  navItems?: NavItem[];
  githubUrl?: string;
  showThemeToggle?: boolean;
  showLocaleToggle?: boolean;
  className?: string;
  onNavigate?: (href: string) => void;
  onLocaleChange?: (locale: Locale) => void;
}

export function SiteHeader({
  logo,
  navItems = [],
  githubUrl,
  showThemeToggle = true,
  showLocaleToggle = false,
  className,
  onNavigate,
  onLocaleChange,
}: SiteHeaderProps) {
  const { t } = useI18n();
  return (
    <header
      className={cn(
        "sticky top-0 z-50",
        "bg-background/80 backdrop-blur-lg",
        "border-b border-border/50",
        "transition-all duration-200",
        className,
      )}
    >
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Left: Mobile nav + Logo */}
        <div className="flex items-center gap-2">
          <MobileNav
            items={navItems}
            logo={logo}
            onNavigate={onNavigate}
            footer={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {showLocaleToggle && (
                    <LocaleToggle onLocaleChange={onLocaleChange} />
                  )}
                  {showThemeToggle && <ThemeToggle />}
                </div>
                {githubUrl && (
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={t("siteHeader.viewOnGithub")}
                  >
                    <Github className="h-5 w-5" />
                  </a>
                )}
              </div>
            }
          />
          <a
            href="/"
            onClick={(e) => {
              if (onNavigate) {
                e.preventDefault();
                onNavigate("/");
              }
            }}
            className="flex items-center"
          >
            {logo}
          </a>
        </div>

        {/* Center: Desktop navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={(e) => {
                if (!item.external && onNavigate) {
                  e.preventDefault();
                  onNavigate(item.href);
                }
              }}
              target={item.external ? "_blank" : undefined}
              rel={item.external ? "noopener noreferrer" : undefined}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium",
                "text-muted-foreground hover:text-foreground",
                "hover:bg-muted/80 transition-all duration-200",
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="hidden md:flex items-center gap-2">
          {showLocaleToggle && <LocaleToggle onLocaleChange={onLocaleChange} />}
          {showThemeToggle && <ThemeToggle />}
          {githubUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground"
              asChild
            >
              <a
                href={githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("siteHeader.viewOnGithub")}
              >
                <Github className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
