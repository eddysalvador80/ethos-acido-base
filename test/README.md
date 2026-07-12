# Validación y regresión del motor ETHOS Ácido-Base

Banco reproducible que prueba el motor clínico **directamente desde `../index.html`**
(el publicado), sin extraer ni duplicar el código. Si cambias el motor, este banco
prueba la versión nueva automáticamente.

## Cómo correr

```bash
cd test
node validate.js            # foto de 3 capas + chequeo de regresión (exit 1 si hay regresión)
node validate.js --snapshot # regenera el snapshot dorado tras un cambio intencional del motor
```

Requiere solo Node (sin dependencias).

## Qué mide — la vara de 3 capas

| Capa | Qué exige | Meta |
|---|---|---|
| **C1 — simples** | clasificar el trastorno primario exacto | > 98 % |
| **C2 — seguridad** | nunca perder patología grave; no sobrediagnosticar | 0 fallos |
| **C3 — mixto/triple** | **detectar** que el cuadro es complejo y advertir | alta sensibilidad |

C3 **no** exige clavar cada componente de un triple: el método bicarbonato tiene un
techo intrínseco en los cuadros complejos, y un motor que **declara su límite** ("patrón
mixto complejo, correlacione") acierta al conocerlo, no falla.

## Dos mecanismos

1. **Foto de 3 capas** — reporte de calidad. Clasifica con un *matcher texto→familia*
   sobre `dxPrimary`. Es una **aproximación**: la rúbrica es más frágil que el motor, así
   que un "fallo" aquí suele ser un bug del matcher, no del motor. **Adjudica a mano antes
   de creer un número.**
2. **Regresión (snapshot dorado)** — el pass/fail **duro**. Compara la salida del motor,
   caso por caso, contra `snapshot.json` (salida conocida-buena). No depende del matcher:
   si alguien mueve una fórmula, lo delata. Actualiza el dorado solo tras un cambio
   *intencional* y revisado.

## Archivos

- `harness.js` — carga el motor de `../index.html` en Node (vm + DOM simulado); expone `runCase(labs)`.
- `ab_casos.json` — banco de 50 casos de verdad conocida (11 simples, 12 mixtos, 5 triples, 13 especiales, 9 adversariales).
- `validate.js` — runner de las 3 capas + regresión.
- `snapshot.json` — salida dorada del motor (generada con `--snapshot`).

## Límites honestos

- El banco es finito (50) y en parte construido con IA (auditado), no una cohorte clínica.
  Para validación clínica real, el siguiente paso es un set de casos **consensuados por
  anestesiólogos**, no scrapear casos sueltos.
- El harness no inyecta cetonemia/sensorio estructurados (el banco no los trae), así que
  los detectores de CAD/EHH que dependen de esos campos no se ejercitan aquí.
