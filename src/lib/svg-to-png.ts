// Client-only helper. Serialize an in-DOM <svg> (e.g. a recharts chart) and
// rasterize it to a base64 PNG via an offscreen canvas. Returns null on any
// failure so callers can skip the image and keep going.
//
// Key fix vs. naive serialization: when an SVG is rendered into a data URL
// inside an <Image>, it has NO access to the page's stylesheet. Any
// `var(--color-foreground)` or class-based styling resolves to nothing, so
// strokes/fills/fonts go blank. We clone the live SVG and INLINE the
// computed style for each element so the serialized markup is self-contained.

const PNG_BG = "#ffffff";

// presentation properties that affect SVG rendering and need to be inlined
const INLINE_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
  "dominant-baseline",
  "color",
];

function inlineStylesOnClone(orig: SVGSVGElement, clone: SVGSVGElement) {
  const origAll: Element[] = [orig, ...Array.from(orig.querySelectorAll("*"))];
  const cloneAll: Element[] = [clone, ...Array.from(clone.querySelectorAll("*"))];
  const n = Math.min(origAll.length, cloneAll.length);
  for (let i = 0; i < n; i++) {
    const o = origAll[i];
    const c = cloneAll[i] as SVGElement;
    const cs = getComputedStyle(o);
    for (const prop of INLINE_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (!val) continue;
      c.style.setProperty(prop, val);
    }
  }
}

// Pick the main chart surface. Recharts renders many svgs inside one chart
// (each legend swatch is its own <svg>), and the first one in DOM order can
// be a tiny 14×14 legend icon. The main surface is always the biggest svg,
// so picking by largest rendered area is chart-agnostic and bulletproof.
function pickMainSvg(container: Element): SVGSVGElement | null {
  const svgs = Array.from(container.querySelectorAll("svg")) as SVGSVGElement[];
  if (svgs.length === 0) return null;
  let best: SVGSVGElement | null = null;
  let bestArea = 0;
  for (const s of svgs) {
    const rect = s.getBoundingClientRect();
    let w = rect.width;
    let h = rect.height;
    // fall back to attributes if bounding rect is 0 (off-screen / not painted yet)
    if (!w || !h) {
      w = Number(s.getAttribute("width")) || 0;
      h = Number(s.getAttribute("height")) || 0;
    }
    const area = w * h;
    if (area > bestArea) {
      bestArea = area;
      best = s;
    }
  }
  return best;
}

export async function svgToPng(
  svg: SVGSVGElement,
  outWidth: number,
  outHeight: number
): Promise<string | null> {
  try {
    // clone so we don't mutate the live chart's appearance / inline styles
    const clone = svg.cloneNode(true) as SVGSVGElement;

    // ensure the serialized svg is self-contained
    if (!clone.getAttribute("xmlns")) {
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    if (!clone.getAttribute("xmlns:xlink")) {
      clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    }
    // explicit width/height + viewBox so the SVG renders at the right size
    // even without external CSS context
    const liveW =
      svg.getAttribute("width") ||
      String(svg.getBoundingClientRect().width) ||
      String(outWidth);
    const liveH =
      svg.getAttribute("height") ||
      String(svg.getBoundingClientRect().height) ||
      String(outHeight);
    clone.setAttribute("width", String(liveW));
    clone.setAttribute("height", String(liveH));
    if (!clone.getAttribute("viewBox")) {
      clone.setAttribute("viewBox", `0 0 ${liveW} ${liveH}`);
    }

    // resolve css vars + class-based styling into literal attributes on every node
    inlineStylesOnClone(svg, clone);

    const xml = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const img = new Image();
    img.decoding = "sync";

    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("svg image load failed"));
    });
    img.src = url;
    await loaded;

    const canvas = document.createElement("canvas");
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      URL.revokeObjectURL(url);
      return null;
    }
    // solid background — google docs renders transparent pngs poorly
    ctx.fillStyle = PNG_BG;
    ctx.fillRect(0, 0, outWidth, outHeight);
    ctx.drawImage(img, 0, 0, outWidth, outHeight);

    URL.revokeObjectURL(url);

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function captureExportChart(
  selector: string,
  outWidth: number,
  outHeight: number
): Promise<string | null> {
  if (typeof document === "undefined") return null;
  const container = document.querySelector(selector);
  if (!container) return null;
  const svg = pickMainSvg(container);
  if (!svg) return null;
  return svgToPng(svg, outWidth, outHeight);
}
