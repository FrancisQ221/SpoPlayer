# Contribuir a SpoPlayer / Contributing to SpoPlayer

¡Gracias por tu interés en colaborar con **SpoPlayer**! Toda contribución que mejore la experiencia de usuario, corrija errores o añada valor al reproductor es bienvenida.

---

## 🚀 Cómo empezar / Getting Started

1. **Haz un Fork del repositorio:**  
   Haz clic en el botón **Fork** en la esquina superior derecha de [https://github.com/FrancisQ221/SpoPlayer](https://github.com/FrancisQ221/SpoPlayer).

2. **Clona tu copia localmente:**
   ```bash
   git clone https://github.com/TU_USUARIO/SpoPlayer.git
   cd SpoPlayer
   git remote add upstream https://github.com/FrancisQ221/SpoPlayer.git
   ```

3. **Instala las dependencias:**
   ```bash
   pnpm install
   ```

4. **Inicia el entorno de desarrollo:**
   ```bash
   pnpm run dev
   ```

---

## 🛠️ Flujo de Trabajo / Development Workflow

1. Crea una rama descriptiva para tu cambio:
   ```bash
   git checkout -b feat/mi-nueva-funcion
   # o para corrección de errores:
   git checkout -b fix/solucion-bug
   ```

2. Realiza tus modificaciones respetando la estructura del proyecto:
   * `src/features/`: Módulos principales (*player, lyrics, scrobbler, stats, settings, shortcuts*).
   * `electron/`: Proceso principal de Electron, integración con la bandeja del sistema (*System Tray*), atajos globales y Discord RPC.
   * `src/shared/`: Componentes UI reutilizables, hooks y almacenamiento de datos.

3. Verifica que la compilación pase sin errores:
   ```bash
   pnpm run build
   ```

4. Haz commit con mensajes claros y descriptivos:
   ```bash
   git commit -m "feat(player): añadir nueva opción de ecualización"
   ```

5. Sube tu rama a tu fork y abre un **Pull Request** hacia la rama `main` de [FrancisQ221/SpoPlayer](https://github.com/FrancisQ221/SpoPlayer).

---

## 🐛 Reportar Errores o Sugerir Ideas / Issues

Si encuentras un error o tienes una idea para mejorar SpoPlayer:
* Revisa primero si no ha sido reportado en los [Issues existentes](https://github.com/FrancisQ221/SpoPlayer/issues).
* Si es nuevo, abre un [Nuevo Issue](https://github.com/FrancisQ221/SpoPlayer/issues/new) detallando:
  * Sistema operativo (Windows 10 / 11, etc.).
  * Versión de SpoPlayer o commit utilizado.
  * Pasos para reproducir el error.
  * Capturas de pantalla o logs de la consola si aplica.

---

## 📜 Licencia

Al contribuir a SpoPlayer, aceptas que tus contribuciones se distribuyan bajo los términos de la **Licencia MIT**. Consulta [LICENSE](./LICENSE) para más detalles.
