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
import {
  navLanguages,
  navSpecializations,
  navTiers,
  freeToolsMenu,
  storeMenu,
  premiumServices,
  communityMenu,
  knowledgeMenu,
} from "@/lib/mock-data";

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-display text-lg tracking-wide">
          <OmMark className="text-2xl" />
          <span>Astro<span className="text-[var(--color-gold)]">Tredev</span></span>
        </Link>

        <NavigationMenu className="hidden lg:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="/" />}>Home</NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Consult Experts</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[680px]">
                  <div className="grid grid-cols-3 gap-6 p-5">
                    <MenuColumn title="By Language" items={navLanguages.slice(0, 6)} />
                    <MenuColumn title="By Specialization" items={navSpecializations.slice(0, 6)} />
                    <MenuColumn title="By Guru Tier" items={navTiers} />
                  </div>
                  <MenuCta href="/talk-to-astrologer" label="View All Gurus — First 3 Min Free" />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Divine Tools</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[600px]">
                  <div className="grid grid-cols-2 gap-6 p-5">
                    {Object.entries(freeToolsMenu).map(([title, items]) => (
                      <MenuColumn key={title} title={title} items={items} />
                    ))}
                  </div>
                  <MenuCta href="/free-kundli" label="Generate Your Free Kundli" />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Premium</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[300px] p-5">
                  <MenuColumn
                    title="Premium Services"
                    items={premiumServices.map((s) => s.label)}
                  />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Shop</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[560px]">
                  <div className="grid grid-cols-3 gap-6 p-5">
                    {Object.entries(storeMenu).map(([title, items]) => (
                      <MenuColumn key={title} title={title} items={items.slice(0, 5)} />
                    ))}
                  </div>
                  <MenuCta href="/shop" label="Kundli-Based Recommendations" />
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Community</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="grid w-[440px] grid-cols-2 gap-6 p-5">
                  <MenuColumn title="Community" items={communityMenu.map((c) => c.label)} />
                  <MenuColumn title="Knowledge" items={knowledgeMenu.map((k) => k.label)} />
                </div>
              </NavigationMenuContent>
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
                  ["Consult Experts", "/talk-to-astrologer"],
                  ["Chat with a Guru", "/chat-with-astrologer"],
                  ["Free Kundli", "/free-kundli"],
                  ["Kundli Matching", "/kundli-matching"],
                  ["Daily Horoscope", "/horoscope/daily"],
                  ["Premium Services", "/premium-kundli/order"],
                  ["Shop", "/shop"],
                  ["Community", "/community"],
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

function MenuCta({ href, label }: { href: string; label: string }) {
  return (
    <NavigationMenuLink
      render={
        <Link
          href={href}
          className="flex items-center justify-between rounded-b-lg bg-gradient-to-r from-[var(--color-cta)] to-[var(--color-gold)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
        />
      }
    >
      {label}
      <span>→</span>
    </NavigationMenuLink>
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
