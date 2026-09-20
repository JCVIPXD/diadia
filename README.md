# diadia (día a día)

Seguimiento de hábitos personal, minimalista y local. PWA: un solo código para Android y laptop; los datos viven en el dispositivo (IndexedDB) y nada sale de él.

## Comandos

```bash
npm run dev      # servidor de desarrollo
npm test         # tests de la lógica de hábitos
npm run build    # build de producción (genera el service worker)
npm run lint
```

## Estructura

```
src/
  db.ts          esquema Dexie, tipos y escrituras
  habits.ts      lógica pura: fechas, rachas con perdón, consistencia (con tests)
  hooks.ts       useToday, useHabitData
  App.tsx        navegación
  Today.tsx      pantalla "Hoy"
  HabitList.tsx  lista de hábitos
  HabitForm.tsx  crear / editar
  Tasks.tsx      tareas de una sola vez (hoy, mañana, pendientes de antes)
  Backup.tsx     exportar / importar copia de seguridad
  transfer.ts    lógica de exportar e importar (fusión por fila)
```

## Decisiones de diseño

- **Racha con perdón:** un fallo aislado no la rompe; dos seguidos sí ("nunca falles dos veces"). La unidad en curso (hoy / esta semana) nunca cuenta como fallo.
- **Versión mínima:** cada hábito puede tener una versión pequeña que también cuenta. Un mal día sigue sumando.
- **Día local con corte a las 4am:** acostarse a la 1am sigue siendo "hoy". Las fechas se guardan como `YYYY-MM-DD`, no como timestamp UTC.
- **Preparado para sincronizar:** cada fila tiene `updatedAt` y `deletedAt` (borrado lógico); las marcas usan id `habitId_fecha`. Fusionar dos dispositivos = quedarse con el `updatedAt` más reciente por fila.
- **Límite suave de 5 hábitos activos.**
- **Tareas sin culpa:** no hay "vencidas". Lo que quedó sin hacer aparece al día siguiente en "Sin terminar de antes" para pasarlo a hoy o soltarlo. Aviso suave a partir de 7 tareas en un día.
- **Franjas del día (opcionales):** mañana / tarde / noche; los encabezados solo aparecen si algún hábito tiene una.
- **Copia de seguridad con fusión:** al importar, cada fila entra solo si es nueva o más reciente que la local, así que importar dos veces no duplica nada.

## Publicación (GitHub Pages)

`.github/workflows/deploy.yml` compila y publica en cada push a `main`. La app se sirve en `/<nombre-del-repo>/` (variable `BASE_PATH`). Solo se publica el código; los datos quedan en cada dispositivo. En el repositorio hay que activar Settings → Pages → Source: GitHub Actions.

## Movimiento

Todo con CSS (sin librerías): transición al cambiar de pantalla, píldora deslizante en la navegación, palomita que se dibuja, anillo que se llena y brilla al completar el día, entrada escalonada de filas, tareas que se deslizan al quitarlas, y vibración corta al completar (solo Android). Con `prefers-reduced-motion` todo el movimiento se desactiva.

## Hoja de ruta

Hecho:

- [x] Hábitos, pantalla Hoy, versión mínima, racha con perdón, franjas del día
- [x] Tareas de hoy / mañana / pendientes de antes
- [x] Copia de seguridad con fusión, publicación en GitHub Pages
- [x] Animaciones y transiciones

Pendiente, por prioridad:

1. [ ] **Marcar o corregir días anteriores.** Hoy solo se puede marcar el día actual: olvidar marcar ayer rompe la racha sin motivo.
2. [ ] **Recordatorios y alarmas en Android** (envoltorio Capacitor con notificaciones locales; una PWA sola no puede programarlas de forma fiable). Hora opcional por hábito y tarea.
3. [ ] **Seguimiento del sueño:** hora de acostarse y de levantarse, y regularidad frente a la hora objetivo.
4. [ ] **Detalle del hábito:** calendario de calor, mejor racha, cumplimiento por semana.
5. [ ] **Check-in diario** (ánimo, energía) y **revisión semanal**.
6. [ ] **Sincronizar celular y laptop sin servidor de terceros** (hoy es exportar/importar a mano).
7. [ ] Hábitos numéricos (minutos, vasos de agua).
8. [ ] Pausa o vacaciones sin perder la racha.
9. [ ] Editar y reordenar tareas; deshacer al quitar una tarea; tareas con hora o franja.
10. [ ] Notas por día.
11. [ ] Ajustes: tema claro/oscuro, hora de corte del día (hoy fija a las 4am).
12. [ ] Tests automáticos de importar/fusionar y de las pantallas (hoy solo está probada la lógica de rachas).
13. [ ] Iconos y pantalla de inicio pulidos, y aviso de "nueva versión disponible".
14. [ ] Si algún día es comercial: cuentas, sincronización en la nube y monetización.
