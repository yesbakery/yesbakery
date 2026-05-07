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
            <h2>
              {isSpanish
                ? "Una historia de pasión, creatividad y momentos compartidos a través de la repostería"
                : "A story of passion, creativity, and shared moments through baking"}
            </h2>
            <p>
              {isSpanish
                ? "Mi camino en la repostería comenzó hace más de 25 años con un amor sencillo por crear postres y compartirlos con las personas a mi alrededor."
                : "My baking journey began over 25 years ago with a simple love for creating desserts and sharing them with the people around me."}
            </p>
            <p>
              {isSpanish
                ? "Lo que empezó como una pasión poco a poco se convirtió en algo mucho más grande: un espacio donde la creatividad, la comodidad y la felicidad se unen a través de la comida. Siempre he creído que hornear es más que hacer postres; se trata de crear momentos que la gente recuerda."
                : "What started as a passion slowly became something much bigger — a place where creativity, comfort, and happiness come together through food. I’ve always believed that baking is more than just making desserts; it’s about creating moments people remember."}
            </p>
            <p>
              {isSpanish
                ? "Cada hora que paso en la cocina es algo que disfruto de verdad. Desde probar recetas hasta sacar productos recién horneados del horno, este negocio está construido con dedicación, corazón y un amor genuino por lo que hago."
                : "Every hour spent in the kitchen is something I genuinely enjoy. From testing recipes to pulling fresh baked goods out of the oven, this business is built with dedication, heart, and a true love for what I do."}
            </p>
            <p>
              {isSpanish
                ? "En YesBakery, cada producto se hace con cuidado, atención al detalle y la esperanza de que cada bocado lleve un poco de felicidad al día de alguien."
                : "At YesBakery, every product is made with care, attention to detail, and the hope that each bite brings a little happiness to someone’s day."}
            </p>
            <p>
              {isSpanish
                ? "Gracias por estar aquí, por apoyar mi pequeño negocio y por permitirme compartir con usted algo que realmente amo."
                : "Thank you for being here, supporting my small business, and allowing me to share something I truly love with you."}
            </p>
            <p>
              <strong>
                {isSpanish
                  ? "— Yessica Gonzalez, Fundadora de YesBakery"
                  : "— Yessica Gonzalez, Founder of YesBakery"}
              </strong>
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
