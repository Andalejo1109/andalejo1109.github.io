/**
 * Inyecta la cinta macro (iframe) arriba del body y ajusta nav sticky.
 * Añadir en cualquier página: <script src="/macro/boot-banner.js" defer></script>
 */
(function () {
  if (window.__macroBannerBooted) return;
  window.__macroBannerBooted = true;

  var css = document.createElement("style");
  css.textContent =
    ".mt-stack{position:sticky;top:0;z-index:30}" +
    "iframe.macro-ticker{display:block;width:100%;height:56px;border:0;background:#0B0E14;overflow:hidden}" +
    ".mt-stack .nav{position:relative;top:auto !important}" +
    "body.macro-has-banner .nav{position:relative;top:auto;z-index:auto}";
  document.head.appendChild(css);

  function mount() {
    if (document.getElementById("macro-ticker-frame")) return;
    document.body.classList.add("macro-has-banner");

    var stack = document.createElement("div");
    stack.className = "mt-stack";
    stack.id = "macro-stack";

    var frame = document.createElement("iframe");
    frame.className = "macro-ticker";
    frame.id = "macro-ticker-frame";
    frame.src = "/macro/ticker.html";
    frame.title = "Cinta macro TRM y mercados";
    frame.loading = "eager";

    var nav = document.querySelector("nav.nav") || document.querySelector("nav");
    if (nav && nav.parentElement === document.body) {
      stack.appendChild(frame);
      nav.parentElement.insertBefore(stack, nav);
      stack.appendChild(nav);
    } else {
      stack.appendChild(frame);
      document.body.insertBefore(stack, document.body.firstChild);
    }

    // Link Macro en nav si existe
    var links = document.querySelector(".nav-links");
    if (links && !links.querySelector('a[href="/macro/"]')) {
      var a = document.createElement("a");
      a.href = "/macro/";
      a.textContent = "Macro";
      links.appendChild(a);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
