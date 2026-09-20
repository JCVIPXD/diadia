/** Vibración breve al completar algo (Android); en otros dispositivos no hace nada. */
export function buzz() {
  try {
    navigator.vibrate?.(12)
  } catch {
    // sin soporte: solo se pierde el detalle táctil
  }
}
