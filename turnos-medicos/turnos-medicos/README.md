# MediTurno — Sistema web de turnos médicos

Aplicación web para registrar pacientes, asignar turnos por especialidad y
consultar la fila de espera de un centro de salud. Proyecto individual para
la asignatura de Desarrollo de Soluciones Web.

**Autora:** Génesis Batista Jerez

## ¿Qué hace?

- **Registrar pacientes:** nombre, cédula, teléfono, fecha de nacimiento, sexo
  y seguro médico, con validación y máscaras de formato en tiempo real.
- **Asignar turnos:** selección de paciente ya registrado, especialidad
  (con su médico asignado), fecha y hora. Las horas disponibles se generan
  automáticamente según los horarios del centro (8:00–12:00 y 2:00–5:00 p. m.,
  cada 20 minutos) y descartan las horas ya ocupadas para esa especialidad y
  fecha. No permite domingos ni fechas pasadas.
- **Ticket de turno:** al confirmar, se genera un comprobante numerado
  (ej. `MG-03`) con el tiempo de espera estimado, calculado según la cantidad
  de personas por delante y la duración promedio de consulta de cada
  especialidad.
- **Turnos pendientes:** panel con estadísticas (pendientes, atendidos hoy,
  cancelados, espera promedio) y una fila de tickets filtrable por
  especialidad, estado o búsqueda de paciente, con botones para marcar un
  turno como atendido o cancelarlo.

Todos los datos se guardan en el `localStorage` del navegador — no requiere
base de datos ni backend. Al recargar la página, la información persiste.

## Cómo ejecutar el proyecto localmente

Este proyecto es HTML/CSS/JavaScript puro (sin frameworks ni paso de
compilación), pero **debe** servirse desde un servidor web local; abrir
`index.html` directamente con doble clic puede bloquear algunas funciones del
navegador.

**Opción 1 — Python (ya viene instalado en la mayoría de sistemas):**

```bash
cd turnos-medicos
python3 -m http.server 8080
```

Luego abrir [http://localhost:8080](http://localhost:8080) en el navegador.

**Opción 2 — extensión "Live Server" de VS Code:**

1. Abrir la carpeta `turnos-medicos` en VS Code.
2. Clic derecho sobre `index.html` → **Open with Live Server**.

**Opción 3 — Node.js:**

```bash
npx serve turnos-medicos
```

## Estructura de archivos

```
turnos-medicos/
├── index.html          # Estructura semántica de las 3 secciones
├── css/
│   └── styles.css      # Estilos, diseño responsivo y variables de color
├── js/
│   └── app.js          # Lógica: validaciones, cálculos, filtros, localStorage
└── README.md
```

## Notas técnicas

- No se usan librerías externas de JavaScript; solo Google Fonts para la
  tipografía (Fraunces, IBM Plex Sans, IBM Plex Mono).
- La numeración de turnos usa el prefijo de la especialidad
  (`MG`, `PED`, `CAR`, `DER`, `GIN`, `ODO`) seguido del número del día.
- Probado en Chrome, Firefox y en vista móvil (390px de ancho).
