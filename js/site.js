/*!
 * 3D Group | Comportamiento del sitio.
 * Los datos de contacto y la analítica se editan en js/config.js.
 */
(function () {
  "use strict";

  var CFG = window.CONFIG_3D || {};
  var doc = document;
  var raiz = doc.documentElement;
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var limitar = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var movimientoReducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  raiz.classList.remove("no-js");
  raiz.classList.add("js");

  /* ==================================================================
     Analítica: no carga nada si no está configurada
     ================================================================== */
  var track = function () {};
  (function () {
    var a = CFG.analitica || {};
    if (!a.tipo || !a.id) return;
    if (a.tipo === "ga4") {
      var s = doc.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(a.id);
      doc.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", a.id);
      track = function (evento, datos) { window.gtag("event", evento, datos || {}); };
    } else if (a.tipo === "plausible") {
      var p = doc.createElement("script");
      p.defer = true;
      p.setAttribute("data-domain", a.id);
      p.src = "https://plausible.io/js/script.tagged-events.js";
      doc.head.appendChild(p);
      window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
      track = function (evento, datos) { window.plausible(evento, { props: datos || {} }); };
    }
  })();

  doc.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var origen = { origen: location.pathname };
    if (href.indexOf("wa.me") > -1) track("contacto_whatsapp", origen);
    else if (href.indexOf("tel:") === 0) track("contacto_telefono", origen);
    else if (href.indexOf("mailto:") === 0) track("contacto_correo", origen);
    else if (href.indexOf("reportes.3dgroup.cl") > -1) track("acceso_app", origen);
  });

  /* ==================================================================
     Datos de contacto desde la configuración
     ================================================================== */
  var MENSAJE = "Hola, quiero cotizar un servicio de aseo corporativo.";
  function urlWhatsApp(texto) {
    return "https://wa.me/" + (CFG.whatsapp || "") + "?text=" + encodeURIComponent(texto || MENSAJE);
  }

  function aplicarContacto(r) {
    $$("[data-wa]", r).forEach(function (el) {
      el.setAttribute("href", urlWhatsApp(el.getAttribute("data-wa-texto")));
      if (!el.hasAttribute("target")) { el.setAttribute("target", "_blank"); el.setAttribute("rel", "noopener"); }
    });
    $$("[data-tel]", r).forEach(function (el) {
      el.setAttribute("href", "tel:" + (CFG.telefono || ""));
      if (el.hasAttribute("data-tel-texto")) el.textContent = CFG.telefonoVisible || CFG.telefono || "";
    });
    $$("[data-correo]", r).forEach(function (el) {
      el.setAttribute("href", "mailto:" + (CFG.correo || "") + "?subject=" + encodeURIComponent("Cotización de servicio | 3D Group"));
      if (el.hasAttribute("data-correo-texto")) el.textContent = CFG.correo || "";
    });
    $$("[data-promesa]", r).forEach(function (el) {
      if (CFG.promesaRespuesta) el.textContent = CFG.promesaRespuesta;
      else el.remove();
    });
    $$("[data-anio]", r).forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
  }

  /* ==================================================================
     Cabecera
     ================================================================== */
  var cabecera = $("[data-cabecera]");
  var ultimoY = 0;
  function actualizarCabecera(y) {
    if (!cabecera) return;
    cabecera.classList.toggle("is-fija", y > 8);
    var bajando = y > ultimoY;
    var ocultar = bajando && y > 640 && !raiz.classList.contains("menu-abierto");
    if (Math.abs(y - ultimoY) > 6) {
      cabecera.classList.toggle("is-oculta", ocultar);
      ultimoY = y;
    }
  }
  if (cabecera) {
    cabecera.addEventListener("focusin", function () { cabecera.classList.remove("is-oculta"); });
  }

  /* ==================================================================
     Menú móvil
     ================================================================== */
  var menu = $("[data-menu-movil]");
  var abrirMenu = $("[data-abrir-menu]");
  var enfocadoAntes = null;

  function enfocables() {
    return $$("a[href], button:not([disabled])", menu).filter(function (el) { return el.offsetParent !== null; });
  }
  function abrir() {
    if (!menu) return;
    enfocadoAntes = doc.activeElement;
    menu.hidden = false;
    raiz.classList.add("menu-abierto");
    doc.body.classList.add("sin-desplazar");
    abrirMenu.setAttribute("aria-expanded", "true");
    requestAnimationFrame(function () {
      menu.classList.add("is-abierto");
      var primero = $("[data-cerrar-menu]", menu);
      if (primero) primero.focus();
    });
  }
  function cerrar(devolverFoco) {
    if (!menu || menu.hidden) return;
    menu.classList.remove("is-abierto");
    raiz.classList.remove("menu-abierto");
    doc.body.classList.remove("sin-desplazar");
    abrirMenu.setAttribute("aria-expanded", "false");
    var fin = function () { if (!menu.classList.contains("is-abierto")) menu.hidden = true; };
    if (movimientoReducido) fin(); else setTimeout(fin, 380);
    if (devolverFoco !== false && enfocadoAntes && enfocadoAntes.focus) enfocadoAntes.focus();
  }
  if (menu && abrirMenu) {
    abrirMenu.addEventListener("click", abrir);
    $$("[data-cerrar-menu]", menu).forEach(function (b) { b.addEventListener("click", function () { cerrar(); }); });
    menu.addEventListener("click", function (e) { if (e.target.closest("a[href]")) cerrar(false); });
    doc.addEventListener("keydown", function (e) {
      if (menu.hidden) return;
      if (e.key === "Escape") { e.preventDefault(); cerrar(); return; }
      if (e.key === "Tab") {
        var lista = enfocables();
        if (!lista.length) return;
        var primero = lista[0], ultimo = lista[lista.length - 1];
        if (e.shiftKey && doc.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && doc.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
      }
    });
    window.addEventListener("resize", function () { if (window.innerWidth > 1024) cerrar(false); });
    window.addEventListener("pageshow", function () { cerrar(false); });
  }

  /* ==================================================================
     WhatsApp flotante: aparece al pasar la portada
     ================================================================== */
  var waFlotante = $("[data-wa-flotante]");
  var piePagina = $(".pie");
  function actualizarWa(y) {
    if (!waFlotante) return;
    waFlotante.classList.toggle("is-visible", y > window.innerHeight * 0.6);
    /* Sobre el pie ya hay un enlace a WhatsApp: el botón se retira */
    var cerca = piePagina ? piePagina.getBoundingClientRect().top < window.innerHeight - 24 : false;
    waFlotante.classList.toggle("cerca-del-pie", cerca);
  }

  /* ==================================================================
     Efectos ligados al desplazamiento (uno solo por cuadro)
     ================================================================== */
  var efectos = [];
  var pendiente = false;
  function correrEfectos() {
    pendiente = false;
    var y = window.pageYOffset || raiz.scrollTop || 0;
    actualizarCabecera(y);
    actualizarWa(y);
    var alto = window.innerHeight;
    for (var i = 0; i < efectos.length; i++) {
      var ef = efectos[i];
      if (ef.raiz !== doc && ef.raiz.hidden) continue;
      ef.fn(y, alto);
    }
  }
  function pedirCuadro() {
    if (pendiente) return;
    pendiente = true;
    requestAnimationFrame(correrEfectos);
  }
  window.addEventListener("scroll", pedirCuadro, { passive: true });
  window.addEventListener("resize", pedirCuadro, { passive: true });

  /* Progreso 0..1 de un elemento según su paso por la ventana */
  function progreso(el, desde, hasta) {
    var r = el.getBoundingClientRect();
    var alto = window.innerHeight;
    var inicio = alto * desde, fin = alto * hasta;
    return limitar((inicio - r.top) / (inicio - fin), 0, 1);
  }

  /* ==================================================================
     Maqueta 3D de la portada
     ================================================================== */
  function soportaWebGL() {
    try {
      var c = doc.createElement("canvas");
      var gl = c.getContext("webgl2") || c.getContext("webgl");
      if (!gl) return false;
      var ext = gl.getExtension("WEBGL_lose_context");
      if (ext) ext.loseContext();
      return true;
    } catch (e) { return false; }
  }

  function cargarEscena(src, listo) {
    if (window.Escena3D) { listo(); return; }
    if (!src) { listo(); return; }
    var s = doc.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = listo;
    s.onerror = listo;
    doc.head.appendChild(s);
  }

  function iniciarMaqueta(r) {
    var cont = $("[data-maqueta]", r);
    if (!cont || cont.getAttribute("data-montada")) return;
    cont.setAttribute("data-montada", "1");
    var portada = cont.closest("[data-portada]") || cont.parentNode;
    var enlaces = $$("[data-recinto]", portada);
    var etiqueta = $("[data-etiqueta]", cont);
    var etNombre = etiqueta && $("[data-etiqueta-nombre]", etiqueta);
    var etEnlace = etiqueta && $("[data-etiqueta-enlace]", etiqueta);
    var ahorro = navigator.connection && navigator.connection.saveData;

    function sinEscena() { cont.classList.add("sin-webgl"); }
    if (ahorro || !soportaWebGL()) { sinEscena(); return; }

    function porClave(clave) {
      for (var i = 0; i < enlaces.length; i++) if (enlaces[i].getAttribute("data-recinto") === clave) return enlaces[i];
      return null;
    }

    function montar() {
      if (!window.Escena3D) { sinEscena(); return; }
      var ctrl = window.Escena3D.montar(cont, {
        movimientoReducido: movimientoReducido,
        alResaltar: function (clave, pos) {
          enlaces.forEach(function (a) { a.classList.toggle("is-activo", a.getAttribute("data-recinto") === clave); });
          if (!etiqueta) return;
          var enlace = clave && porClave(clave);
          if (!enlace || !pos) { etiqueta.hidden = true; return; }
          etNombre.textContent = enlace.textContent;
          etEnlace.setAttribute("href", enlace.getAttribute("href"));
          etEnlace.textContent = enlace.getAttribute("data-accion") || "Ver cómo trabajamos";
          etiqueta.style.left = Math.round(pos.x) + "px";
          etiqueta.style.top = Math.round(pos.y) + "px";
          etiqueta.hidden = false;
        },
        alElegir: function (clave) {
          var enlace = porClave(clave);
          if (enlace) enlace.click();
        }
      });
      if (!ctrl) { sinEscena(); return; }
      enlaces.forEach(function (a) {
        var clave = a.getAttribute("data-recinto");
        a.addEventListener("mouseenter", function () { ctrl.resaltar(clave); });
        a.addEventListener("focus", function () { ctrl.resaltar(clave); });
        a.addEventListener("mouseleave", function () { ctrl.resaltar(null); });
        a.addEventListener("blur", function () { ctrl.resaltar(null); });
      });
      efectos.push({
        raiz: r,
        fn: function () {
          var p = limitar((window.pageYOffset || 0) / Math.max(1, portada.offsetHeight), 0, 1);
          ctrl.desplazar(p);
        }
      });
    }

    var arrancar = function () { cargarEscena(cont.getAttribute("data-escena-src"), montar); };
    if ("requestIdleCallback" in window) window.requestIdleCallback(arrancar, { timeout: 900 });
    else setTimeout(arrancar, 200);
  }

  /* ==================================================================
     Vitrina de la plataforma: el teléfono gira y cambia de pantalla
     ================================================================== */
  function iniciarVitrina(r) {
    $$("[data-vitrina]", r).forEach(function (vitrina) {
      var pasos = $$("[data-paso]", vitrina);
      var escenario = $(".vitrina__escenario", vitrina);
      var telefono = escenario && $(".telefono", escenario);
      var pantallas = escenario ? $$(".pantallas > .pantalla", escenario) : [];
      var contPantallas = escenario && $(".pantallas", escenario);
      if (!pasos.length || !telefono) return;
      var activo = -1;

      function fijar(i) {
        if (i === activo) return;
        activo = i;
        pasos.forEach(function (p, n) { p.classList.toggle("is-activo", n === i); });
        pantallas.forEach(function (p, n) { p.classList.toggle("is-activa", n === i); });
      }

      efectos.push({
        raiz: r,
        fn: function (y, alto) {
          var visible = escenario.offsetParent !== null && getComputedStyle(escenario).display !== "none";
          vitrina.classList.toggle("is-viva", visible);
          if (contPantallas) contPantallas.classList.toggle("is-control", visible);
          if (!visible) return;
          var centro = alto * 0.5, elegido = 0;
          for (var i = 0; i < pasos.length; i++) {
            if (pasos[i].getBoundingClientRect().top < centro) elegido = i;
          }
          fijar(elegido);
          if (movimientoReducido) return;
          var rv = vitrina.getBoundingClientRect();
          var p = limitar((centro - rv.top) / Math.max(1, rv.height), 0, 1);
          telefono.style.setProperty("--ry", (-24 + p * 36).toFixed(2) + "deg");
          telefono.style.setProperty("--rx", (9 - p * 5).toFixed(2) + "deg");
          telefono.style.setProperty("--rz", (1.5 - p * 3).toFixed(2) + "deg");
          telefono.style.setProperty("--brillo", (p * 70).toFixed(1) + "%");
        }
      });
    });
  }

  /* ==================================================================
     Ventanas y documentos que se enderezan al entrar
     ================================================================== */
  function iniciarInclinados(r) {
    if (movimientoReducido) return;
    $$("[data-inclinar]", r).forEach(function (el) {
      var tipo = el.getAttribute("data-inclinar");
      efectos.push({
        raiz: r,
        fn: function () {
          var p = progreso(el, 1.0, 0.35);
          if (tipo === "documento") {
            el.style.setProperty("--rx", (18 - p * 12).toFixed(2) + "deg");
            el.style.setProperty("--rz", (-5 + p * 3).toFixed(2) + "deg");
          } else {
            el.style.setProperty("--rx", (24 - p * 24).toFixed(2) + "deg");
          }
        }
      });
    });
  }

  /* ==================================================================
     Las 3 D: cada palabra se completa al pasar por el centro
     ================================================================== */
  function iniciarValores(r) {
    if (movimientoReducido) return;
    var palabras = $$(".valor", r);
    if (!palabras.length) return;
    efectos.push({
      raiz: r,
      fn: function () {
        palabras.forEach(function (v) { v.style.setProperty("--p", progreso(v, 0.92, 0.55).toFixed(3)); });
      }
    });
  }

  /* ==================================================================
     Fotos: un leve acercamiento al entrar (siempre visibles)
     ================================================================== */
  function iniciarFotos(r) {
    var fotos = $$(".foto", r);
    if (!fotos.length) return;
    if (!("IntersectionObserver" in window) || movimientoReducido) {
      fotos.forEach(function (f) { f.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    fotos.forEach(function (f) { io.observe(f); });
  }

  /* ==================================================================
     Asistente «Arma tu requerimiento»
     ================================================================== */
  function iniciarAsistente(r) {
    var as = $("[data-asistente]", r);
    if (!as) return;
    var pasos = $$("[data-asistente-paso]", as);
    var etapas = $$(".asistente__etapa", as);
    var elegido = {};
    var i = 0;

    function resumen() {
      return [
        "Recinto: " + (elegido.recinto || "Sin indicar"),
        "Superficie: " + (elegido.superficie || "Sin indicar"),
        "Frecuencia: " + (elegido.frecuencia || "Sin indicar"),
        "Servicios: " + (elegido.servicios || "Sin indicar")
      ].join("\n");
    }

    function pintar(enfocar) {
      pasos.forEach(function (p, n) { p.hidden = n !== i; });
      etapas.forEach(function (e, n) {
        e.classList.toggle("is-hecha", n < i);
        e.classList.toggle("is-actual", n === i);
        if (n === i) e.setAttribute("aria-current", "step"); else e.removeAttribute("aria-current");
      });
      if (i === pasos.length - 1) {
        var caja = $("[data-resumen]", as);
        if (caja) caja.textContent = resumen();
        var enviar = $("[data-enviar]", as);
        if (enviar) enviar.setAttribute("href", urlWhatsApp("Hola, quiero cotizar:\n\n" + resumen()));
        track("configurador_completado", elegido);
      }
      if (enfocar) {
        var h = pasos[i].querySelector("h3");
        if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
        var rect = as.getBoundingClientRect();
        if (rect.top < 80 || rect.top > window.innerHeight * 0.6) {
          as.scrollIntoView({ block: "start", behavior: movimientoReducido ? "auto" : "smooth" });
        }
      }
    }

    as.addEventListener("click", function (e) {
      var op = e.target.closest(".opcion");
      if (op) {
        var campo = op.getAttribute("data-campo");
        elegido[campo] = op.getAttribute("data-valor");
        $$('.opcion[data-campo="' + campo + '"]', as).forEach(function (o) {
          o.setAttribute("aria-pressed", String(o === op));
        });
        if (i < pasos.length - 1) { i++; pintar(true); }
        return;
      }
      if (e.target.closest("[data-volver]") && i > 0) { i--; pintar(true); return; }
      if (e.target.closest("[data-enviar]")) track("configurador_enviado", elegido);
    });
    pintar(false);
  }

  /* ==================================================================
     Formulario de cotización
     ================================================================== */
  function iniciarFormulario(r) {
    var form = $("[data-formulario]", r);
    if (!form) return;
    var estado = $("[data-formulario-estado]", form);
    var boton = form.querySelector('[type="submit"]');

    function valores() {
      var d = {};
      $$("input[name], select[name], textarea[name]", form).forEach(function (el) { d[el.name] = el.value.trim(); });
      return d;
    }
    function textoWa(d) {
      return "Hola, quiero cotizar:\n\n" +
        "Nombre: " + d.nombre + "\n" +
        "Empresa: " + (d.empresa || "Sin indicar") + "\n" +
        "Correo: " + (d.email || "Sin indicar") + "\n" +
        "Teléfono: " + (d.telefono || "Sin indicar") + "\n" +
        "Tipo de recinto: " + d.recinto + "\n" +
        "Servicio: " + d.servicio + "\n\n" +
        "Detalle:\n" + (d.mensaje || "Sin detalle");
    }
    function aviso(texto, tipo) {
      if (!estado) return;
      estado.textContent = texto;
      estado.className = "formulario__estado is-" + tipo;
      estado.hidden = false;
    }
    function abrirWa(d) {
      track("formulario_whatsapp", { origen: location.pathname });
      var w = window.open(urlWhatsApp(textoWa(d)), "_blank", "noopener");
      if (!w) location.href = urlWhatsApp(textoWa(d));
    }

    var botonWa = $("[data-formulario-wa]", form);
    /* Sin servicio de recepción configurado, el formulario se envía por
       WhatsApp: un solo botón, con el nombre de lo que de verdad hace. */
    if (!CFG.formEndpoint && botonWa && boton) {
      boton.innerHTML = botonWa.innerHTML;
      botonWa.hidden = true;
      botonWa = null;
    }
    if (botonWa) {
      botonWa.addEventListener("click", function () {
        if (!form.reportValidity()) return;
        abrirWa(valores());
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = valores();
      if (!CFG.formEndpoint) { abrirWa(d); return; }
      var original = boton ? boton.textContent : "";
      if (boton) { boton.disabled = true; boton.textContent = "Enviando..."; }
      fetch(CFG.formEndpoint, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(d)
      }).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        track("formulario_enviado", { origen: location.pathname });
        form.reset();
        aviso("Recibimos tu solicitud. Te contactamos a la brevedad.", "ok");
      }).catch(function () {
        aviso("No pudimos enviar el formulario. Escríbenos por WhatsApp y lo resolvemos al tiro.", "error");
      }).then(function () {
        if (boton) { boton.disabled = false; boton.textContent = original; }
      });
    });
  }

  /* ==================================================================
     Arranque
     ================================================================== */
  function iniciarPagina(r) {
    r = r || doc;
    aplicarContacto(r);
    iniciarMaqueta(r);
    iniciarVitrina(r);
    iniciarInclinados(r);
    iniciarValores(r);
    iniciarFotos(r);
    iniciarAsistente(r);
    iniciarFormulario(r);
    pedirCuadro();
  }

  window.Sitio = { iniciarPagina: iniciarPagina, refrescar: pedirCuadro };

  /* En el sitio publicado la página es todo el documento. La vista previa
     (un solo archivo con todas las páginas) inicia cada una por su cuenta. */
  if (!window.VISTA_PREVIA_3D) {
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", function () { iniciarPagina(doc); });
    else iniciarPagina(doc);
  } else {
    [cabecera, menu, piePagina, waFlotante].forEach(function (el) { if (el) aplicarContacto(el.parentNode || el); });
  }
})();
