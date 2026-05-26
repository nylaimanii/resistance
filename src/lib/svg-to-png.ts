// Client-only helper. Serialize an in-DOM <svg> (e.g. a recharts chart) and
// rasterize it to a base64 PNG via an offscreen canvas. Returns null on any
// failure so callers can skip the image and keep going.

const PNG_BG = "#ffffff";

export async function svgToPng(
  svg: SVGSVGElement,
  outWidth: number,
  outHeight: number
): Promise<string | null> {
  try {
    // ensure required namespaces are present before serializing
    if (!svg.getAttribute("xmlns")) {
      svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    if (!svg.getAttribute("xmlns:xlink")) {
      svg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    }

    const xml = new XMLSerializer().serializeToString(svg);
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
  const svg = container.querySelector("svg") as SVGSVGElement | null;
  if (!svg) return null;
  return svgToPng(svg, outWidth, outHeight);
}
