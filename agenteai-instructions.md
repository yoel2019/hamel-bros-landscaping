# Instrucciones del Agente AI — Hamel Bros. Landscaping Web

## Idiomas
- **Web (código y contenido):** Inglés
- **Comunicación usuario ↔ agente:** Español

---

## Proyecto
**Nombre:** Hamel Bros. Landscaping  
**Tipo:** Rediseño web completo  
**Estructura:** Multipágina (5 páginas)  
**URL original:** http://www.hamellandscaping.com/

---

## Datos reales de la empresa
- **Nombre:** Hamel Bros. Landscaping Inc.
- **Fundado:** 2001 por Paul y Dave Hamel
- **Tipo:** Negocio familiar, comercial y residencial
- **Dirección:** P.O. Box 2069, Natick, MA 01760
- **Teléfono:** 508-647-0003
- **Área de servicio:** Metro West — Natick, Wellesley, Weston, Wayland, Framingham
- **Lawn care limitado a:** Natick y Wellesley

### Equipo
| Nombre | Rol |
|---|---|
| Paul Hamel | Operaciones, diseño, poda, compra de plantas. Graduado Bentley University 1998 |
| Dave Hamel | Scheduling, estimados, comunicación con clientes. Graduado Norwich University 1998 |
| Steve Hamel | Supervisión de lawn care comercial y residencial, mantenimiento de flota |
| Jimmy Hamel | Crew general, mulch, plantación, poda. Graduado University of Buffalo |

### Servicios
**Maintenance:**
- Spring & Fall cleanups
- Edging & mulching
- Weeding
- Lawn care, Fertilizing
- Lawn renovations & new installations
- Aeration, de-thatching, seeding
- Trimming of trees and shrubs

**Planting:**
- Installation of trees, shrubs and perennials
- Design services

**Commercial:**
- Complete grounds maintenance
- Snow management, Snowplowing, Shoveling
- Melting and de-icing services
- Snow removal

**Other:**
- Bobcat and backhoe services
- Shrub and stump removal
- Land clearing and re-grading

### Testimonios reales
- *\"I can't say enough wonderful things about the Hamel brothers... they do a great job, they are prompt, personable, really keep track of their crew and their services are reasonably priced…you won't be disappointed!\"* — B.S.
- *\"Their prices are reasonable and you will be amazed at how quickly they work, the quality of their work is excellent.\"* — J.G.
- *\"We gave them free reign and they took an outdated yard and made it look beautiful. It was completely redone in one weekend, they were great!\"* — N.M.
- *\"We just had to send an extra thank you... The lawn is just what we always dreamed our yard would look like. We appreciate how hard your crews work and that they always leave everything spotless.\"* — S.Z.

---

## Diseño Visual

### Paleta de colores
```css
--color-black:        #0a0a0a;   /* Fondo principal */
--color-green-deep:   #0d1f0d;   /* Verde negro profundo */
--color-green-dark:   #1a4d1a;   /* Verde oscuro */
--color-green-mid:    #4CAF50;   /* Verde medio vivo */
--color-green-lime:   #a8ff78;   /* Verde lima neón — acentos y CTAs */
--color-white:        #ffffff;   /* Texto principal */
--color-gray:         #a0a0a0;   /* Texto secundario */
```

### Tipografía
- **Títulos:** Playfair Display (serif) — Google Fonts
- **Cuerpo / UI:** Inter (sans-serif) — Google Fonts

### Referencias de inspiración (3 diseños Dribbble)
1. **Lawnx** — Estructura general, topbar, trust bar, blog cards, footer con Instagram grid
2. **Lawnc Tree Services** — Hero con forma orgánica de hoja, proceso \"how we work\" en fondo oscuro, galería grid
3. **Lawnc Landscaping** — Hero con fondo muy oscuro y tags flotantes, cards de servicios, case studies, testimonios en grid

### Elementos de diseño clave
- Hero con imagen recortada en forma orgánica (círculo/hoja/arco)
- Tags flotantes de palabras clave en el hero
- CTAs con flecha diagonal (↗)
- Stats en fila (años, proyectos, satisfacción)
- Cards de servicios con iconos
- Proceso paso a paso con iconos
- Grid de testimonios
- Footer con columnas + datos de contacto

---

## Tecnología

### Stack
- **HTML5** semántico
- **CSS3** con Custom Properties (variables)
- **JavaScript** vanilla (sin frameworks)
- **Google Fonts** (Playfair Display + Inter)

### Performance
- **Lazy Loading** con Intersection Observer API
- Imágenes con atributo `loading=\"lazy\"`
- Secciones con `opacity: 0` → animación fade+slide al entrar al viewport
- Contenido pesado (galería) inyectado en DOM solo al llegar al scroll

### Estructura de archivos
```
hamelbrosweb/
├── agenteai-instructions.md   ← este archivo
├── assets/logo/assets/logo/hamelBros.LandscapingLogo.png
├── assets/
│   └── logo/
├── css/
│   └── styles.css
├── js/
│   └── main.js
├── index.html
├── services.html
├── about.html
├── gallery.html
└── contact.html
```

---

## Páginas

| Página | Secciones |
|---|---|
| `index.html` | Topbar, Nav, Hero, Stats, Services Preview, About Preview, Process, Testimonials, CTA Banner, Footer |
| `services.html` | Hero interno, Servicios detallados por categoría |
| `about.html` | Hero interno, Historia, Equipo (4 miembros), Valores |
| `gallery.html` | Hero interno, Grid de proyectos con lazy load |
| `contact.html` | Hero interno, Formulario, Datos de contacto |

---

## Reglas para el agente
1. Todo el **contenido textual de la web** debe estar en **inglés**
2. Toda **comunicación con el usuario** debe ser en **español**
3. El código debe estar **comentado y ser legible**
4. Usar siempre la variable CSS en lugar de valores hardcoded
5. Seguir la estructura de archivos definida arriba
6. Consultar este archivo antes de iniciar cualquier nueva página o componente
