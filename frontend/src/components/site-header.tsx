"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Главная" },
  { href: "/search", label: "Поиск" },
  { href: "/profile", label: "Профиль" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const currentTheme = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(currentTheme);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("theme", nextTheme);
  }

  return (
    <header className="siteHeader">
      <div className="siteHeaderInner">
        <Link className="siteBrand" href="/">
          <span className="siteBrandMark">CL</span>
          <span className="siteBrandText">
            <strong>Completion List</strong>
            <small>IGDB game tracker</small>
          </span>
        </Link>

        <nav className="siteNav" aria-label="Основная навигация">
          {navItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                className={isActive ? "siteNavLink siteNavLinkActive" : "siteNavLink"}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <button className="siteThemeToggle" onClick={toggleTheme} type="button">
          {theme === "dark" ? "Light theme" : "Dark theme"}
        </button>
      </div>
    </header>
  );
}
