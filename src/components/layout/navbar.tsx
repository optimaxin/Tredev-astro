"use client";

import Link from "next/link";
import { Menu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OmMark } from "@/components/ui/om-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { navLanguages, navSpecializations, freeToolsMenu, storeMenu } from "@/lib/mock-data";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-wide">
          <OmMark className="text-2xl" />
          <span>Cosmic<span className="text-[var(--color-gold)]">Connect</span></span>
        </Link>

        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="/" />}>Home</NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Talk to Astrologer</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[520px] grid-cols-2 gap-6 p-4">
                  <MenuColumn title="By Language" items={navLanguages.slice(0, 6)} />
                  <MenuColumn title="By Specialization" items={navSpecializations.slice(0, 6)} />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="/chat-with-astrologer" />}>Chat</NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Free Tools</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[560px] grid-cols-2 gap-6 p-4">
                  {Object.entries(freeToolsMenu).map(([title, items]) => (
                    <MenuColumn key={title} title={title} items={items} />
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="/horoscope/daily" />}>Horoscope</NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Store</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[520px] grid-cols-2 gap-6 p-4">
                  {Object.entries(storeMenu).slice(0, 2).map(([title, items]) => (
                    <MenuColumn key={title} title={title} items={items} />
                  ))}
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="/blog" />}>Blog</NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            variant="ghost"
            className="hidden sm:inline-flex"
            render={<Link href="/login" />}
          >
            Login
          </Button>
          <Button
            className="hidden gap-1.5 sm:inline-flex animate-glow-pulse"
            render={<Link href="/talk-to-astrologer" />}
          >
            <Sparkles className="size-4" /> Talk Now
          </Button>

          <Sheet>
            <SheetTrigger
              render={
                <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />
              }
            >
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="px-4 pt-4">Menu</SheetTitle>
              <nav className="flex flex-col gap-1 p-4">
                {[
                  ["Home", "/"],
                  ["Talk to Astrologer", "/talk-to-astrologer"],
                  ["Chat with Astrologer", "/chat-with-astrologer"],
                  ["Free Kundli", "/free-kundli"],
                  ["Kundli Matching", "/kundli-matching"],
                  ["Daily Horoscope", "/horoscope/daily"],
                  ["Store", "/shop"],
                  ["Blog", "/blog"],
                  ["Login", "/login"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                  >
                    {label}
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

function MenuColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-muted-foreground">{title}</p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item}>
            <NavigationMenuLink
              render={<Link href="#" className="text-sm hover:text-[var(--color-gold)]" />}
            >
              {item}
            </NavigationMenuLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
