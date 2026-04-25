"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import styles from "../app/page.module.css";
import { ContactForm, initialContactForm } from "../lib/storefront";

export function AboutContent() {
  const [contactForm, setContactForm] = useState<ContactForm>(initialContactForm);
  const [contactError, setContactError] = useState("");
  const [contactSuccessMessage, setContactSuccessMessage] = useState("");
  const [isSendingContactForm, setIsSendingContactForm] = useState(false);

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
        throw new Error(payload.error || "We couldn't send your message right now.");
      }

      setContactSuccessMessage(
        "Thank you. Your message was sent to our team and we will follow up about your order, shipping request, or special event details.",
      );
      setContactForm(initialContactForm);
    } catch (error) {
      setContactError(error instanceof Error ? error.message : "We couldn't send your message right now.");
    } finally {
      setIsSendingContactForm(false);
    }
  }

  return (
    <>
      <section className={styles.storySection}>
        <div className={styles.storyCard}>
          <div className={styles.storyText}>
            <p className={styles.kicker}>About Us</p>
            <h2>Baked with care, memory, and a love for sharing good food</h2>
            <p>
              Yes Bakery & More is built around warm breads, family-table pastries, and the kind of homemade
              comfort that invites people to slow down and gather.
            </p>
            <p>
              Pickup is based in Union City, California. Shipping can be reviewed case by case, depending on the
              item and destination.
            </p>
          </div>

          <div className={styles.storyLogoPanel}>
            <Image
              src="/assets/yesbakery_logo.PNG"
              alt="Yes Bakery & More logo"
              width={520}
              height={260}
              className={styles.storyLogo}
            />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.storyCard}>
          <div className={styles.storyText}>
            <p className={styles.kicker}>Contact</p>
            <h2>Planning a special order or hoping to arrange shipping?</h2>
            <p>
              Reach out for celebration orders, custom requests, larger bakery pickups, or shipping questions. We
              will gladly review the details and let you know what can be arranged.
            </p>
            <p>
              If you already know what you want to order, you can also use the cart page to request a shipping
              arrangement directly from your selected items.
            </p>
          </div>

          <div className={styles.checkoutCard}>
            <p className={styles.kicker}>Send a Message</p>
            <h2>Let us know what you need</h2>
            <form className={styles.checkoutForm} onSubmit={handleContactSubmit}>
              <label>
                Full Name
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
                Email
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
                Phone
                <input
                  type="tel"
                  value={contactForm.phone}
                  onChange={(event) =>
                    setContactForm((current) => ({ ...current, phone: event.target.value }))
                  }
                />
              </label>

              <label>
                Message
                <textarea
                  rows={5}
                  value={contactForm.message}
                  onChange={(event) =>
                    setContactForm((current) => ({ ...current, message: event.target.value }))
                  }
                  placeholder="Tell us about your event date, quantity, flavors, pickup timing, or shipping request."
                  required
                />
              </label>

              <button type="submit" className={styles.submitButton}>
                {isSendingContactForm ? "Sending..." : "Send Message"}
              </button>
            </form>

            {contactError ? (
              <div className={styles.successMessage}>
                <strong>Message could not be sent.</strong>
                <p>{contactError}</p>
              </div>
            ) : null}

            {contactSuccessMessage ? (
              <div className={styles.successMessage}>
                <strong>Message received.</strong>
                <p>{contactSuccessMessage}</p>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </>
  );
}
