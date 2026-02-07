"use client";

import { useI18n } from "@ui/i18n";
import * as React from "react";
import { cn } from "../../utils";

export interface FooterLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterSection {
  title: string;
  links: FooterLink[];
}

export interface SocialLink {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export interface SiteFooterProps {
  logo?: React.ReactNode;
  description?: string;
  sections?: FooterSection[];
  socialLinks?: SocialLink[];
  navLinks?: FooterLink[];
  copyright?: {
    holder: string;
    license?: string;
  };
  author?: {
    name: string;
    href?: string;
  };
  className?: string;
}

export function SiteFooter({
  logo,
  description,
  sections = [],
  socialLinks = [],
  navLinks = [],
  copyright,
  author,
  className,
}: SiteFooterProps) {
  const { t } = useI18n();
  const licenseText = copyright?.license
    ? t("siteFooter.license", { license: copyright.license })
    : undefined;

  const hasSections = sections.length > 0;

  return (
    <footer className={cn("bg-background border-t", className)}>
      <div className="container mx-auto px-4 py-12 md:py-16">
        {/* Main content grid */}
        <div
          className={cn(
            "grid grid-cols-1 gap-8",
            hasSections
              ? "lg:grid-cols-12 lg:gap-12"
              : "md:grid-cols-2 lg:gap-12",
          )}
        >
          {/* Brand column */}
          <div
            className={cn(
              "flex flex-col gap-4",
              hasSections && "lg:col-span-4",
            )}
          >
            {logo && <div>{logo}</div>}
            {description && (
              <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
                {description}
              </p>
            )}
          </div>

          {/* Right column: Links & Socials (when no sections) or Link sections */}
          {hasSections ? (
            <div className="lg:col-span-8 grid grid-cols-2 gap-8 sm:grid-cols-3 md:grid-cols-4">
              {sections.map((section) => (
                <div key={section.title} className="flex flex-col gap-3">
                  <h3 className="text-foreground font-semibold text-sm">
                    {section.title}
                  </h3>
                  <ul className="flex flex-col gap-2">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <a
                          href={link.href}
                          target={link.external ? "_blank" : undefined}
                          rel={
                            link.external ? "noopener noreferrer" : undefined
                          }
                          className="text-muted-foreground hover:text-primary text-sm transition-colors"
                        >
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col justify-between gap-6 md:items-end">
              {/* Horizontal navigation links */}
              {navLinks.length > 0 && (
                <nav className="flex flex-wrap gap-x-8 gap-y-4 text-sm font-medium">
                  {navLinks.map((link, i) => (
                    <a
                      key={i}
                      href={link.href}
                      target={link.external ? "_blank" : undefined}
                      rel={link.external ? "noopener noreferrer" : undefined}
                      className="hover:text-primary transition-colors"
                    >
                      {link.label}
                    </a>
                  ))}
                </nav>
              )}

              {/* Social icons */}
              {socialLinks.length > 0 && (
                <div className="flex items-center gap-4">
                  {socialLinks.map((social, i) => (
                    <a
                      key={i}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "text-muted-foreground hover:text-foreground",
                        "hover:bg-muted/50 rounded-full p-2",
                        "transition-all duration-200 hover:scale-110",
                      )}
                      title={social.label}
                      aria-label={social.label}
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Social links for sections layout (placed below brand) */}
        {hasSections && socialLinks.length > 0 && (
          <div className="flex items-center gap-4 mt-8">
            {socialLinks.map((social, i) => (
              <a
                key={i}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "text-muted-foreground hover:text-foreground",
                  "hover:bg-muted/50 rounded-full p-2",
                  "transition-all duration-200 hover:scale-110",
                )}
                title={social.label}
                aria-label={social.label}
              >
                {social.icon}
              </a>
            ))}
          </div>
        )}

        {/* Bottom bar */}
        <div className="text-muted-foreground mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-xs md:flex-row">
          {copyright && (
            <p>
              &copy; {new Date().getFullYear()} {copyright.holder}.
              {licenseText ? ` ${licenseText}` : ""}
            </p>
          )}
          {author && (
            <p className="flex items-center gap-1">
              {t("siteFooter.builtWithPrefix")}{" "}
              <span className="text-destructive">&#9829;</span>{" "}
              {t("siteFooter.builtWithSuffix")}{" "}
              {author.href ? (
                <a
                  href={author.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground hover:underline"
                >
                  {author.name}
                </a>
              ) : (
                <span>{author.name}</span>
              )}
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
