/*!
 * 3D Group — comportamiento del sitio.
 * Kit de marca v1.0: un solo momento de movimiento (la franja diagonal al
 * cargar, resuelto en CSS). Todo dato editable vive en js/config.js.
 */
(function () {
  "use strict";

  var CFG = window.CONFIG_3D || {};
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) {
    return Array.prototype.slice.call((c || document).querySelectorAll(s));
  };

  /* ====================================================================
     1. Analítica — no carga nada si no está configurada
     ==================================================================== */
  var track = function () {};

  (function initAnalitica() {
    var a = CFG.analitica || {};
    if (!a.tipo || !a.id) return;

    if (a.tipo === "ga4") {
      var s = document.createElement("script");
      s.async = true;
      s.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(a.id);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", a.id);
      track = function (evento, datos) { window.gtag("event", evento, datos || {}); };
    } else if (a.tipo === "plausible") {
      var p = document.createElement("script");
      p.defer = true;
      p.setAttribute("data-domain", a.id);
      p.src = "https://plausible.io/js/script.tagged-events.js";
      document.head.appendChild(p);
      window.plausible = window.plausible || function () {
        (window.plausible.q = window.plausible.q || []).push(arguments);
      };
      track = function (evento, datos) { window.plausible(evento, { props: datos || {} }); };
    }
  })();

  /* Eventos de conversión: los tres que importan. */
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    if (href.indexOf("wa.me") > -1) track("contacto_whatsapp", { origen: location.pathname });
    else if (href.indexOf("tel:") === 0) track("contacto_telefono", { origen: location.pathname });
    else if (href.indexOf("mailto:") === 0) track("contacto_correo", { origen: location.pathname });
  });

  /* ====================================================================
     2. Datos de contacto inyectados desde la configuración
     ==================================================================== */
  var MSG = "Hola, quiero cotizar un servicio de aseo corporativo.";

  function waUrl(texto) {
    return "https://wa.me/" + CFG.whatsapp + "?text=" + encodeURIComponent(texto || MSG);
  }

  $$("[data-wa]").forEach(function (el) { el.setAttribute("href", waUrl()); });
  $$("[data-tel]").forEach(function (el) {
    el.setAttribute("href", "tel:" + CFG.telefono);
    if (el.hasAttribute("data-tel-texto")) el.textContent = CFG.telefonoVisible;
  });
  $$("[data-correo]").forEach(function (el) {
    el.setAttribute("href", "mailto:" + CFG.correo +
      "?subject=" + encodeURIComponent("Cotización de servicio · 3D Group"));
    if (el.hasAttribute("data-correo-texto")) el.textContent = CFG.correo;
  });

  /* La promesa de respuesta sólo aparece si hay uno que cumplir. */
  $$("[data-promesa]").forEach(function (el) {
    if (CFG.promesaRespuesta) el.textContent = CFG.promesaRespuesta;
    else el.remove();
  });

  /* ====================================================================
     3. Navegación
     ==================================================================== */
  var nav = $("#nav"), toggle = $("#navToggle"), menu = $("#navMenu");

  function closeMenu() {
    menu.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Abrir menú");
  }

  if (toggle && menu) {
    toggle.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    });
    menu.addEventListener("click", function (e) { if (e.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) { closeMenu(); toggle.focus(); }
    });
  }

  if (nav) {
    var ticking = false;
    var onScroll = function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        nav.classList.toggle("is-scrolled", window.scrollY > 40);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ====================================================================
     4. Configurador · «Arma tu requerimiento»
     Cuatro pasos de un clic. Al final el lead sale ya calificado: con
     recinto, superficie, frecuencia y servicios no hace falta una ronda
     de correos previa para preparar la visita técnica.
     ==================================================================== */
  var wiz = $("#wizard");
  if (wiz) {
    var pasos = $$(".wz__paso", wiz);
    var barra = $(".wz__progreso i", wiz);
    var elegido = {};
    var i = 0;

    function pintar() {
      pasos.forEach(function (p, n) { p.hidden = n !== i; });
      if (barra) barra.style.width = ((i + 1) / pasos.length * 100) + "%";
      $$(".wz__n", wiz).forEach(function (el, n) {
        el.classList.toggle("is-on", n <= i);
      });
      var h = pasos[i].querySelector("h3");
      if (h) h.setAttribute("tabindex", "-1"), h.focus({ preventScroll: true });
      wiz.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }

    function resumen() {
      return [
        "Recinto: " + (elegido.recinto || "—"),
        "Superficie: " + (elegido.superficie || "—"),
        "Frecuencia: " + (elegido.frecuencia || "—"),
        "Servicios: " + (elegido.servicios || "—")
      ].join("\n");
    }

    /* Último paso: vuelca el resumen y deja el botón como enlace real, para
       que funcione aunque se abra en otra pestaña. */
    function finalizar() {
      var caja = $("#wzResumen", wiz);
      if (caja) caja.textContent = resumen();
      var env = $("[data-wz-enviar]", wiz);
      if (env) env.setAttribute("href", waUrl("Hola, quiero cotizar:\n\n" + resumen()));
      track("configurador_completado", elegido);
    }

    wiz.addEventListener("click", function (e) {
      var op = e.target.closest(".wz__op");
      if (op) {
        elegido[op.getAttribute("data-campo")] = op.getAttribute("data-valor");
        $$('.wz__op[data-campo="' + op.getAttribute("data-campo") + '"]', wiz)
          .forEach(function (o) { o.setAttribute("aria-pressed", String(o === op)); });
        if (i < pasos.length - 1) {
          i++;
          pintar();
          if (i === pasos.length - 1) finalizar();
        }
        return;
      }
      var atras = e.target.closest("[data-wz-atras]");
      if (atras && i > 0) { i--; pintar(); return; }

      if (e.target.closest("[data-wz-enviar]")) track("configurador_enviado", elegido);
    });

    pintar();
  }

  /* ====================================================================
     5. Formulario de cotización
     Sin endpoint configurado envía por WhatsApp, que funciona desde ya.
     Con endpoint, envía por HTTP y deja registro; WhatsApp queda como
     alternativa. En ningún caso se pierde el lead en un mailto que el
     navegador puede no saber abrir.
     ==================================================================== */
  var form = $("#cotizaForm");
  if (form) {
    var estado = $("#formEstado");
    var btn = form.querySelector('[type="submit"]');

    function valores() {
      var d = {};
      $$("input[name], select[name], textarea[name]", form).forEach(function (el) {
        d[el.name] = el.value.trim();
      });
      return d;
    }

    function textoWa(d) {
      return "Hola, quiero cotizar:\n\n" +
        "Nombre: " + d.nombre + "\n" +
        "Empresa: " + (d.empresa || "—") + "\n" +
        "Correo: " + (d.email || "—") + "\n" +
        "Teléfono: " + (d.telefono || "—") + "\n" +
        "Tipo de recinto: " + d.recinto + "\n" +
        "Servicio: " + d.servicio + "\n\n" +
        "Detalle:\n" + (d.mensaje || "—");
    }

    function aviso(texto, tipo) {
      if (!estado) return;
      estado.textContent = texto;
      estado.className = "form__estado is-" + tipo;
      estado.hidden = false;
    }

    /* Botón «Enviar por WhatsApp»: siempre disponible. */
    var waBtn = $("[data-form-wa]", form);
    if (waBtn) {
      waBtn.addEventListener("click", function () {
        if (!form.reportValidity()) return;
        track("formulario_whatsapp", { origen: location.pathname });
        window.open(waUrl(textoWa(valores())), "_blank", "noopener");
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = valores();

      if (!CFG.formEndpoint) {
        track("formulario_whatsapp", { origen: location.pathname });
        window.open(waUrl(textoWa(d)), "_blank", "noopener");
        return;
      }

      var original = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Enviando…"; }

      fetch(CFG.formEndpoint, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(d)
      }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        track("formulario_enviado", { origen: location.pathname });
        form.reset();
        aviso("Recibimos tu solicitud. Te contactamos a la brevedad.", "ok");
      }).catch(function () {
        aviso("No pudimos enviar el formulario. Escríbenos por WhatsApp y lo resolvemos al tiro.", "error");
      }).then(function () {
        if (btn) { btn.disabled = false; btn.textContent = original; }
      });
    });
  }

  /* ====================================================================
     6. Año en el pie
     ==================================================================== */
  var anio = $("#anio");
  if (anio) anio.textContent = new Date().getFullYear();
})();
