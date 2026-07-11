# GUÍA DE DESARROLLO
## Hackathon de Agentes Financieros IA
### Track 3

**Historias de usuario y criterios mínimos para productos funcionales en 48 horas**

*Julio de 2026*

---

## Regla de alcance para todos los equipos

Cada producto debe cumplir, como mínimo, con los requisitos y criterios de aceptación definidos para su track. Los equipos pueden agregar funcionalidades, automatizaciones, integraciones o experiencias que consideren necesarias, siempre que no eliminen ni sustituyan el alcance mínimo requerido.

### Condiciones de demostración

- [ ] Se permiten datos ficticios, archivos de prueba e integraciones simuladas si el flujo funcional se puede demostrar de extremo a extremo.
- [ ] Las acciones reguladas o sensibles deben quedar como propuesta, alerta o solicitud de aprobación; no es necesario ejecutarlas en producción.
- [ ] Cada equipo conserva libertad creativa sobre interfaz, canal, tecnología y funcionalidades adicionales.

---

## Track 3: Robo-Advisory y Automatización de Estrategias de Inversión

**Agentes involucrados:** Asesor Financiero e Inversiones IA.

**Problema que resuelve:** Estandariza el perfilamiento de riesgo y la generación de propuestas de portafolio, manteniendo al asesor humano como responsable final.

---

### Historia de Usuario 1: Perfil de inversionista transparente

**Como:** potencial inversionista

**Quiero:** completar un diagnóstico de objetivo, horizonte y tolerancia al riesgo

**Para que:** pueda recibir una propuesta adecuada a mi perfil

**Criterios de aceptación**

- [ ] El Asesor Financiero IA realiza un cuestionario de perfilamiento.
- [ ] Calcula un perfil preliminar mediante reglas visibles y versionadas.
- [ ] Permite al usuario revisar respuestas y entender cómo influyen en el resultado.

---

### Historia de Usuario 2: Propuesta explicable de portafolio

**Como:** inversionista perfilado

**Quiero:** visualizar una propuesta de distribución de activos

**Para que:** pueda comprender el riesgo, horizonte y diversificación sugerida

**Criterios de aceptación**

- [ ] El sistema usa un catálogo ficticio o aprobado de instrumentos.
- [ ] Muestra porcentajes de asignación, riesgo esperado y una explicación legible.
- [ ] No ejecuta órdenes ni promete rentabilidad; presenta una propuesta para revisión.

---

### Historia de Usuario 3: Revisión por asesor autorizado

**Como:** asesor de inversiones

**Quiero:** revisar y aprobar una propuesta generada por IA

**Para que:** pueda cumplir mis responsabilidades antes de recomendar o ejecutar

**Criterios de aceptación**

- [ ] El asesor recibe un resumen del perfil, propuesta y justificación.
- [ ] Puede aprobar, editar o rechazar la propuesta.
- [ ] Cada decisión queda registrada con fecha, versión de reglas y responsable.

---

### Productos similares en el mercado

- [ ] **Betterment Automated Investing:** https://www.betterment.com/investing
- [ ] **Wealthfront Automated Investing:** https://www.wealthfront.com/automated-investing