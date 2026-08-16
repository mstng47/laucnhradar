"use client";

import { useEffect } from "react";

// No visual output of its own — mounted once inside Briefing, it finds
// whatever .story elements that render produced and reveals each as it
// enters the viewport. Kept separate from BriefingList/Briefing so those
// can stay plain server components; this is the one bit that actually
// needs the browser.
export default function StoryReveal() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const items = document.querySelectorAll(".story");
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
            obs.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    items.forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, []);

  return null;
}
