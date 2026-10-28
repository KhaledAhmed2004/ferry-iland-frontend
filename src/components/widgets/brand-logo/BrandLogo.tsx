"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  title?: ReactNode;
  subtitle?: string;
  href?: string;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  priority?: boolean;
  onClick?: () => void;
}

export function BrandLogo({
  size = "md",
  showText = true,
  title,
  subtitle = "Book • Travel • Explore",
  href = "/",
  className,
  iconClassName,
  textClassName,
  priority = true,
  onClick
}: BrandLogoProps) {
  const sizeMap = {
    sm: { px: 28, imgClass: "h-7 w-7 rounded-lg", titleClass: "text-base", subClass: "text-[8.5px] tracking-normal" },
    md: { px: 36, imgClass: "h-9 w-9 rounded-xl", titleClass: "text-xl", subClass: "text-[9.5px] tracking-wide" },
    lg: { px: 44, imgClass: "h-11 w-11 rounded-xl", titleClass: "text-2xl", subClass: "text-xs tracking-wider" }
  };

  const currentSize = sizeMap[size];

  const content = (
    <div className={cn("group flex items-center gap-2.5 select-none", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center overflow-hidden shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105",
          currentSize.imgClass,
          iconClassName
        )}
      >
        <Image
          src="/logo.png"
          alt="IslandHop Logo"
          width={currentSize.px}
          height={currentSize.px}
          priority={priority}
          className="h-full w-full object-contain"
        />
      </div>

      {showText && (
        <div className={cn("flex flex-col", textClassName)}>
          <span
            className={cn(
              "text-foreground font-extrabold tracking-tight leading-none",
              currentSize.titleClass
            )}
          >
            {title || (
              <>
                Island<span className="text-blue-600 dark:text-blue-400">Hop</span>
              </>
            )}
          </span>
          {subtitle && (
            <span
              className={cn(
                "font-semibold uppercase tracking-widest text-muted-foreground/80 leading-tight mt-0.5",
                currentSize.subClass
              )}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className="inline-flex items-center">
        {content}
      </Link>
    );
  }

  return content;
}
