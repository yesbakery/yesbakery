"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren, useEffect, useState } from "react";
import styles from "../app/page.module.css";
import { useLanguage } from "./LanguageProvider";
import { CART_UPDATED_EVENT, getStoredCartItemCount } from "../lib/storefront";

export function SiteShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [itemCount, setItemCount] = useState(0);
  const isSpanish = language === "es";
  const navItems = [
    { href: "/", label: isSpanish ? "Inicio" : "Home" },
    { href: "/shop", label: isSpanish ? "Tienda" : "Shop" },
    { href: "/about", label: isSpanish ? "Sobre Nosotros" : "About Us" },
  ];

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

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <header className={styles.navbar}>
          <Link className={styles.brand} href="/" aria-label="Yes Bakery & More home">
            <Image
              src="/assets/new_logo.PNG"
              alt="Yes Bakery & More logo"
              width={363}
              height={182}
              className={styles.brandLogo}
            />
          </Link>

          <div className={styles.navActions}>
            <a className={styles.contactPill} href="tel:5103298786">
              {isSpanish ? "Llame 510-329-8786" : "Call/Text 510-329-8786"}
            </a>

            <button
              type="button"
              className={styles.languageToggle}
              onClick={() => setLanguage(isSpanish ? "en" : "es")}
              aria-label={isSpanish ? "Switch to English" : "Cambiar a español"}
            >
              <span aria-hidden="true">{isSpanish ? "🇺🇸" : "🇪🇸"}</span>
              <strong>{isSpanish ? "EN" : "ES"}</strong>
            </button>

            <Link
              className={styles.mobileCartButton}
              href="/cart"
              aria-label={`${isSpanish ? "Carrito" : "Cart"} with ${itemCount} items`}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.mobileCartIcon}>
                <path
                  d="M3 5h2l1.2 6.2A2 2 0 0 0 8.2 13H17a2 2 0 0 0 1.9-1.4L21 7H7.1"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="19" r="1.7" fill="currentColor" />
                <circle cx="17" cy="19" r="1.7" fill="currentColor" />
              </svg>
              <span>{itemCount}</span>
            </Link>

            <button
              type="button"
              className={`${styles.menuToggle} ${isMobileMenuOpen ? styles.menuToggleOpen : ""}`}
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              aria-expanded={isMobileMenuOpen}
              aria-controls="primary-navigation"
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.menuToggleGrid}>
                <circle cx="7" cy="7" r="2.1" />
                <circle cx="17" cy="7" r="2.1" />
                <circle cx="7" cy="17" r="2.1" />
                <circle cx="17" cy="17" r="2.1" />
              </svg>
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.menuToggleCloseIcon}>
                <path
                  d="M7 7l10 10M17 7L7 17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
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
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}

              <Link className={styles.mobileCartBadge} href="/cart" onClick={() => setIsMobileMenuOpen(false)}>
                {isSpanish ? "Carrito" : "Cart"}
                <span>{itemCount}</span>
              </Link>
            </nav>

            <Link className={styles.cartBadge} href="/cart">
              {isSpanish ? "Carrito" : "Cart"}
              <span>{itemCount}</span>
            </Link>
          </div>
        </header>

        {children}

        <footer className={styles.siteFooter}>
          <div className={styles.footerSocials} aria-label="Yes Bakery social links">
            <a
              href="https://www.instagram.com/yesbakery"
              target="_blank"
              rel="noreferrer"
              className={styles.footerSocialLink}
              aria-label="Visit Yes Bakery on Instagram"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.footerSocialIcon}>
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.4" cy="6.6" r="1.2" />
              </svg>
              <span>Instagram</span>
            </a>
            <a
              href="https://www.facebook.com/YesBakeryandMore/"
              target="_blank"
              rel="noreferrer"
              className={styles.footerSocialLink}
              aria-label="Visit Yes Bakery on Facebook"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" className={styles.footerSocialIcon}>
                <circle cx="12" cy="12" r="9" />
                <path d="M13.4 20v-7h2.3l.4-2.7h-2.7V8.6c0-.8.2-1.3 1.4-1.3h1.5V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.7 1.3-3.7 3.7v1.9H8v2.7h2.4v7" />
              </svg>
              <span>Facebook</span>
            </a>
          </div>

          <a className={styles.footerPhoneLink} href="tel:5103298786">
            {isSpanish ? "Llame o envie texto 510-329-8786" : "Call or text 510-329-8786"}
          </a>

          <div className={styles.siteCredit}>
            <div className={styles.siteCreditMeta}>
              <a
                href="https://webrandca.com"
                target="_blank"
                rel="noreferrer"
                className={styles.siteCreditLink}
                aria-label="Website created by WeBrandCA"
              >
                <span>Website created by WeBrandCA</span>
                <Image
                  src="/WEBrandLogo-f.png"
                  alt="WeBrandCA logo"
                  width={840}
                  height={806}
                  className={styles.siteCreditLogo}
                />
              </a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
