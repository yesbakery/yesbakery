"use client";

import { useEffect } from "react";

type ThreeHomeExperienceProps = {
  css: string;
  markup: string;
};

export function ThreeHomeExperience({ css, markup }: ThreeHomeExperienceProps) {
  useEffect(() => {
    const existing = document.getElementById("yesbakery-3d-script");
    if (existing) {
      existing.remove();
    }

    const script = document.createElement("script");
    script.id = "yesbakery-3d-script";
    script.type = "module";
    script.src = "/assets/yesbakery-3d.module.js";
    document.body.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div dangerouslySetInnerHTML={{ __html: markup }} />
    </>
  );
}
