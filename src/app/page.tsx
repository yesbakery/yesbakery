import { readFile } from "node:fs/promises";
import path from "node:path";

import { ThreeHomeExperience } from "../components/ThreeHomeExperience";
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
    <main className={styles.reactHomeExperience}>
      <ThreeHomeExperience css={css} markup={markup} />
    </main>
  );
}
