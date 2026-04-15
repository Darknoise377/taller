# Brand Guide - TALLER DE MOTOS A&R

Guia rapida para mantener una interfaz consistente, profesional y enfocada en conversion.

## 1) Paleta oficial

- Primario: `#0A2A66`
- Secundario: `#2E5FA7`
- Metálico / apoyo: `#C7D2E0`
- Neutro texto: `#0F172A` / `#111217`
- Fondo claro: `#F4F7FB`
- Fondo oscuro: `#07122E`

Degradado principal:

- `linear-gradient(135deg, #0A2A66, #2E5FA7)`

## 2) Reglas de uso

- Botones principales: usar gradiente azul corporativo.
- Enlaces destacados: azul primario `#0A2A66`.
- Estados de foco visibles: aro azul `#2E5FA7`.
- Usar plata metálico solo como apoyo visual en bordes, cards y detalles.

## 3) Componentes clave

- Navbar y Footer: mantener acentos rojo/naranja.
- Cards de producto: usar neutros para fondo + precio en rojo/naranja.
- Home hero: jerarquia clara, texto corto, CTA principal visible sin scroll en movil.

## 4) Responsive

- Espaciado horizontal recomendado: `px-4 sm:px-6 lg:px-10 xl:px-12`.
- Titulo hero: `text-2xl sm:text-3xl md:text-4xl`.
- Sliders: altura movil aproximada `h-[22rem]` para evitar recortes.
- Estadisticas o highlights: `grid-cols-1` en movil, `sm:grid-cols-3` en pantallas mayores.

## 5) Checklist antes de publicar

- Confirmar contraste AA en textos y botones.
- Confirmar foco visible en elementos interactivos.
- Revisar Home en movil (320-390px) y desktop (1280+).
- Ejecutar `npm run lint` sin errores.
