/*!
 * 3D Group — comportamiento mínimo de la página.
 * Kit de marca v1.0: un solo momento de movimiento (la franja diagonal
 * al cargar, resuelto en CSS). Aquí sólo navegación y estado.
 */
(function () {
  "use strict";

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

  /* --- Enlace activo según la sección visible --------------------------- */
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

  /* --- Año en el footer -------------------------------------------------- */
  var anio = document.getElementById("anio");
  if (anio) anio.textContent = new Date().getFullYear();
})();
