"use client";

import { useI18n } from "@ui/i18n";
import { localeLabels, locales, type Locale } from "@ui/i18n/core";
import { Languages } from "lucide-react";
import { cn } from "../../utils";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

export interface LocaleToggleProps {
  className?: string;
  onLocaleChange?: (locale: Locale) => void;
}

export function LocaleToggle({ className, onLocaleChange }: LocaleToggleProps) {
  const { locale, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-xl transition-all duration-200",
            "text-muted-foreground hover:text-foreground hover:bg-muted/80",
            className,
          )}
          aria-label={t("siteHeader.switchLanguage")}
        >
          <Languages className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[120px]">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => onLocaleChange?.(loc)}
            className={cn(
              "cursor-pointer",
              locale === loc && "bg-muted font-medium",
            )}
          >
            {localeLabels[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
