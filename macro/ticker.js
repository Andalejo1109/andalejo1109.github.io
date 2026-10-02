/**
 * Cinta macro TRM + mercados — embebe en el sitio.
 * Carga /macro/data/macro.json (ruta relativa configurable).
 */
(function () {
  const DEFAULT_JSON = "/macro/data/macro.json";

  function fmtPrice(sym, n) {
    if (n == null || Number.isNaN(n)) return "—";
    const d = 2;
    return n.toLocaleString("es-CO", { minimumFractionDigits: d, maximumFractionDigits: d });
  }
  function chgClass(p) {
    if (p == null || Number.isNaN(p)) return "flat";
    if (p > 0.0005) return "up";
    if (p < -0.0005) return "down";
    return "flat";
  }
  function fmtChg(p) {
    if (p == null || Number.isNaN(p)) return "—";
    const sign = p > 0 ? "+" : "";
    return sign + p.toFixed(2) + "%";
  }

  function formatUpdated(data) {
    if (data.updated_at_display) return data.updated_at_display;
    if (!data.updated_at) return "—";
    return data.updated_at.replace("T", " ").slice(0, 19) + " COT";
  }

  function render(el, data) {
    const parts = [];
    const upd = formatUpdated(data);
    // Timestamp first / prominent in banner
    parts.push(
      '<div class="mt-item mt-updated" title="Fecha y hora de última actualización">' +
        '<span class="mt-label">Actualizado</span>' +
        '<div class="mt-row"><span class="mt-upd-time">' + upd + "</span></div>" +
      "</div>"
    );
    const trm = data.trm || {};
    parts.push(
      '<div class="mt-item mt-trm">' +
        '<span class="mt-label">TRM BanRep</span>' +
        '<div class="mt-row"><span class="mt-price">$' + fmtPrice("TRM", trm.value) + "</span></div>" +
      "</div>"
    );
    (data.quotes || []).forEach(function (q) {
      const cls = chgClass(q.change_pct_1d);
      parts.push(
        '<div class="mt-item">' +
          '<span class="mt-label">' + q.symbol + "</span>" +
          '<div class="mt-row">' +
            '<span class="mt-price">' + fmtPrice(q.symbol, q.price) + "</span>" +
            '<span class="mt-chg ' + cls + '">' + fmtChg(q.change_pct_1d) + "</span>" +
          "</div>" +
        "</div>"
      );
    });
    parts.push(
      '<div class="mt-meta">' +
        '<a href="/macro/" title="Panel macro completo">Macro</a>' +
        "<span>Actualizado: " + upd + "</span>" +
      "</div>"
    );
    el.innerHTML = parts.join("");
  }

  async function boot(targetId, jsonUrl) {
    const el = document.getElementById(targetId || "macro-ticker");
    if (!el) return;
    const url = (jsonUrl || el.getAttribute("data-src") || DEFAULT_JSON) + "?t=" + Date.now();
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("HTTP " + res.status);
      render(el, await res.json());
    } catch (e) {
      el.innerHTML =
        '<div class="mt-item" style="color:#FF5C72;padding:10px 14px">Sin datos macro (' +
        (e.message || "error") +
        ")</div>";
    }
  }

  window.MacroTicker = { boot: boot };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      boot("macro-ticker");
    });
  } else {
    boot("macro-ticker");
  }
})();
