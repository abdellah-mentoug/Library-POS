"use client";

import { signOut } from "@/lib/actions/auth-actions";
import type { AuthUser } from "@/lib/auth";
import { useTranslations } from "@/lib/i18n/use-translations";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Moon, Sun, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface TopbarProps {
  user: AuthUser;
}

export function Topbar({ user }: TopbarProps) {
  const t = useTranslations("common");
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const initials = user.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-card/80 backdrop-blur-md px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">
          Welcome back, {user.fullName.split(" ")[0]}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        {mounted && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 transition-all duration-200 hover:bg-accent/50"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-3 h-10 px-3 hover:bg-accent/50 transition-colors">
              <Avatar className="h-8 w-8 ring-2 ring-border/50">
                <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:flex flex-col items-start">
                <span className="text-sm font-medium">{user.fullName}</span>
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  {user.role}
                </Badge>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 animate-scale-in">
            <DropdownMenuLabel className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <div>
                <p className="text-sm font-medium">{user.fullName}</p>
                <Badge variant="outline" className="mt-1 text-xs">
                  {user.role}
                </Badge>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => signOut()}
              className="cursor-pointer text-destructive focus:text-destructive hover:bg-destructive/10"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {t.signOut}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
