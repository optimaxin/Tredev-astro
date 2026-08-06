"use client";

import Link from "next/link";
import { Menu, Search, Sparkles, MessagesSquare, Sun, Store, Users2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OmMark } from "@/components/ui/om-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
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

const mobileGroups = [
  {
    title: "Consult",
    items: [
      { icon: MessagesSquare, label: "Talk to Astrologer", href: "/talk-to-astrologer" },
      { icon: MessagesSquare, label: "Chat with a Guru", href: "/chat-with-astrologer" },
    ],
  },
  {
    title: "Free Tools",
    items: [
      { icon: Sun, label: "Free Kundli", href: "/free-kundli" },
      { icon: Sun, label: "Kundli Matching", href: "/kundli-matching" },
      { icon: Sun, label: "Daily Horoscope", href: "/horoscope/daily" },
    ],
  },
  {
    title: "More",
    items: [
      { icon: Store, label: "Shop", href: "/shop" },
      { icon: Users2, label: "Community", href: "/community" },
      { icon: BookOpen, label: "Blog", href: "/blog" },
    ],
  },
];

export function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-full border border-[var(--color-sindoor)]/50 text-[var(--color-sindoor)]">
            <OmMark className="text-base" />
          </span>
          <span className="hidden font-heading text-lg tracking-wide sm:inline">
            Astro<span className="text-[var(--color-marigold)] italic">Tredev</span>
          </span>
        </Link>

        <div className="hidden max-w-md flex-1 items-center gap-2 rounded-full border bg-foreground/5 px-4 py-2 text-sm text-muted-foreground md:flex">
          <Search className="size-4 shrink-0" />
          <input
            type="text"
            placeholder="Search astrologers, remedies, poojas..."
            className="w-full bg-transparent outline-none placeholder:text-muted-foreground"
          />
        </div>

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
              <NavigationMenuTrigger>Free Tools</NavigationMenuTrigger>
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
                  <MenuColumn title="Premium Services" items={premiumServices.map((s) => s.label)} />
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

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-block">
            Sign in
          </Link>
          <Button
            className="hidden gap-1.5 rounded-full border border-[var(--color-marigold)]/60 bg-[var(--color-marigold)]/10 text-[var(--color-marigold)] hover:bg-[var(--color-marigold)]/20 sm:inline-flex"
            render={<Link href="/talk-to-astrologer" />}
          >
            <Sparkles className="size-4" /> Talk Now
          </Button>

          <Sheet>
            <SheetTrigger render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-80">
              <SheetTitle className="px-4 pt-4">Menu</SheetTitle>
              <div className="p-4">
                <Button className="w-full gap-1.5 animate-glow-pulse" render={<Link href="/talk-to-astrologer" />}>
                  <Sparkles className="size-4" /> Talk Now — First 3 Min Free
                </Button>
              </div>
              <nav className="space-y-5 px-4 pb-4">
                {mobileGroups.map((group) => (
                  <div key={group.title}>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.title}</p>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <Link
                          key={item.href}
                          href={item.href}
                          className="flex items-center gap-3 rounded-xl border p-3 text-sm font-medium transition-colors hover:border-[var(--color-marigold)]"
                        >
                          <span className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-marigold)]/10 text-[var(--color-marigold)]">
                            <item.icon className="size-4" />
                          </span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                <Link href="/login" className="block rounded-xl px-3 py-2 text-sm font-medium hover:bg-accent">Login</Link>
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
          className="flex items-center justify-between rounded-b-lg bg-gradient-to-r from-[var(--color-sindoor)] to-[var(--color-marigold)] px-5 py-3 text-sm font-semibold text-white hover:opacity-90"
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
            <NavigationMenuLink render={<Link href="#" className="text-sm hover:text-[var(--color-marigold)]" />}>
              {item}
            </NavigationMenuLink>
          </li>
        ))}
      </ul>
    </div>
  );
}
