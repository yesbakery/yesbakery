"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "../app/page.module.css";
import { currency } from "../lib/storefront";

const slides = [
  {
    id: "plain-sourdough-hero",
    name: "Plain Sourdough",
    price: 10,
    description:
      "Our signature loaf with a crisp crust and tender crumb, prepared for simple breakfasts, soups, and family tables.",
    image: "/assets/images/sour_dough-plain.PNG",
  },
  {
    id: "many-sourdoughs",
    name: "Sourdough Collection",
    price: 10,
    description:
      "A look at the bakery's sourdough lineup, from plain loaves to the specialty flavors now offered individually in the shop.",
    image: "/assets/images/many-sours.jpg",
  },
  {
    id: "bakery-spread",
    name: "Bakery Favorites",
    price: 12,
    description:
      "A rotating look at the breads and sweet comforts coming out of the bakery, from classic loaves to specialty bakes.",
    image: "/assets/images/IMG_3012.jpg",
  },
];

export function HomeSlideshow() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 5000);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section className={styles.slideshowHero}>
      {slides.map((slide, index) => {
        const isActive = index === activeIndex;

        return (
          <div
            key={slide.id}
            className={`${styles.slidePanel} ${isActive ? styles.slidePanelActive : ""}`}
            aria-hidden={!isActive}
          >
            <Image
              src={slide.image}
              alt={slide.name}
              fill
              priority={index === 0}
              sizes="100vw"
              className={styles.slideImage}
            />

            <div className={styles.slideShade} />

            <div className={styles.slideCopy}>
              <p className={styles.kicker}>Yes Bakery & More</p>
              <h1>{slide.name}</h1>
              <p className={styles.lede}>{slide.description}</p>

              <div className={styles.heroActions}>
                <Link className={styles.primaryCta} href="/shop">
                  Shop the Menu
                </Link>
                <Link className={styles.secondaryCta} href="/cart">
                  View Cart
                </Link>
              </div>
            </div>

            <div className={styles.slideBadge}>
              <span>Featured Bake</span>
              <strong>{slide.name}</strong>
              <em>{currency.format(slide.price)}</em>
            </div>
          </div>
        );
      })}

      <div className={styles.slideDots} aria-label="Slideshow progress">
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={`${styles.slideDot} ${index === activeIndex ? styles.slideDotActive : ""}`}
            onClick={() => setActiveIndex(index)}
            aria-label={`Show ${slide.name}`}
          />
        ))}
      </div>
    </section>
  );
}
