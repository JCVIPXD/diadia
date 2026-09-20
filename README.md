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
  Tasks.tsx      "Itinerario de hoy": tareas de una sola vez (hoy, mañana, pendientes de antes; editar y deshacer)
  CheckIn.tsx    pestaña Check-in: sueño, ánimo, energía y nota del día
  Progress.tsx   revisión semanal, calendario de calor por hábito, resumen de sueño
  SettingsPanel.tsx  tema, hora de corte del día, hora objetivo de dormir
  Backup.tsx     exportar / importar / compartir copia de seguridad
  transfer.ts    lógica de exportar e importar (fusión por fila)
  sleep.ts       cálculos de sueño (duración, regularidad)
  reminderPlan.ts  planifica los avisos (lógica pura, con tests)
  reminders.ts   programa las notificaciones en Android (Capacitor)
  settings.ts    preferencias del dispositivo
  updates.ts     aviso de "nueva versión"
android/         proyecto nativo (Capacitor)
```

Cuidado con los nombres de archivo que solo se diferencian en mayúsculas (`Settings.tsx` vs `settings.ts`): en Windows son el mismo archivo y rompen el build.

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

`.github/workflows/deploy.yml` corre los tests, compila y publica en cada push a `main`. La app se sirve en `/<nombre-del-repo>/` (variable `BASE_PATH`). Solo se publica el código; los datos quedan en cada dispositivo. Al haber una versión nueva, la app avisa ("Hay una versión nueva · Actualizar").

## App de Android (recordatorios)

Una PWA no puede programar notificaciones de forma fiable, así que los recordatorios viven en una app nativa (Capacitor) que envuelve la misma web. Requisitos: JDK 17+ y el Android SDK (plataforma 36).

```bash
npm run android:sync          # compila la web y la copia al proyecto Android
cd android
./gradlew assembleDebug       # genera app/build/outputs/apk/debug/app-debug.apk
```

- Crea `android/local.properties` con `sdk.dir=<ruta al Android SDK>` (no se sube a git).
- Instalar el APK en el celular requiere permitir "instalar apps desconocidas". Es una versión de depuración, sin firmar para tienda.
- **La app instalada guarda sus datos aparte de la PWA de Chrome.** Para pasar de una a otra: Exportar en una e Importar en la otra.
- Los avisos se reprograman solos (14 días hacia delante) al cambiar hábitos, marcas o ajustes, y no avisan de lo que ya hiciste ese día.
- Por privacidad la copia de seguridad automática de Android está desactivada (`allowBackup=false`): si desinstalas la app, los datos se pierden; exporta una copia antes.
- Capacitor 8 compila con Java 21. Si no lo tienes, Gradle lo descarga solo (`org.gradle.toolchains.foojay-resolver-convention` en `android/settings.gradle`).

## Movimiento

Todo con CSS (sin librerías): transición al cambiar de pantalla, píldora deslizante en la navegación, palomita que se dibuja, anillo que se llena y brilla al completar el día, entrada escalonada de filas, tareas que se deslizan al quitarlas, y vibración corta al completar (solo Android). Con `prefers-reduced-motion` todo el movimiento se desactiva.

## Hoja de ruta

Hecho:

- [x] Hábitos, pantalla Hoy, versión mínima, racha con perdón, franjas del día
- [x] Tareas de hoy / mañana / pendientes de antes (editar, deshacer)
- [x] Copia de seguridad con fusión (exportar, importar, compartir); publicación en GitHub Pages
- [x] Animaciones y transiciones
- [x] Corregir días anteriores (hasta 30 días atrás)
- [x] Check-in diario (ánimo, energía, sueño, nota) y revisión semanal
- [x] Seguimiento del sueño (duración, regularidad, noches en la hora objetivo)
- [x] Progreso: calendario de calor de 12 semanas y estadísticas por hábito
- [x] Hábitos con cantidad (vasos, minutos, páginas)
- [x] Pausa de hábitos sin perder la racha
- [x] Ajustes: tema claro/oscuro, hora de corte del día
- [x] Recordatorios en Android (Capacitor). Verificado en un emulador (Android 16): alarmas exactas programadas, aviso entregado a la hora, se cancela el de hoy al marcar el hábito, los datos persisten al reiniciar, y compartir la copia abre el menú de Android. **Falta probarlo en un teléfono real.**
- [x] Tests automáticos de la lógica, la fusión de copias y el plan de recordatorios

Pendiente:

1. [ ] **Probar los recordatorios en tu teléfono real.** Algunos fabricantes (Xiaomi, Samsung, Huawei…) matan las alarmas de apps en segundo plano: puede hacer falta desactivar el ahorro de batería para la app.
2. [ ] **Sincronizar celular y laptop sin servidor de terceros.** Hoy es exportar/importar (con "Compartir" en Android). Sincronización directa: WebRTC con emparejamiento por código o QR.
3. [ ] Reordenar tareas; tareas con hora o franja del día.
4. [ ] Tests de pantallas (hoy solo hay de lógica y datos).
5. [ ] Firmar el APK para poder actualizarlo sin desinstalar.
6. [ ] Si algún día es comercial: cuentas, sincronización en la nube y monetización.
