"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import styles from "../app/page.module.css";
import { useLanguage } from "./LanguageProvider";
import { ContactForm, initialContactForm } from "../lib/storefront";

export function AboutContent() {
  const { language } = useLanguage();
  const [contactForm, setContactForm] = useState<ContactForm>(initialContactForm);
  const [contactError, setContactError] = useState("");
  const [contactSuccessMessage, setContactSuccessMessage] = useState("");
  const [isSendingContactForm, setIsSendingContactForm] = useState(false);
  const isSpanish = language === "es";

  async function handleContactSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setContactError("");
    setContactSuccessMessage("");
    setIsSendingContactForm(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(contactForm),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.error || (isSpanish ? "No pudimos enviar su mensaje en este momento." : "We couldn't send your message right now."),
        );
      }

      setContactSuccessMessage(
        isSpanish
          ? "Gracias. Su mensaje fue enviado a nuestro equipo y le daremos seguimiento sobre su pedido, solicitud de envío o detalles de su evento especial."
          : "Thank you. Your message was sent to our team and we will follow up about your order, shipping request, or special event details.",
      );
      setContactForm(initialContactForm);
    } catch (error) {
      setContactError(
        error instanceof Error
          ? error.message
          : isSpanish
            ? "No pudimos enviar su mensaje en este momento."
            : "We couldn't send your message right now.",
      );
    } finally {
      setIsSendingContactForm(false);
    }
  }

  return (
    <>
      <section className={styles.storySection}>
        <div className={styles.storyCard}>
          <div className={styles.storyText}>
            <p className={styles.kicker}>{isSpanish ? "Sobre Nosotros" : "About Us"}</p>
            <h2>{isSpanish ? "Horneado con cuidado, memoria y amor por compartir buena comida" : "Baked with care, memory, and a love for sharing good food"}</h2>
            <p>
              {isSpanish
                ? "Yes Bakery & More gira alrededor de panes cálidos, repostería para la mesa familiar y esa comodidad casera que invita a bajar el ritmo y reunirse."
                : "Yes Bakery & More is built around warm breads, family-table pastries, and the kind of homemade comfort that invites people to slow down and gather."}
            </p>
            <p>
              {isSpanish
                ? "La recogida se realiza en Union City, California. El envío puede revisarse caso por caso, según el producto y el destino."
                : "Pickup is based in Union City, California. Shipping can be reviewed case by case, depending on the item and destination."}
            </p>
          </div>

          <div className={styles.storyLogoPanel}>
            <Image
              src="/assets/new_logo.PNG"
              alt="Yes Bakery & More logo"
              width={858}
              height={429}
              className={styles.storyLogo}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.storyCard}>
          <div className={styles.storyText}>
            <p className={styles.kicker}>{isSpanish ? "Contacto" : "Contact"}</p>
            <h2>{isSpanish ? "¿Está planeando un pedido especial o desea coordinar un envío?" : "Planning a special order or hoping to arrange shipping?"}</h2>
            <p>
              {isSpanish
                ? "Escríbanos para pedidos de celebración, solicitudes personalizadas, pedidos grandes para recoger o preguntas sobre envíos. Con gusto revisaremos los detalles y le diremos qué podemos organizar."
                : "Reach out for celebration orders, custom requests, larger bakery pickups, or shipping questions. We will gladly review the details and let you know what can be arranged."}
            </p>
            <p>
              {isSpanish
                ? "Si ya sabe lo que desea pedir, también puede usar la página del carrito para solicitar un arreglo de envío directamente desde sus productos seleccionados."
                : "If you already know what you want to order, you can also use the cart page to request a shipping arrangement directly from your selected items."}
            </p>
          </div>

          <div className={styles.checkoutCard}>
            <p className={styles.kicker}>{isSpanish ? "Enviar Mensaje" : "Send a Message"}</p>
            <h2>{isSpanish ? "Cuéntenos qué necesita" : "Let us know what you need"}</h2>
            <form className={styles.checkoutForm} onSubmit={handleContactSubmit}>
              <label>
                {isSpanish ? "Nombre Completo" : "Full Name"}
                <input
                  type="text"
                  value={contactForm.fullName}
                  onChange={(event) =>
                    setContactForm((current) => ({ ...current, fullName: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                {isSpanish ? "Correo Electrónico" : "Email"}
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(event) =>
                    setContactForm((current) => ({ ...current, email: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                {isSpanish ? "Teléfono" : "Phone"}
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(event) =>
                    setContactForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>

              <label>
                {isSpanish ? "Mensaje" : "Message"}
                <textarea
                  rows={5}
                  value={contactForm.message}
                  onChange={(event) =>
                    setContactForm((current) => ({ ...current, message: event.target.value }))
                  }
                  placeholder={
                    isSpanish
                      ? "Cuéntenos sobre la fecha de su evento, cantidad, sabores, horario de recogida o solicitud de envío."
                      : "Tell us about your event date, quantity, flavors, pickup timing, or shipping request."
                  }
                  required
                />
              </label>

              <button type="submit" className={styles.submitButton}>
                {isSendingContactForm ? (isSpanish ? "Enviando..." : "Sending...") : isSpanish ? "Enviar Mensaje" : "Send Message"}
              </button>
            </form>

            {contactError ? (
              <div className={styles.successMessage}>
                <strong>{isSpanish ? "No se pudo enviar el mensaje." : "Message could not be sent."}</strong>
                <p>{contactError}</p>
              </div>
            ) : null}

            {contactSuccessMessage ? (
              <div className={styles.successMessage}>
                <strong>{isSpanish ? "Mensaje recibido." : "Message received."}</strong>
                <p>{contactSuccessMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
