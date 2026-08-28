/*!
 * 3D Group — configuración del sitio.
 *
 * Este es el ÚNICO archivo que hay que editar para cambiar datos de contacto,
 * activar la analítica o conectar el formulario a un servicio de recepción.
 * No hace falta tocar el HTML.
 */
window.CONFIG_3D = {

  /* --- Contacto -------------------------------------------------------- */
  whatsapp: "56984763991",              // sólo dígitos, con código de país
  telefono: "+56984763991",             // para el enlace de llamada
  telefonoVisible: "+56 9 8476 3991",   // como se muestra en pantalla
  correo: "contacto@3dgroup.cl",

  /* --- Formulario ------------------------------------------------------
     Vacío = el formulario envía por WhatsApp (funciona desde ya).
     Para que además llegue por correo y quede registrado, crea un formulario
     en formspree.io o web3forms.com y pega aquí la URL de envío. El formulario
     pasa solo a enviarlo por HTTP, y WhatsApp queda como alternativa.
     Ejemplo: "https://formspree.io/f/xxxxxxx"
     -------------------------------------------------------------------- */
  formEndpoint: "",

  /* --- Analítica -------------------------------------------------------
     tipo vacío = no se carga nada (ni scripts ni cookies).
       "ga4"       -> id como "G-XXXXXXXXXX". Requiere aviso de cookies.
       "plausible" -> id es el dominio, "www.3dgroup.cl". Sin cookies.
     Con cualquiera de los dos se registran tres eventos de conversión:
     clic en WhatsApp, clic en teléfono y envío del formulario.
     -------------------------------------------------------------------- */
  analitica: { tipo: "", id: "" },

  /* --- Promesa de respuesta --------------------------------------------
     Aparece junto a los botones de contacto. Déjalo vacío mientras no haya
     un plazo que se pueda cumplir siempre: prometer y fallar cuesta más que
     no prometer. Ejemplo: "Te respondemos dentro del día hábil."
     -------------------------------------------------------------------- */
  promesaRespuesta: ""
};
