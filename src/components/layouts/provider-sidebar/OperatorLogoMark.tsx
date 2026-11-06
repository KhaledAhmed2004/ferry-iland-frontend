"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/ui";

/**
 * The signed-in operator's company logo for the portal brand; the company's first letter
 * when no logo was uploaded. A plain <img> (Avatar), since uploaded logos are not on
 * next/image's allowed hosts.
 */
export function OperatorLogoMark({
  companyName,
  logoUrl
}: {
  companyName: string;
  logoUrl?: string | null;
}) {
  return (
    <Avatar className="size-full rounded-full">
      {logoUrl && (
        <AvatarImage src={logoUrl} alt={`${companyName} logo`} className="object-cover" />
      )}
      <AvatarFallback className="rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-600 dark:text-emerald-400">
        {(companyName.trim().charAt(0) || "O").toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
