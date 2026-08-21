// Las imágenes de los artículos viven en Supabase Storage, que las sirve en su
// tamaño original y con `cache-control: no-cache`. Eso costaba ~420 KB de más
// por carga y hacía fallar las auditorías de PageSpeed "entrega de imágenes" y
// "tiempos de almacenamiento en caché eficientes".
//
// Pasarlas por el optimizador de imágenes de Vercel resuelve las dos cosas:
// reescala al ancho que realmente se pinta, negocia AVIF/WebP y responde con
// cache de larga duración. Es same-origin, así que también entra dentro de
// `img-src 'self'` en la CSP.

// Debe ser un subconjunto de `images.sizes` en vercel.json: Vercel rechaza
// cualquier ancho que no esté declarado allí.
const CARD_WIDTHS = [384, 640, 828];
const ARTICLE_WIDTHS = [640, 828, 1200, 1500];

function isOptimizable(src) {
  return typeof src === 'string' && src.startsWith('https://');
}

/** URL optimizada a un ancho concreto. */
export function optimizedImage(src, width) {
  if (!isOptimizable(src)) return src;
  return `/_vercel/image?url=${encodeURIComponent(src)}&w=${width}&q=75`;
}

function srcSetFor(src, widths) {
  if (!isOptimizable(src)) return undefined;
  return widths.map((w) => `${optimizedImage(src, w)} ${w}w`).join(', ');
}

/**
 * Props para la imagen de una tarjeta de blog (máx. 560 px de ancho).
 * `eager` sólo para la primera tarjeta de un listado; el resto va en lazy.
 * Sin width/height: en la home la tarjeta no lleva el contenedor con
 * aspect-ratio y debe seguir ajustándose a la imagen, no a un recorte fijo.
 */
export function cardImageProps(src, { eager = false } = {}) {
  return {
    src: optimizedImage(src, 640),
    srcSet: srcSetFor(src, CARD_WIDTHS),
    sizes: '(max-width: 640px) 100vw, 560px',
    loading: eager ? 'eager' : 'lazy',
    // React 18 no reconoce `fetchPriority` en camelCase; pasa el atributo tal cual.
    fetchpriority: eager ? 'high' : 'auto',
    decoding: 'async',
  };
}

/** Props para la imagen principal de un artículo — es el LCP de esa página. */
export function articleImageProps(src) {
  return {
    src: optimizedImage(src, 1200),
    srcSet: srcSetFor(src, ARTICLE_WIDTHS),
    sizes: '(max-width: 1500px) 100vw, 1500px',
    loading: 'eager',
    fetchpriority: 'high',
    decoding: 'async',
  };
}
