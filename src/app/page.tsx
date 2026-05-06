import { readFile } from "node:fs/promises";
import path from "node:path";
import Script from "next/script";

import styles from "./page.module.css";

async function getHomeExperienceParts() {
  const htmlPath = path.join(process.cwd(), "public/assets/yesbakery-3d.html");
  const html = await readFile(htmlPath, "utf8");

  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  const bodyMatch = html.match(/<body>\s*([\s\S]*?)\s*<script type="importmap">/);

  return {
    css: styleMatch?.[1] ?? "",
    markup: bodyMatch?.[1] ?? "",
  };
}

export default async function Home() {
  const { css, markup } = await getHomeExperienceParts();

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <main className={styles.reactHomeExperience}>
        <div dangerouslySetInnerHTML={{ __html: markup }} />
      </main>
      <Script src="/assets/yesbakery-3d.module.js" strategy="afterInteractive" type="module" />
    </>
  );
}
