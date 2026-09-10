"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";
import { useState } from "react";
import {
  appSettingsNav,
  isNavItemActive,
} from "@/components/shell/nav-config";
import { Button } from "@/components/ui/button";
import {
  PopoverContent,
  PopoverRoot,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserAvatar } from "@/components/user/user-avatar";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { staffPath } from "@/lib/paths";

export function AccountMenu({
  userName,
  userEmail,
  userImage,
  userSlug,
}: {
  userName: string;
  userEmail: string;
  userImage?: string | null;
  userSlug?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const settingsActive = isNavItemActive(pathname, appSettingsNav.href);

  async function onLogout() {
    setLoggingOut(true);
    await authClient.signOut();
    router.replace("/inloggen");
    router.refresh();
  }

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-label="Account"
            aria-haspopup="dialog"
            className={cn("size-11 sm:size-11", settingsActive && "text-fg")}
          />
        }
      >
        <UserAvatar name={userName} image={userImage} size="sm" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={8}
        className="w-64 p-1 shadow-[var(--shadow-xs)]"
      >
        <div className="px-2 py-2">
          {userSlug ? (
            <Link
              href={staffPath({ slug: userSlug })}
              className="block truncate text-sm font-medium text-fg hover:underline"
              onClick={() => setOpen(false)}
            >
              {userName}
            </Link>
          ) : (
            <p className="truncate text-sm font-medium text-fg">{userName}</p>
          )}
          <p className="truncate text-xs text-fg-subtle">{userEmail}</p>
        </div>
        <Link
          href={appSettingsNav.href}
          aria-current={settingsActive ? "page" : undefined}
          onClick={() => setOpen(false)}
          className={cn(
            "flex min-h-11 items-center gap-2 rounded-sm px-2 text-sm text-fg-muted hover:bg-hover hover:text-fg",
            settingsActive && "font-medium text-fg",
          )}
        >
          <Settings className="size-4" aria-hidden />
          Instellingen
        </Link>
        <button
          type="button"
          disabled={loggingOut}
          onClick={() => {
            void onLogout();
          }}
          className="flex min-h-11 w-full items-center gap-2 rounded-sm px-2 text-sm text-fg-muted hover:bg-hover hover:text-fg disabled:opacity-45"
        >
          <LogOut className="size-4" aria-hidden />
          {loggingOut ? "Bezig…" : "Uitloggen"}
        </button>
      </PopoverContent>
    </PopoverRoot>
  );
}
