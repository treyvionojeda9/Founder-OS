import { useEffect, useState } from "react";

export type FormFactor = "portrait" | "landscape" | "desktop";

export function readFormFactor(): FormFactor {
  if (typeof window === "undefined") return "portrait";
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width < 1100) return "portrait";
  const finePointer =
    window.matchMedia("(pointer: fine)").matches && navigator.maxTouchPoints === 0;
  if (!finePointer) return "landscape";
  if (width >= 1500 && height >= 980) return "landscape";
  return "desktop";
}

export function useFormFactor(): FormFactor {
  const [factor, setFactor] = useState<FormFactor>(readFormFactor);
  useEffect(() => {
    const update = () => setFactor(readFormFactor());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return factor;
}
