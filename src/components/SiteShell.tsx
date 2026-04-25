"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";
import styles from "../app/page.module.css";
import { CART_UPDATED_EVENT, getStoredCartItemCount } from "../lib/storefront";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About Us" },
];

export function SiteShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [itemCount, setItemCount] = useState(0);

  useEffect(() => {
    const syncCartCount = () => {
      setItemCount(getStoredCartItemCount());
    };

    syncCartCount();
    window.addEventListener("storage", syncCartCount);
    window.addEventListener(CART_UPDATED_EVENT, syncCartCount);

    return () => {
      window.removeEventListener("storage", syncCartCount);
      window.removeEventListener(CART_UPDATED_EVENT, syncCartCount);
    };
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.navbar}>
          <Link className={styles.brand} href="/" aria-label="Yes Bakery & More home">
            <Image
              src="/assets/yesbakery_logo.PNG"
              alt="Yes Bakery & More logo"
              width={220}
              height={110}
              className={styles.brandLogo}
            />
          </Link>

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.menuToggle}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="primary-navigation"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <span />
              <span />
              <span />
            </button>

            <nav
              id="primary-navigation"
              className={`${styles.navLinks} ${isMobileMenuOpen ? styles.navLinksOpen : ""}`}
              aria-label="Primary"
            >
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={pathname === item.href ? styles.navLinkActive : ""}
                >
                  {item.label}
                </Link>
              ))}

              <Link className={styles.mobileCartBadge} href="/cart">
                Cart
                <span>{itemCount}</span>
              </Link>
            </nav>

            <Link className={styles.cartBadge} href="/cart">
              Cart
              <span>{itemCount}</span>
            </Link>
          </div>
        </header>

        {children}
      </div>
    </main>
  );
}
