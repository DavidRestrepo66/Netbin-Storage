/**
 * authGuard.js - Responsabilidad Única: Proteger páginas privadas en el frontend.
 * Verifica la existencia del token en localStorage.
 * Si no hay sesión activa → redirige al login.
 * Si hay sesión → permite la carga de la página e inyecta datos del usuario.
 *
 * USO: Incluir con <script src="js/authGuard.js"></script>
 *      ANTES de cualquier otro script de la página protegida.
 */

(function AuthGuard() {
  'use strict';

  const TOKEN_KEY = 'nb_token';
  const USER_KEY  = 'nb_user';
  const LOGIN_URL = '/login.html';

  /**
   * Verifica si existe un token válido en localStorage.
   * @returns {boolean}
   */
  const hasSession = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token !== null && token.trim() !== '';
  };

  /**
   * Redirige al login si no hay sesión activa.
   */
  if (!hasSession()) {
    window.location.replace(LOGIN_URL);
    // Detiene la ejecución del resto del script
    throw new Error('[AuthGuard] Sin sesión. Redirigiendo al login...');
  }

  /**
   * Expone los datos del usuario al scope global
   * para que otros scripts puedan usarlos.
   */
  window.NB_SESSION = {
    token: localStorage.getItem(TOKEN_KEY),
    user:  JSON.parse(localStorage.getItem(USER_KEY) || '{}')
  };

  /**
   * logout: Limpia la sesión y redirige al login.
   * Disponible globalmente para el botón de cierre de sesión.
   */
  window.NB_SESSION.logout = async function () {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${window.NB_SESSION.token}` }
      });
    } catch (e) {
      // Si el servidor no responde, cerrar sesión de todas formas
    } finally {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      window.location.replace(LOGIN_URL);
    }
  };
})();
