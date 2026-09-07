const KEY = "rutamercado-v2-zero";
const COP = n => "$" + Math.round(Number(n) || 0).toLocaleString("es-CO");
const uid = () => "n-" + Date.now() + "-" + Math.floor(Math.random() * 999);
function seedItems(names) {
  return names.map(name => ({ id: uid(), name, qty: "", status: "pending", added: false, paid: 0 }));
}
const SEED = {
  stores: [
    { id: "d1", name: "D1", note: "Despensa, nevera y aseo", total: 0, receiptImg: "",
      items: seedItems(["Arroz (2 libras)","Panela","Leche en bolsa","Pan sándwich","Queso sándwich","Promasa amarilla arepas grande","Queso bloque arepas","Crema dental roja","Zabras amarillas","Ajo molido","Pimienta","Cúruma","Salsa de soya","Vinagre","Bolsas de basura blanca pequeña","Bolsas de basura verde","Masa de torta","Cerezas","Servilletas de mesa","Jabón de manos","Espagueti largo","Protectores diarios","Jabón Dove (2)"]) },
    { id: "fruver", name: "Fruver / verduras", note: "Plaza o Campos", total: 0, receiptImg: "",
      items: seedItems(["Apio","Pepino","Cebolla larga","Tomate","Cebolla cabezona / morada (2)","Ahuyama","Habichuela","Arveja desgranada","Papa blanca","Cilantro","Espinaca","Zanahoria","Banano","Fresa","Papaya","Mango","Pulpa de mora","Pulpa de lulo","Pulpa de guanábana"]) },
    { id: "carnes", name: "Carnicería", note: "Carnes, pollo, pescado y huevos", total: 0, receiptImg: "",
      items: seedItems(["Carne de res 2 libras (paquetes x3)","Pechuga fileteada (2)","Tilapia (6)","Chatas (2) x3","Cuadritos de pollo (2 bolsas)","Huevos"]) }
  ]
};
let state = load();
let tab = "pendientes";
let ocr = { storeId: "d1", lines: [], raw: "", busy: false, img: "" };
function load() {
  try { const raw = localStorage.getItem(KEY); if (raw) return JSON.parse(raw); } catch (e) {}
  return structuredClone(SEED);
}
function save() { localStorage.setItem(KEY, JSON.stringify(state)); }
function allItems() { return state.stores.flatMap(s => s.items.map(i => ({ ...i, store: s.name, storeId: s.id }))); }
function stats() {
  const items = allItems();
  return { pending: items.filter(i => i.status === "pending"), done: items.filter(i => i.status === "done"), added: items.filter(i => i.added), spent: state.stores.reduce((a, s) => a + (Number(s.total) || 0), 0), items };
}
function render() {
  const s = stats();
  document.getElementById("cPend").textContent = s.pending.length;
  document.getElementById("cDone").textContent = s.done.length;
  document.getElementById("cNew").textContent = s.added.length;
  document.getElementById("cSpent").textContent = COP(s.spent);
  const denom = s.pending.length + s.done.length || 1;
  document.getElementById("bar").style.width = Math.round(s.done.length / denom * 100) + "%";
  document.getElementById("tabs").innerHTML = [["pendientes","Pendientes"],["d1","D1"],["fruver","Fruver"],["carnes","Carnes"],["factura","Factura OCR"],["resumen","Completitud"]].map(([id,label]) => `<button class="${tab===id?"on":""}" data-tab="${id}">${label}</button>`).join("");
  const app = document.getElementById("app");
  if (tab === "pendientes") app.innerHTML = renderPending(s.pending);
  else if (tab === "factura") app.innerHTML = renderOCR();
  else if (tab === "resumen") app.innerHTML = renderSummary(s);
  else app.innerHTML = renderStore(state.stores.find(x => x.id === tab));
  bind();
}
function itemRow(it, storeId, compact) {
  const badge = it.added ? `<span class="badge new">Nuevo</span>` : (it.status === "pending" ? `<span class="badge pend">Falta</span>` : "");
  return `<div class="item ${it.status==="done"?"done":""}" data-id="${it.id}" data-store="${storeId}"><button class="check" title="Marcar llevado"></button><div><div class="name">${escapeHtml(it.name)} ${badge}</div><div class="meta">${escapeHtml(it.qty || "")}${it.paid ? " · " + COP(it.paid) : ""}</div></div>${compact ? "" : `<button class="ghost tiny btn-del">Quitar</button>`}</div>`;
}
function renderPending(pending) {
  if (!pending.length) return `<section class="store"><h2>Nada pendiente</h2><p class="meta">La lista base está completa.</p></section>`;
  const by = {};
  pending.forEach(i => { (by[i.storeId] ||= { name: i.store, items: [] }).items.push(i); });
  return Object.entries(by).map(([sid, g]) => `<section class="store"><div class="store-head"><div><h2>${g.name}</h2><small>${g.items.length} pendiente${g.items.length===1?"":"s"}</small></div></div>${g.items.map(i => itemRow(i, sid, true)).join("")}</section>`).join("") + `<p class="hint">Toca el cuadro para marcar llevado. Solo ves lo que falta, por sitio.</p>`;
}
function renderStore(store) {
  if (!store) return "";
  return `<section class="store"><div class="store-head"><div><h2>${store.name}</h2><small>${store.note}</small></div><div class="money">${COP(store.total)}</div></div><div class="add-box"><input data-add="${store.id}" placeholder="Añadir producto a ${store.name}" /><button class="primary btn-add" data-store="${store.id}">+</button></div>${store.items.map(i => itemRow(i, store.id, false)).join("")}<div class="row"><span class="meta">Total de esta parada</span><input type="number" min="0" step="50" data-total="${store.id}" value="${store.total || ""}" placeholder="0" style="width:140px" /></div></section>`;
}
function renderOCR() {
  const options = state.stores.map(s => `<option value="${s.id}" ${s.id===ocr.storeId?"selected":""}>${s.name}</option>`).join("");
  const lines = ocr.lines.map((ln, idx) => `<div class="ocr-line"><div>${escapeHtml(ln.text)}${ln.price ? `<div class="meta">${COP(ln.price)}</div>` : ""}</div><button class="ghost tiny btn-ocr-add" data-idx="${idx}">Añadir al final</button></div>`).join("");
  return `<section class="store"><div class="store-head"><div><h2>Factura con OCR</h2><small>Lee productos y el total; tú confirmas</small></div></div><label class="meta">Parada de esta factura</label><select id="ocrStore" style="width:100%;margin:6px 0 10px">${options}</select><div class="row"><label class="file-btn">Foto de factura<input id="ocrFile" type="file" accept="image/*" capture="environment" hidden /></label><input id="ocrTotal" type="number" min="0" step="50" placeholder="Total factura" style="width:150px" value="${state.stores.find(s=>s.id===ocr.storeId).total || ""}" /></div><p class="status" id="ocrStatus">${ocr.busy ? "Leyendo factura…" : (ocr.raw ? "Revisa las líneas y añade las que falten." : "Toma o sube la foto del ticket.")}</p>${ocr.img ? `<img class="thumb" alt="Factura" src="${ocr.img}" />` : ""}${lines ? `<div style="margin-top:10px">${lines}</div>` : ""}<div class="row"><button class="primary" id="applyTotal">Guardar total en la parada</button><button class="ghost" id="matchPending">Marcar coincidencias</button></div></section><p class="hint">Lo que no esté en la lista se añade al final como producto nuevo.</p>`;
}
function renderSummary(s) {
  const originalTotal = state.stores.reduce((a, st) => a + st.items.filter(i => !i.added).length, 0);
  const originalDone = state.stores.reduce((a, st) => a + st.items.filter(i => !i.added && i.status === "done").length, 0);
  const byStore = state.stores.map(st => {
    const pend = st.items.filter(i => i.status === "pending").length;
    const done = st.items.filter(i => i.status === "done").length;
    const neu = st.items.filter(i => i.added).length;
    return `<div class="item"><div></div><div><div class="name">${st.name} ${pend===0 ? `<span class="badge new">Completo</span>` : `<span class="badge pend">${pend} faltan</span>`}</div><div class="meta">Llevados ${done} · Nuevos ${neu} · Pendientes ${pend}</div></div><div class="money">${COP(st.total)}</div></div>`;
  }).join("");
  const list = (arr, empty) => arr.map(i => `<p class="meta" style="padding:6px 0;border-top:1px solid var(--line)">${i.store} · ${escapeHtml(i.name)}</p>`).join("") || `<p class="empty">${empty}</p>`;
  return `<section class="store"><div class="store-head"><div><h2>Completitud del mercado</h2><small>Llevados / faltantes / nuevos / gastado</small></div><div class="money">${COP(s.spent)}</div></div>${byStore}<p class="meta" style="margin-top:10px">Lista original: ${originalDone} de ${originalTotal} llevados.</p></section><section class="store"><h2>Faltantes</h2>${list(s.pending, "Ninguno")}</section><section class="store"><h2>Llevados</h2>${list(s.done, "Ninguno aún")}</section><section class="store"><h2>Nuevos añadidos</h2>${list(s.added, "Ninguno")}</section><p class="hint"><button class="ghost" id="reset">Empezar mercado desde cero</button></p>`;
}
function bind() {
  document.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => { tab = b.dataset.tab; render(); });
  document.querySelectorAll(".item .check").forEach(b => b.onclick = () => {
    const found = findItem(b.closest(".item").dataset.id);
    if (!found) return;
    found.item.status = found.item.status === "pending" ? "done" : "pending";
    save(); render();
  });
  document.querySelectorAll(".btn-del").forEach(b => b.onclick = () => {
    const row = b.closest(".item");
    const store = state.stores.find(s => s.id === row.dataset.store);
    store.items = store.items.filter(i => i.id !== row.dataset.id);
    save(); render();
  });
  document.querySelectorAll(".btn-add").forEach(b => b.onclick = () => addManual(b.dataset.store));
  document.querySelectorAll("[data-add]").forEach(inp => inp.addEventListener("keydown", e => { if (e.key === "Enter") addManual(inp.dataset.add); }));
  document.querySelectorAll("[data-total]").forEach(inp => inp.onchange = () => {
    const s = state.stores.find(x => x.id === inp.dataset.total);
    s.total = Number(inp.value || 0); save(); render();
  });
  const reset = document.getElementById("reset");
  if (reset) reset.onclick = () => {
    if (confirm("¿Borrar marcas, extras y totales de este mercado?")) {
      localStorage.removeItem(KEY); state = structuredClone(SEED); render();
    }
  };
  const ocrStore = document.getElementById("ocrStore");
  if (ocrStore) ocrStore.onchange = () => { ocr.storeId = ocrStore.value; render(); };
  const ocrFile = document.getElementById("ocrFile");
  if (ocrFile) ocrFile.onchange = e => { const f = e.target.files && e.target.files[0]; if (f) runOCR(f); };
  document.querySelectorAll(".btn-ocr-add").forEach(b => b.onclick = () => {
    const ln = ocr.lines[Number(b.dataset.idx)];
    if (ln) addNew(ocr.storeId, ln.text, ln.price || 0);
  });
  const applyTotal = document.getElementById("applyTotal");
  if (applyTotal) applyTotal.onclick = () => {
    state.stores.find(x => x.id === ocr.storeId).total = Number(document.getElementById("ocrTotal").value || 0);
    save(); render();
  };
  const matchBtn = document.getElementById("matchPending");
  if (matchBtn) matchBtn.onclick = matchFromOCR;
}
function addManual(storeId) {
  const inp = document.querySelector(`[data-add="${storeId}"]`);
  const name = (inp.value || "").trim();
  if (!name) return;
  addNew(storeId, name, 0);
  inp.value = "";
}
function addNew(storeId, name, paid) {
  state.stores.find(s => s.id === storeId).items.push({ id: uid(), name, qty: "", status: "pending", added: true, paid: Number(paid) || 0 });
  save(); render();
}
function findItem(id) {
  for (const s of state.stores) {
    const it = s.items.find(x => x.id === id);
    if (it) return { store: s, item: it };
  }
  return null;
}
function escapeHtml(str) {
  return String(str || "").replace(/[&<>"']/g, c => ({ "&":"&","<":"<",">":">","\"":""","'":"&#39;" }[c]));
}
function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}
function parseReceipt(text) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(l => l.length > 2);
  const skip = /^(nit|iva|total|subtotal|cambio|caja|fecha|cliente|gracias|resolucion|dian|factura|pago|tarjeta|efectivo|impuesto|base|item|cant)/i;
  const parsed = [];
  let total = 0;
  for (const line of lines) {
    const compact = line.replace(/\./g, "").replace(/,/g, "");
    const nums = compact.match(/(\d{3,7})/g);
    const lastNum = nums ? Number(nums[nums.length - 1]) : 0;
    if (/total/i.test(line) && lastNum >= 1000) total = Math.max(total, lastNum);
    if (skip.test(line)) continue;
    const words = line.replace(/[0-9$.,]+/g, " ").replace(/\s+/g, " ").trim();
    if (words.length < 3) continue;
    parsed.push({ text: words.slice(0, 60), price: lastNum >= 500 ? lastNum : 0 });
  }
  return { lines: parsed.slice(0, 40), total };
}
function bestMatch(name, store) {
  const n = norm(name);
  let best = null, score = 0;
  for (const it of store.items) {
    const a = norm(it.name);
    if (!a || !n) continue;
    let sc = 0;
    if (a.includes(n) || n.includes(a)) sc = Math.min(a.length, n.length);
    else sc = n.split(" ").filter(w => w.length > 3 && a.split(" ").includes(w)).length * 4;
    if (sc > score) { score = sc; best = it; }
  }
  return score >= 4 ? best : null;
}
function matchFromOCR() {
  const store = state.stores.find(s => s.id === ocr.storeId);
  let marked = 0;
  ocr.lines.forEach(ln => {
    const hit = bestMatch(ln.text, store);
    if (hit && hit.status === "pending") { hit.status = "done"; marked++; }
  });
  save(); render();
  const el = document.getElementById("ocrStatus");
  if (el) el.textContent = marked ? "Marcados " + marked + " producto(s) de la lista." : "No hubo coincidencias claras. Añade las líneas nuevas al final.";
}
async function runOCR(file) {
  ocr.busy = true; render();
  const dataUrl = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  ocr.img = dataUrl;
  const store = state.stores.find(s => s.id === ocr.storeId);
  store.receiptImg = dataUrl;
  try {
    const worker = await Tesseract.createWorker("spa");
    const { data } = await worker.recognize(dataUrl);
    await worker.terminate();
    ocr.raw = data.text || "";
    const parsed = parseReceipt(ocr.raw);
    ocr.lines = parsed.lines;
    if (parsed.total) store.total = parsed.total;
    ocr.busy = false; save(); render();
    const el = document.getElementById("ocrStatus");
    if (el) el.textContent = parsed.lines.length ? "Leí " + parsed.lines.length + " líneas. Añade las nuevas o marca coincidencias." : "No pude leer productos. Escribe el total a mano.";
    const tot = document.getElementById("ocrTotal");
    if (tot && parsed.total) tot.value = parsed.total;
  } catch (err) {
    ocr.busy = false; render();
    const el = document.getElementById("ocrStatus");
    if (el) el.textContent = "No se pudo leer la foto. Escribe el total y añade productos a mano.";
  }
}
render();
