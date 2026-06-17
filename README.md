# ETHOS Acido-Base (PWA)

Apoyo **docente** a la interpretacion de gases arteriales y equilibrio acido-base, con panel de
**contexto clinico** (hemorragia, postop, ventilacion mecanica, shock, sepsis, etc.). Borrador;
no reemplaza el juicio clinico.

**v5.0** — bibliografia auditada (54 referencias verificadas con enlace), modo **Practica**
(quiz con repeticion espaciada sobre 50 casos) y **mapa visual acido-base** (nomograma interactivo).

## Publicar en GitHub Pages
1. Crear repositorio publico `ethos-acidobase`.
2. Subir a la RAIZ los archivos sueltos (NO el zip): index.html, manifest.json, sw.js, icono-192.png, icono-512.png.
3. Settings -> Pages -> Deploy from a branch -> main / (root) -> Save.
4. URL: https://<usuario>.github.io/ethos-acidobase/

## Instalar en el telefono
- iPhone (Safari): Compartir -> "Agregar a pantalla de inicio".
- Android (Chrome): menu -> "Instalar app".
- Abrir una vez con internet; luego funciona offline.

## Actualizar
Al cambiar index.html, subir el numero de cache en sw.js (p.ej. ethos-acidobase-v5_0 -> v5_1...).
El sw.js es network-first para el HTML: las apps instaladas se actualizan solas al abrir con internet.
