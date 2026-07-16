# Magic Enterprise Group — Design System

> Basado en el Brand Book (Brand Operating System v1.0, 2026 — preparado por Focus Labs Media Group).
> Este documento traduce la filosofía de marca en tokens y reglas aplicables a producto, web y contenido.

**Posicionamiento:** Financial Growth Company (no "credit repair company").
**Frase ancla:** *"Credit is more than a three-digit number."*
**Principio rector del diseño visual:** *Less decoration. More meaning.* — Confianza antes que "premium".

---

## 1. Fundamentos de marca

| Elemento | Definición |
|---|---|
| Arquetipo primario | The Architect — construye con visión completa antes de actuar |
| Arquetipo secundario | The Mentor — educa, no vende |
| Personalidad (buscar) | Professional, Trustworthy, Strategic, Optimistic, Patient, Intelligent, Disciplined, Reliable, Supportive, Modern, Transparent, Human, Confident, Educational, Purpose-driven |
| Personalidad (evitar) | Aggressive, Arrogant, Desperate, Manipulative, Flashy, Judgmental, Fear-based, Confusing, Pushy, Sales-driven |
| Emoción objetivo por interacción | Clarity → Confidence → Relief → Motivation → Hope |
| Regla de 5 segundos | Toda pieza debe responder en 5s: ¿Quién son? ¿Puedo confiarles? ¿Pueden ayudarme? |

---

## 2. Color System

### Tokens primarios

| Nombre | Hex | RGB | Rol | Significado |
|---|---|---|---|---|
| **Trust Navy** | `#163A5F` | 22, 58, 95 | Color primario (70%) | Integridad, seguridad, autoridad, estabilidad |
| **Magic Gold** | `#A67C1B` | 166, 124, 27 | Color secundario (10%) | Oportunidad, logro, excelencia |
| **Warm Ivory** | `#F8F6F2` | 248, 246, 242 | Neutro de soporte (20%) | Balance, calidez, espacio para respirar |

**Distribución de color:** 70% Trust Navy / 20% Warm Ivory / 10% Magic Gold.
Regla: *la marca debe sentirse confiable antes que premium* — el dorado es acento, nunca protagonista.

### CSS Custom Properties

```css
:root {
  /* Brand core */
  --meg-navy: #163A5F;
  --meg-gold: #A67C1B;
  --meg-ivory: #F8F6F2;

  /* Navy scale (tints/shades para UI) */
  --meg-navy-900: #0E2740;
  --meg-navy-700: #163A5F; /* base */
  --meg-navy-500: #2C5580;
  --meg-navy-300: #7C97B3;
  --meg-navy-100: #DCE4EC;

  /* Gold scale */
  --meg-gold-700: #7C5C14;
  --meg-gold-500: #A67C1B; /* base */
  --meg-gold-300: #D2AE5C;
  --meg-gold-100: #F0E2C0;

  /* Neutrals */
  --meg-ivory-base: #F8F6F2;
  --meg-white: #FFFFFF;
  --meg-ink: #1A1A1A;       /* texto sobre ivory */
  --meg-gray-600: #4A4A4A;  /* texto secundario */
  --meg-gray-300: #D8D5CE;  /* bordes sutiles */

  /* Semantic tokens */
  --color-bg-primary: var(--meg-ivory-base);
  --color-bg-inverse: var(--meg-navy-700);
  --color-text-primary: var(--meg-ink);
  --color-text-inverse: var(--meg-white);
  --color-accent: var(--meg-gold-500);
  --color-border: var(--meg-gray-300);
  --color-link: var(--meg-navy-700);
}
```

### Reglas de uso
- Navy = fondo dominante en portadas/héroes, texto sobre ivory, elementos de autoridad (headers, footers, CTAs primarios).
- Gold = **acento**, nunca base: bordes decorativos, íconos, hover states, subrayados, badges de logro. Máximo 10% del lienzo.
- Ivory = fondo de contenido, nunca blanco puro — mantiene la calidez de la marca.
- Nunca usar colores no oficiales ni degradados que alteren estos tonos base.

---

## 3. Typography

### Familias

| Uso | Familia primaria | Alternativas |
|---|---|---|
| **Display / Headlines** | Playfair Display (serif) | Cormorant Garamond, Libre Baskerville |
| **Body / UI / Digital** | Inter | Manrope, Avenir, Montserrat |

Carácter: la serif debe sentirse *elegante, establecida, sofisticada, confiable* — nunca decorativa. La sans debe sentirse *moderna, legible, limpia, accesible*.

### Escala jerárquica (documento fuente)

| Nivel | Familia | Tamaño | Peso |
|---|---|---|---|
| Headline | Playfair Display | 24–36pt | Regular/Bold |
| Subheading | Inter | 14–18pt | Bold |
| Body | Inter | 11–13pt | Regular |
| Caption | Inter | 9–10pt | Regular |

### Escala para web (adaptada a rem, base 16px)

```css
:root {
  --font-display: 'Playfair Display', Georgia, serif;
  --font-body: 'Inter', -apple-system, sans-serif;

  --text-h1: 2.75rem;   /* 44px */
  --text-h2: 2.25rem;   /* 36px */
  --text-h3: 1.75rem;   /* 28px */
  --text-h4: 1.25rem;   /* 20px — subheading, Inter Bold */
  --text-body-lg: 1.125rem; /* 18px */
  --text-body: 1rem;        /* 16px */
  --text-caption: 0.8125rem; /* 13px */

  --leading-display: 1.15;
  --leading-body: 1.6;
}

h1, h2, h3 { font-family: var(--font-display); color: var(--meg-navy-700); line-height: var(--leading-display); }
body, p, .body-text { font-family: var(--font-body); line-height: var(--leading-body); }
```

Regla: nunca usar la serif para bloques largos de body copy, y nunca usar la sans para titulares hero — la mezcla es lo que da la identidad "editorial-financiero".

---

## 4. Logo

### Filosofía del símbolo
- **Top hat (sombrero de copa)**, en navy con banda dorada, en el centro — representa "posibilidad" y resultados que desde afuera parecen mágicos.
- **Estructura orbital dorada** alrededor (tipo átomo) — representa sistemas, conocimiento, precisión, proceso, ejecución.
- Juntos comunican la filosofía central: *lo que parece magia es en realidad preparación, expertise y ejecución disciplinada.* No es un logo de ilusión, es de transformación estratégica.

### Composición
- Isotipo (átomo + sombrero, dorado sobre navy) + wordmark en dos líneas: **MAGIC** (serif, gold, grande) / **ENTERPRISE GROUP** (sans, white/ivory, tracking amplio, menor tamaño).
- Fondo de aplicación por defecto: Trust Navy.

### Reglas — nunca:
- Estirar, rotar, recrear o alterar proporciones.
- Añadir efectos (sombras, glow, gradientes no oficiales).
- Usar colores no oficiales.
- Colocar el logo sobre fondos visualmente ruidosos.

```css
/* Zona de seguridad mínima sugerida: altura del "átomo" del isotipo, en todos los lados */
.logo-clearspace { padding: 1em; } /* 1em = altura aprox. del isotipo en el contexto */
```

---

## 5. Photography & Imagery

**Mostrar:** profesionales, emprendedores, familias, dueños de negocio; conversaciones financieras reales; sesiones de planeación; hogares, negocios, crecimiento, celebración auténtica, conexión, vida real, esperanza.

**Evitar:** lujo por el lujo (jets privados, fajos de efectivo, autos deportivos), marketing basado en miedo, gente llorando por facturas, celebraciones artificiales, stock photography sobre-posada.

Regla: *"Our clients should see themselves in our brand. Not a fantasy they cannot relate to."*
Antes/después: nunca mostrar solo números (`580 → 720`). Mostrar transformación en lenguaje humano ("Calificó para su primera hipoteca").

---

## 6. Graphic Style

**Palabras clave:** Minimal. Balanced. Editorial. Modern. Structured. Elegant. Purposeful.

- Prioridad: organización visual por sobre densidad decorativa — *"organization communicates trust."*
- Jerarquía de contenido estándar para cualquier pieza (ads, web, brochure, social): **Headline claro → explicación de soporte → prueba visual → call to action.**
- La gente escanea antes de leer — diseñar en consecuencia (jerarquía tipográfica clara, whitespace generoso, un solo punto focal por sección).

---

## 7. Voz y Tono (para copy/UI writing)

### 5 principios de voz
**Clear · Professional · Educational · Encouraging · Honest**

### Estructura de comunicación
`Listen → Educate → Guide → Confirm` (nunca presionar; siempre confirmar próximos pasos antes de cerrar).

### Vocabulario

| Usar | Evitar |
|---|---|
| Opportunity, Growth, Strategy, Foundation, Progress, Confidence, Education, Partnership, Preparation, Integrity, Guidance, Potential, Build, Strengthen, Future, Trust, Leadership, Solutions, Planning, Success | Guaranteed, Instant, Erase Everything, Credit Sweep, Hack, Secret Formula, Magic Trick, Easy Money, Fast Cash, Risk Free, Become Rich Quickly |

### Tono por canal

| Canal | Tono |
|---|---|
| Website | Professional, Educational, Organized, Simple, Confident |
| Social Media | Educational, Approachable, Positive, Helpful (mentor, no entretenimiento) |
| Consultas | Patient, Respectful, Strategic, Calm |
| Emails | Concise, Professional, Clear, Action-oriented |
| Llamadas | Friendly, Prepared, Focused, Solutions-oriented |

### Frases firma (usables como headlines/taglines)
- "Opportunity begins with preparation."
- "Financial confidence is built, not inherited."
- "Trust is our greatest investment."
- "People matter more than numbers."
- "Credit is more than a three-digit number."

---

## 8. Componentes UI (interpretación aplicada)

Guía práctica derivada de la filosofía "confianza antes que premium" y "menos decoración, más significado":

```css
/* Botón primario */
.btn-primary {
  background: var(--meg-navy-700);
  color: var(--meg-white);
  font-family: var(--font-body);
  font-weight: 600;
  border-radius: 6px; /* esquinas suaves, no rounded-full: sobrio, no "app juguetona" */
  padding: 0.875rem 1.75rem;
  border: none;
  transition: background 0.2s ease;
}
.btn-primary:hover { background: var(--meg-navy-500); }

/* Botón secundario / outline */
.btn-secondary {
  background: transparent;
  color: var(--meg-navy-700);
  border: 1.5px solid var(--meg-navy-700);
  border-radius: 6px;
  padding: 0.875rem 1.75rem;
}

/* Acento dorado — usar con moderación (10%) */
.badge-accent, .highlight-rule {
  border-left: 3px solid var(--meg-gold-500);
  padding-left: 1rem;
}

/* Card */
.card {
  background: var(--meg-white);
  border: 1px solid var(--meg-gray-300);
  border-radius: 8px;
  padding: 1.5rem;
}

/* Sección hero (fondo invertido) */
.hero-inverse {
  background: var(--meg-navy-700);
  color: var(--meg-white);
}
.hero-inverse h1 { color: var(--meg-white); }
.hero-inverse .accent { color: var(--meg-gold-500); }
```

**Checklist de contenido antes de publicar (Content Approval Checklist del brandbook):**
- [ ] ¿Es preciso?
- [ ] ¿Es legalmente correcto?
- [ ] ¿Es visualmente consistente?
- [ ] ¿Es fácil de entender?
- [ ] ¿Educa?
- [ ] ¿Refuerza confianza?
- [ ] ¿Refleja los valores de marca?

---

## 9. Resumen rápido (cheat sheet)

```
COLOR    Navy #163A5F (70%) · Gold #A67C1B (10%) · Ivory #F8F6F2 (20%)
TYPE     Headlines: Playfair Display · Body/UI: Inter
LOGO     Átomo dorado + top hat navy, sobre fondo Trust Navy. Nunca alterar.
TONE     Clear · Professional · Educational · Encouraging · Honest
AVOID    Flashy, urgencia falsa, promesas garantizadas, lujo aspiracional
RULE     "Less decoration. More meaning." — la organización comunica confianza.
```

---

*Fuente: Magic Enterprise Group — Brand Operating System v1.0 (2026), preparado por Focus Labs Media Group.*
