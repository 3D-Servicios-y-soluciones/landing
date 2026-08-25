/*!
 * 3D Group — comportamiento de la página.
 * Kit de marca v1.0: un solo momento de movimiento (la franja diagonal
 * al cargar, resuelto en CSS). Aquí sólo navegación y formulario.
 */
(function () {
  "use strict";

  /* --- Datos de contacto (único lugar donde se editan) ------------------ */
  var CONTACTO = {
    correo: "contacto@3dgroup.cl"
  };

  var nav = document.getElementById("nav");
  var toggle = document.getElementById("navToggle");
  var menu = document.getElementById("navMenu");

  /* --- Menú móvil ------------------------------------------------------- */
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

    menu.addEventListener("click", function (e) {
      if (e.target.closest("a")) closeMenu();
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menu.classList.contains("is-open")) {
        closeMenu();
        toggle.focus();
      }
    });
  }

  /* --- Nav compacta al hacer scroll ------------------------------------- */
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(function () {
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
      ticking = false;
    });
  }
  if (nav) {
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* --- Enlace activo dentro de una misma página (anclas) ---------------- */
  var links = Array.prototype.slice.call(
    document.querySelectorAll('.nav__menu ul a[href^="#"]')
  );
  var sections = links
    .map(function (a) { return document.querySelector(a.getAttribute("href")); })
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          links.forEach(function (a) {
            a.classList.toggle(
              "is-active",
              a.getAttribute("href") === "#" + entry.target.id
            );
          });
        });
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 }
    );
    sections.forEach(function (s) { observer.observe(s); });
  }

  /* --- Formulario de cotización ----------------------------------------
     El sitio es estático (GitHub Pages, sin backend), así que el formulario
     redacta el correo y lo abre en el cliente de la persona. No se envía
     nada a terceros ni se almacena ningún dato.
     -------------------------------------------------------------------- */
  var form = document.getElementById("cotizaForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = function (id) {
        var el = document.getElementById(id);
        return el && el.value ? el.value.trim() : "";
      };

      var cuerpo = [
        "Nombre: " + v("nombre"),
        "Empresa: " + (v("empresa") || "—"),
        "Correo: " + v("email"),
        "Teléfono: " + (v("telefono") || "—"),
        "Tipo de recinto: " + v("recinto"),
        "Servicio: " + v("servicio"),
        "",
        "Detalle:",
        v("mensaje") || "—"
      ].join("\n");

      var asunto = "Cotización · " + v("servicio") + " · " + (v("empresa") || v("nombre"));

      window.location.assign(
        "mailto:" + CONTACTO.correo +
        "?subject=" + encodeURIComponent(asunto) +
        "&body=" + encodeURIComponent(cuerpo)
      );
    });
  }

  /* --- Año en el footer -------------------------------------------------- */
  var anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
})();
