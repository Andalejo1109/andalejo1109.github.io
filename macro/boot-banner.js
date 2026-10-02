/**
 * Inyecta la cinta macro (iframe) arriba del body y ajusta nav sticky.
 * También monta el panel de tarjetas (secundario) al final del body, antes del footer.
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
    "body.macro-has-banner .nav{position:relative;top:auto;z-index:auto}" +
    /* Bottom cards panel */
    "#macro-home{scroll-margin-top:140px}" +
    ".macro-home-wrap{width:min(100%,1000px);margin:0 auto;padding:2.2rem 1.3rem 1rem;font-family:Inter,system-ui,sans-serif;color:#ECEFF4}" +
    ".macro-home-wrap .mh-eye{font-family:\"IBM Plex Mono\",ui-monospace,Menlo,monospace;color:#2BE8A8;font-size:.74rem;letter-spacing:.16em;text-transform:uppercase}" +
    ".macro-home-wrap h2{font-family:\"Space Grotesk\",system-ui,sans-serif;font-size:clamp(1.5rem,4vw,2.1rem);margin:.3rem 0 .6rem;font-weight:700}" +
    ".macro-home-lead{color:#8993A8;font-size:.92rem;margin:0 0 1rem;max-width:640px;line-height:1.5}" +
    ".macro-upd{display:inline-block;margin:0 0 1rem;padding:.55rem .9rem;border-radius:8px;background:rgba(91,156,255,.12);border:1px solid rgba(91,156,255,.35);font-size:.88rem;font-weight:600}" +
    ".macro-upd span{color:#5B9CFF;font-weight:700}" +
    ".macro-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}" +
    ".macro-card{background:#161B27;border:1px solid #262E40;border-radius:12px;padding:14px 14px 12px}" +
    ".macro-card.trm{border-color:rgba(255,200,87,.45);background:linear-gradient(145deg,#241c14 0%,#161B27 70%);grid-column:span 2}" +
    "@media(max-width:480px){.macro-card.trm{grid-column:span 1}}" +
    ".macro-card-sym{font-size:11px;font-weight:700;letter-spacing:.05em;color:#8993A8;text-transform:uppercase}" +
    ".macro-card.trm .macro-card-sym{color:#FFC857}" +
    ".macro-card-name{font-size:11px;color:#8993A8;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".macro-card-price{font-size:1.3rem;font-weight:700;margin-top:10px;font-variant-numeric:tabular-nums}" +
    ".macro-card.trm .macro-card-price{color:#FFC857;font-size:1.5rem}" +
    ".macro-card-chg{margin-top:4px;font-size:.9rem;font-weight:600}" +
    ".macro-card-chg.up{color:#2BE8A8}.macro-card-chg.down{color:#FF5C72}.macro-card-chg.flat{color:#8993A8}" +
    ".macro-card-src{margin-top:8px;font-size:10px;color:#8993A8}" +
    ".macro-home-disc{margin-top:1rem;padding:12px 14px;border-radius:8px;background:#161B27;border:1px solid #262E40;font-size:12px;color:#8993A8;line-height:1.5}" +
    ".macro-home-disc a{color:#2BE8A8;text-decoration:none}";
  document.head.appendChild(css);

  function mountBanner() {
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

    var links = document.querySelector(".nav-links");
    if (links && !links.querySelector('a[href="#macro-home"]') && !links.querySelector('a[href="/macro/"]')) {
      var a = document.createElement("a");
      a.href = "#macro-home";
      a.textContent = "Macro";
      links.appendChild(a);
    }
  }

  function fmt(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return n.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function chgClass(p) {
    if (p == null || Number.isNaN(p)) return "flat";
    if (p > 0.0005) return "up";
    if (p < -0.0005) return "down";
    return "flat";
  }
  function fmtChg(p) {
    if (p == null || Number.isNaN(p)) return "—";
    return (p > 0 ? "+" : "") + p.toFixed(2) + "%";
  }
  function updLabel(d) {
    return d.updated_at_display || ((d.updated_at || "").replace("T", " ").slice(0, 19) + " COT") || "—";
  }

  function mountCards() {
    if (document.getElementById("macro-home")) return;
    var path = (location.pathname || "/").replace(/\/+$/, "") || "/";
    var isHome = path === "/" || path === "/index.html" || path.endsWith("/andalejo1109.github.io");
    if (!isHome && !document.body.hasAttribute("data-macro-cards")) return;

    var section = document.createElement("section");
    section.className = "macro-home-wrap";
    section.id = "macro-home";
    section.setAttribute("aria-label", "Panel macro TRM y mercados");
    section.innerHTML =
      '<div class="mh-eye">Macro</div>' +
      "<h2>TRM y mercados</h2>" +
      '<p class="macro-home-lead">Cinta arriba + tarjetas abajo. TRM BanRep oficial; cotizaciones eToro (educativo, no asesoría).</p>' +
      '<div class="macro-upd" id="macro-home-upd">Actualizado: …</div>' +
      '<div class="macro-cards" id="macro-home-cards">Cargando…</div>' +
      '<div class="macro-home-disc"><strong>Actualizado:</strong> <span id="macro-home-upd2">…</span>. ' +
      "TRM = BanRep (datos.gov.co). USDCOP eToro ≠ TRM. COLCAP = proxy CFD eToro (Colombia Index), no el índice oficial BVC. " +
      '<a href="/macro/">Ver panel completo →</a></div>';

    var footer = document.querySelector("footer");
    if (footer && footer.parentElement) {
      footer.parentElement.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }

    loadCards();
  }

  async function loadCards() {
    var cards = document.getElementById("macro-home-cards");
    var upd = document.getElementById("macro-home-upd");
    var upd2 = document.getElementById("macro-home-upd2");
    if (!cards) return;
    try {
      var res = await fetch("/macro/data/macro.json?t=" + Date.now());
      if (!res.ok) throw new Error("HTTP " + res.status);
      var data = await res.json();
      var label = updLabel(data);
      if (upd) upd.innerHTML = "Actualizado: <span>" + label + "</span>";
      if (upd2) upd2.textContent = label;
      var parts = [];
      var trm = data.trm || {};
      parts.push(
        '<div class="macro-card trm"><div class="macro-card-sym">TRM BanRep</div>' +
          '<div class="macro-card-name">Oficial · ' + (trm.date || "") + " · " + (trm.source || "") + "</div>" +
          '<div class="macro-card-price">$' + fmt(trm.value) + "</div>" +
          '<div class="macro-card-src">COP por USD</div></div>'
      );
      (data.quotes || []).forEach(function (q) {
        var c = chgClass(q.change_pct_1d);
        parts.push(
          '<div class="macro-card"><div class="macro-card-sym">' + q.symbol + "</div>" +
            '<div class="macro-card-name" title="' + (q.name || "") + '">' + (q.name || "") + "</div>" +
            '<div class="macro-card-price">' + fmt(q.price) + "</div>" +
            '<div class="macro-card-chg ' + c + '">' + fmtChg(q.change_pct_1d) + "</div>" +
            '<div class="macro-card-src">' + (q.source || "") + "</div></div>"
        );
      });
      cards.innerHTML = parts.join("");
    } catch (e) {
      cards.innerHTML =
        '<div class="macro-card" style="color:#FF5C72;grid-column:1/-1">Sin datos macro (' +
        (e.message || "error") +
        ")</div>";
    }
  }

  function mount() {
    mountBanner();
    mountCards();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount);
  } else {
    mount();
  }
})();
