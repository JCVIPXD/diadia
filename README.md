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

## Hoja de ruta

1. [x] Base + núcleo: PWA, hábitos, pantalla Hoy, versión mínima, racha con perdón
2. [x] Tareas de hoy, franjas del día y copia de seguridad (exportar/importar con fusión)
3. [ ] Progreso: detalle del hábito con calendario de calor, check-in diario (ánimo, energía, horas de sueño), revisión semanal
4. [ ] Recordatorios en Android (envoltorio Capacitor con notificaciones locales; las PWA no pueden programarlas de forma fiable)
5. [ ] Sincronización directa entre dispositivos sin servidor de terceros
6. [ ] Pulido: animaciones, textos, iconos
