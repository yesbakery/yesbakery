"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import styles from "../app/page.module.css";
import {
  getLocalizedProductDescription,
  getLocalizedProductName,
  getMinimumQuantityForProduct,
  products,
  Product,
} from "../lib/catalog";
import { useLanguage } from "./LanguageProvider";
import {
  defaultPickupScheduleSettings,
  getNextAvailableSaturdayPickupDate,
  getNextSaturdayCutoffDate,
  PickupScheduleSettings,
} from "../lib/pickup-scheduling";
import { CartItem, currency, readStoredCart, saveStoredCart } from "../lib/storefront";

type ShopFilter = "all" | "sourdough" | "treats" | "jams";

export function ShopContent() {
  const { language } = useLanguage();
  const [cart, setCart] = useState<CartItem[]>(() => readStoredCart());
  const [activeFilter, setActiveFilter] = useState<ShopFilter>("all");
  const [cartNotice, setCartNotice] = useState<{ id: number; message: string } | null>(null);
  const [hasLoadedCart] = useState(true);
  const [pickupScheduleSettings, setPickupScheduleSettings] = useState<PickupScheduleSettings>(defaultPickupScheduleSettings);
  const [countdownLabel, setCountdownLabel] = useState("");
  const isSpanish = language === "es";

  useEffect(() => {
    if (!hasLoadedCart) {
      return;
    }

    saveStoredCart(cart);
  }, [cart, hasLoadedCart]);

  useEffect(() => {
    let isMounted = true;

    async function loadStorefrontSettings() {
      try {
        const response = await fetch("/api/storefront-settings", {
          cache: "no-store",
        });
        const payload = (await response.json()) as { settings?: PickupScheduleSettings };

        if (isMounted && payload.settings) {
          setPickupScheduleSettings(payload.settings);
        }
      } catch {
        if (isMounted) {
          setPickupScheduleSettings(defaultPickupScheduleSettings);
        }
      }
    }

    void loadStorefrontSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!cartNotice) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCartNotice(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [cartNotice]);

  useEffect(() => {
    function updateCountdown() {
      const cutoff = getNextSaturdayCutoffDate();
      const diff = cutoff.getTime() - Date.now();

      if (diff <= 0) {
        setCountdownLabel(isSpanish ? "El corte esta ocurriendo ahora." : "The cutoff is happening now.");
        return;
      }

      const totalMinutes = Math.floor(diff / 60_000);
      const days = Math.floor(totalMinutes / (60 * 24));
      const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
      const minutes = totalMinutes % 60;

      if (isSpanish) {
        setCountdownLabel(`${days}d ${hours}h ${minutes}m para el corte del jueves a las 6:00 PM PT`);
      } else {
        setCountdownLabel(`${days}d ${hours}h ${minutes}m until Thursday 6:00 PM PT cutoff`);
      }
    }

    updateCountdown();
    const intervalId = window.setInterval(updateCountdown, 60_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isSpanish]);

  function addToCart(productId: string) {
    const product = products.find((entry) => entry.id === productId);
    if (!product) {
      return;
    }
    const minimumQuantity = getMinimumQuantityForProduct(product.id);
    const productName = getLocalizedProductName(product.id, product.name, language);

    setCart((currentCart) => {
      const existingItem = currentCart.find((item) => item.cartKey === product.id);

      if (existingItem) {
        setCartNotice({
          id: Date.now(),
          message: isSpanish
            ? `${productName} fue agregado a su carrito. Cantidad: ${existingItem.quantity + 1}.`
            : `${productName} added to your cart. Quantity: ${existingItem.quantity + 1}.`,
        });
        return currentCart.map((item) =>
          item.cartKey === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      setCartNotice({
        id: Date.now(),
        message: isSpanish
          ? `${productName} fue agregado a su carrito. Cantidad: ${minimumQuantity}.`
          : `${productName} added to your cart. Quantity: ${minimumQuantity}.`,
      });
      return [
        ...currentCart,
        {
          ...product,
          cartKey: product.id,
          quantity: minimumQuantity,
          unitPrice: product.price,
          selectedInclusions: [],
        },
      ];
    });
  }

  function updateQuantity(cartKey: string, nextQuantity: number) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.cartKey === cartKey
            ? { ...item, quantity: Math.max(nextQuantity, getMinimumQuantityForProduct(item.id)) }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  const filteredProducts = useMemo(
    () =>
      products.filter((product) =>
        activeFilter === "all"
          ? true
          : activeFilter === "sourdough"
            ? product.id.startsWith("sourdough")
            : activeFilter === "jams"
              ? product.id.includes("jam")
              : !product.id.startsWith("sourdough") && !product.id.includes("jam"),
      ),
    [activeFilter],
  );

  const productSections = useMemo(() => {
    const buildSection = (title: string, items: Product[]) => ({ title, items });

    if (activeFilter !== "all") {
      return [
        buildSection(
          activeFilter === "sourdough"
            ? isSpanish
              ? "Pan de Masa madre"
              : "Sourdough"
            : activeFilter === "treats"
              ? isSpanish
                ? "Dulces"
                : "Treats"
              : isSpanish
                ? "Mermeladas"
                : "Jams",
          filteredProducts,
        ),
      ];
    }

    return [
      buildSection(
        isSpanish ? "Pan de Masa madre" : "Sourdough",
        filteredProducts.filter((product) => product.id.startsWith("sourdough")),
      ),
      buildSection(
        isSpanish ? "Dulces" : "Treats",
        filteredProducts.filter((product) => !product.id.startsWith("sourdough") && !product.id.includes("jam")),
      ),
      buildSection(
        isSpanish ? "Mermeladas" : "Jams",
        filteredProducts.filter((product) => product.id.includes("jam")),
      ),
    ].filter((section) => section.items.length > 0);
  }, [activeFilter, filteredProducts, isSpanish]);

  const nextSaturdayPickupDate = useMemo(
    () => getNextAvailableSaturdayPickupDate(pickupScheduleSettings),
    [pickupScheduleSettings],
  );

  const nextSaturdayPickupLabel = useMemo(() => {
    if (!nextSaturdayPickupDate) {
      return isSpanish ? "No hay sabados disponibles en este momento." : "No Saturday pickup dates are available right now.";
    }

    return new Intl.DateTimeFormat(isSpanish ? "es-US" : "en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Los_Angeles",
    }).format(new Date(`${nextSaturdayPickupDate}T12:00:00`));
  }, [isSpanish, nextSaturdayPickupDate]);

  return (
    <>
      <section className={styles.pickupSchedulePanel}>
        <div className={styles.pickupSchedulePanelCopy}>
          <p className={styles.pickupScheduleEyebrow}>
            {isSpanish ? "Recogida de Sabado" : "Saturday Pickup"}
          </p>
          <h2>{isSpanish ? "Ordene para recoger este sabado" : "Order for Saturday pickup"}</h2>
          <p>
            {isSpanish
              ? `La proxima fecha disponible es ${nextSaturdayPickupLabel}.`
              : `The next available Saturday pickup date is ${nextSaturdayPickupLabel}.`}
          </p>
          <p className={styles.pickupScheduleRule}>
            {isSpanish
              ? "Los pedidos para este sabado cierran el jueves anterior a las 6:00 PM, hora del Pacifico."
              : "Orders for this Saturday close the prior Thursday at 6:00 PM Pacific time."}
          </p>
        </div>

        <div className={styles.pickupScheduleTimerCard}>
          <span>{isSpanish ? "Tiempo restante" : "Time remaining"}</span>
          <strong>{countdownLabel}</strong>
          <em>
            {isSpanish
              ? "Despues de ese horario, la siguiente fecha disponible cambia al proximo sabado."
              : "After that cutoff, the next available pickup date moves to the following Saturday."}
          </em>
        </div>
      </section>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{isSpanish ? "Tienda" : "Shop"}</p>
          <h1>
            {isSpanish
              ? "Elija los panes y pasteles que desea, y luego vaya al carrito cuando esté listo."
              : "Choose the breads and pastries you want, then head to cart when you are ready."}
          </h1>
          <p className={styles.lede}>
            {isSpanish
              ? "Cada sabor de masa madre ahora es su propio pan, para que los clientes compren exactamente la versión que quieren sin abrir un paso de personalización."
              : "Each sourdough flavor is now its own loaf, so customers can shop the exact version they want without opening a customization step."}
          </p>
        </div>

        <div className={styles.heroFeature}>
          <div className={styles.heroImageWrap}>
            <Image
              src="/assets/products/sourdough/sour_dough-plain.PNG"
              alt="Fresh sourdough bread from Yes Bakery & More"
              fill
              priority
              sizes="(max-width: 900px) 100vw, 42vw"
            />
          </div>
          <div className={styles.heroNote}>
            <span>{isSpanish ? "Favorito de la Panadería" : "Bakery Favorite"}</span>
            <strong>{isSpanish ? "Pan de Masa madre" : "Sourdough"}</strong>
            <em>
              {currency.format(10)} {isSpanish ? "cada uno" : "each"}
            </em>
          </div>
        </div>
      </section>

      <section className={styles.shopToolbarSection}>
        <div className={styles.shopToolbar}>
          <div className={styles.shopFilters} aria-label="Shop filters">
            {[
              { id: "all", label: isSpanish ? "Todo" : "All" },
              { id: "sourdough", label: isSpanish ? "Pan de Masa madre" : "Sourdough" },
              { id: "treats", label: isSpanish ? "Dulces" : "Treats" },
              { id: "jams", label: isSpanish ? "Mermeladas" : "Jams" },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`${styles.filterPill} ${activeFilter === filter.id ? styles.filterPillActive : ""}`}
                onClick={() => setActiveFilter(filter.id as ShopFilter)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <p className={styles.kicker}>{isSpanish ? "Menú" : "Menu"}</p>
          <h2>{isSpanish ? "Recién salido de la panadería" : "Fresh from the bakery"}</h2>
        </div>

        {productSections.map((section, sectionIndex) => (
          <div key={section.title} className={styles.shopCategorySection}>
            <div className={styles.shopCategoryDivider}>
              <span>{section.title}</span>
            </div>

            <div className={styles.homeFavoritesGrid}>
              {section.items.map((product, index) => {
                const matchingItems = cart.filter((item) => item.id === product.id);
                const productCount = matchingItems.reduce((total, item) => total + item.quantity, 0);
                const minimumQuantity = getMinimumQuantityForProduct(product.id);
                const productName = getLocalizedProductName(product.id, product.name, language);
                const productDescription = getLocalizedProductDescription(product.id, product.description, language);

                return (
                  <article
                    key={product.id}
                    className={`${styles.card} ${styles.homeFavoriteCard}`}
                    style={{ animationDelay: `${(sectionIndex * 4 + index) * 120}ms` }}
                  >
                    <div className={`${styles.homeFavoriteImageWrap} ${styles.shopFavoriteImageWrap}`}>
                      <Image src={product.image} alt={productName} fill sizes="(max-width: 900px) 100vw, 50vw" />
                    </div>
                    <div className={styles.homeFavoriteBody}>
                      <div className={styles.cardHeading}>
                        <h3>{productName}</h3>
                        <span className={styles.price}>{currency.format(product.price)}</span>
                      </div>
                      {product.id === "cinnamon-rolls" ||
                      product.id === "empanada" ||
                      product.id === "gluten-free-chocolate-chip-cookies" ? (
                        <div className={styles.eachPricePill}>{isSpanish ? "Cada Uno" : "Per Each"}</div>
                      ) : null}
                      <p>{productDescription}</p>
                      {minimumQuantity > 1 ? (
                        <div className={styles.minimumOrderNote}>
                          {isSpanish ? `Mínimo ${minimumQuantity}` : `Minimum ${minimumQuantity}`}
                        </div>
                      ) : null}

                      <div className={styles.cardActions}>
                        <button type="button" className={styles.addButton} onClick={() => addToCart(product.id)}>
                          {isSpanish ? "Agregar al Carrito" : "Add to Cart"}
                        </button>

                        {productCount > 0 ? (
                          <div className={styles.inlineQty}>
                            <button
                              type="button"
                              className={styles.qtyButton}
                              onClick={() => updateQuantity(product.id, productCount - 1)}
                              aria-label={
                                isSpanish
                                  ? `Disminuir cantidad de ${productName}`
                                  : `Decrease ${productName} quantity`
                              }
                              disabled={productCount <= minimumQuantity}
                            >
                              -
                            </button>
                            <span>{productCount}</span>
                            <button
                              type="button"
                              className={styles.qtyButton}
                              onClick={() => updateQuantity(product.id, productCount + 1)}
                              aria-label={
                                isSpanish
                                  ? `Aumentar cantidad de ${productName}`
                                  : `Increase ${productName} quantity`
                              }
                            >
                              +
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 ? (
          <div className={styles.emptyShopState}>
            <strong>{isSpanish ? "No se encontraron resultados." : "No matches found."}</strong>
            <p>{isSpanish ? "Pruebe con otro filtro." : "Try a different filter."}</p>
          </div>
        ) : null}
      </section>

      {cartNotice ? (
        <div key={cartNotice.id} className={styles.cartToast} role="status" aria-live="polite">
          <strong>{cartNotice.message}</strong>
          <Link href="/cart">{isSpanish ? "Ver Carrito" : "View Cart"}</Link>
        </div>
      ) : null}
    </>
  );
}
