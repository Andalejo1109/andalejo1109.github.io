#!/usr/bin/env python3
"""Actualiza data/macro.json: TRM BanRep siempre; eToro si hay claves o snapshot."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data" / "macro.json"
TRM_URL = (
    "https://www.datos.gov.co/resource/32sa-8pi3.json"
    "?%24order=vigenciadesde%20DESC&%24limit=1"
)
ETORO_SEARCH = "https://public-api.etoro.com/api/v1/market-data/search"
ETORO_RATES = "https://public-api.etoro.com/api/v1/market-data/instruments/rates"
# (panel_symbol, eToro internalSymbolFull)
ETORO_SYMBOLS = [
    ("SPY", "SPY"),
    ("QQQ", "QQQ"),
    ("COLCAP", "Colombia"),  # CFD Colombia Index (id 689); proxy COLCAP
    ("OIL", "OIL"),
    ("GOLD", "GOLD"),
    ("USDCOP", "USDCOP"),
]
BOGOTA = ZoneInfo("America/Bogota")

def format_updated_display(dt: datetime) -> str:
    """Fecha/hora en español colombiano corto, p.ej. '2 oct 2026, 4:05 p.m. COT'."""
    meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    h = dt.hour
    ampm = "a.m." if h < 12 else "p.m."
    h12 = h % 12 or 12
    return f"{dt.day} {meses[dt.month - 1]} {dt.year}, {h12}:{dt.minute:02d} {ampm} COT"



def http_json(url: str, headers: dict | None = None, timeout: int = 20):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "macro-panel/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.loads(resp.read().decode("utf-8"))


def fetch_trm():
    rows = http_json(TRM_URL)
    if not rows:
        raise RuntimeError("TRM vacía")
    row = rows[0]
    vig = str(row.get("vigenciadesde", ""))[:10]
    return {
        "value": float(row["valor"]),
        "date": vig,
        "unidad": row.get("unidad", "COP"),
        "source": "BanRep/datos.gov.co",
        "dataset": "32sa-8pi3",
    }


def fetch_vix_optional():
    try:
        url = "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d"
        data = http_json(url, {"User-Agent": "Mozilla/5.0"})
        meta = data["chart"]["result"][0]["meta"]
        return {
            "symbol": "VIX",
            "name": "Cboe Volatility Index",
            "price": float(meta["regularMarketPrice"]),
            "change_pct_1d": float(meta.get("regularMarketChangePercent") or 0),
            "source": "Yahoo Finance (público)",
            "instrument_id": None,
            "optional": True,
        }
    except Exception as e:
        print(f"AVISO: VIX omitido ({e})", file=sys.stderr)
        return None


def fetch_colcap_yahoo_fallback():
    """Si eToro no tiene Colombia Index: MSCI COLCAP STRD COP vía Yahoo."""
    try:
        url = (
            "https://query1.finance.yahoo.com/v8/finance/chart/"
            "%5E737809-COP-STRD?interval=1d&range=1d"
        )
        data = http_json(url, {"User-Agent": "Mozilla/5.0"})
        meta = data["chart"]["result"][0]["meta"]
        return {
            "symbol": "COLCAP",
            "name": "MSCI COLCAP STRD COP",
            "price": float(meta["regularMarketPrice"]),
            "change_pct_1d": float(meta.get("regularMarketChangePercent") or 0),
            "source": "Yahoo Finance (público) — MSCI COLCAP",
            "instrument_id": None,
            "yahoo_symbol": "^737809-COP-STRD",
            "note": "Fallback público; eToro sin Colombia Index",
            "optional": True,
        }
    except Exception as e:
        print(f"AVISO: COLCAP Yahoo omitido ({e})", file=sys.stderr)
        return None


def load_existing():
    if DATA.exists():
        return json.loads(DATA.read_text(encoding="utf-8"))
    return {"quotes": [], "notes": []}


def quotes_from_snapshot(path: Path):
    snap = json.loads(path.read_text(encoding="utf-8"))
    if "quotes" in snap:
        return snap["quotes"]
    return snap


def fetch_etoro_http(api_key: str, user_key: str):
    headers = {
        "User-Agent": "macro-panel/1.0",
        "x-api-key": api_key,
        "x-user-key": user_key,
        "Accept": "application/json",
    }
    quotes = []
    ids = []
    meta = {}
    for panel_sym, etoro_sym in ETORO_SYMBOLS:
        q = urllib.parse.urlencode({"internalSymbolFull": etoro_sym})
        data = http_json(f"{ETORO_SEARCH}?{q}", headers)
        items = data if isinstance(data, list) else data.get("items") or data.get("Instruments") or []
        if isinstance(data, dict) and not items:
            for k in ("results", "data", "instruments"):
                if isinstance(data.get(k), list):
                    items = data[k]
                    break
        hit = None
        for it in items:
            s = it.get("internalSymbolFull") or it.get("symbol") or it.get("SymbolFull")
            if s and s.upper() == etoro_sym.upper():
                hit = it
                break
        if not hit and items:
            hit = items[0]
        if not hit:
            print(f"AVISO: no se resolvió {panel_sym} (eToro {etoro_sym})", file=sys.stderr)
            continue
        iid = hit.get("instrumentId") or hit.get("InstrumentID") or hit.get("instrumentID") or hit.get("internalInstrumentId")
        name = hit.get("instrumentDisplayName") or hit.get("internalInstrumentDisplayName") or hit.get("name") or panel_sym
        price = hit.get("currentRate") or hit.get("CurrentRate")
        chg = hit.get("dailyPriceChange") or hit.get("DailyPriceChange")
        entry = {
            "symbol": panel_sym,
            "name": name,
            "price": price,
            "change_pct_1d": chg,
            "instrument_id": int(iid),
        }
        if panel_sym == "COLCAP":
            entry["name"] = "Índice Colombia (Colombia Index)"
            entry["etoro_symbol"] = "Colombia"
            entry["note"] = (
                "CFD eToro símbolo Colombia (Colombia Index); "
                "proxy COLCAP — no es el índice BVC oficial"
            )
        elif panel_sym == "OIL":
            entry["note"] = "CFD petróleo eToro"
        elif panel_sym == "GOLD":
            entry["note"] = "CFD oro eToro"
        elif panel_sym == "USDCOP":
            entry["note"] = "FX eToro; no es TRM BanRep"
        meta[int(iid)] = entry
        ids.append(str(iid))
    if ids:
        rates = http_json(f"{ETORO_RATES}?instrumentIds={','.join(ids)}", headers)
        rate_list = rates if isinstance(rates, list) else rates.get("rates") or rates.get("Rates") or []
        for r in rate_list:
            iid = int(r.get("instrumentId") or r.get("InstrumentID"))
            ask = r.get("ask") or r.get("Ask")
            bid = r.get("bid") or r.get("Bid")
            if iid in meta and ask is not None and bid is not None:
                meta[iid]["ask"] = float(ask)
                meta[iid]["bid"] = float(bid)
                meta[iid]["price"] = round((float(ask) + float(bid)) / 2, 4)
            if iid in meta and r.get("lastExecution") is not None and meta[iid].get("price") is None:
                meta[iid]["price"] = float(r["lastExecution"])
    for iid, q in meta.items():
        if q.get("price") is None:
            print(f"AVISO: sin precio para {q['symbol']}", file=sys.stderr)
            continue
        if q.get("change_pct_1d") is not None:
            q["change_pct_1d"] = float(q["change_pct_1d"])
        q["price"] = float(q["price"])
        q["source"] = "eToro"
        quotes.append(q)
    order = {s: i for i, (s, _) in enumerate(ETORO_SYMBOLS)}
    quotes.sort(key=lambda x: order.get(x["symbol"], 99))
    return quotes


def main():
    DATA.parent.mkdir(parents=True, exist_ok=True)
    existing = load_existing()
    notes = list(existing.get("notes") or [])
    base_notes = [
        "USDCOP is eToro FX, not official TRM",
        "OIL y GOLD son CFD eToro sin vencimiento",
        "COLCAP panel = eToro CFD 'Colombia' (id 689); no es el índice oficial BVC/MSCI",
        "Educativo; no es asesoría de inversión",
    ]
    for n in base_notes:
        if n not in notes:
            notes.append(n)

    trm = fetch_trm()
    print(f"TRM BanRep: {trm['value']} ({trm['date']})")

    quotes = None
    snap = os.environ.get("ETORO_SNAPSHOT")
    api_key = os.environ.get("ETORO_API_KEY")
    user_key = os.environ.get("ETORO_USER_KEY")

    if snap:
        quotes = quotes_from_snapshot(Path(snap))
        print(f"eToro: leído snapshot {snap}")
    elif api_key and user_key:
        try:
            quotes = fetch_etoro_http(api_key, user_key)
            print(f"eToro HTTP: {len(quotes)} símbolos")
        except Exception as e:
            print(f"AVISO: eToro HTTP falló ({e}); se conservan cotizaciones previas", file=sys.stderr)
    else:
        print(
            "AVISO: sin ETORO_API_KEY+ETORO_USER_KEY ni ETORO_SNAPSHOT; "
            "se conservan últimos campos eToro. Ver fetch_etoro_via_mcp.md",
            file=sys.stderr,
        )

    if quotes is None:
        quotes = [
            q
            for q in (existing.get("quotes") or [])
            if q.get("symbol") not in ("VIX",)
            and not (q.get("optional") and q.get("symbol") == "COLCAP" and "Yahoo" in (q.get("source") or ""))
        ]

    # COLCAP fallback si eToro no lo trajo
    has_colcap = any(q.get("symbol") == "COLCAP" for q in quotes)
    if not has_colcap:
        col = fetch_colcap_yahoo_fallback()
        if col:
            insert_at = 0
            for i, q in enumerate(quotes):
                if q.get("symbol") == "QQQ":
                    insert_at = i + 1
                    break
            quotes.insert(insert_at, col)
            print(f"COLCAP Yahoo fallback: {col['price']}")

    vix = fetch_vix_optional()
    quotes = [q for q in quotes if q.get("symbol") != "VIX"]
    if vix:
        quotes.append(vix)

    now = datetime.now(BOGOTA)
    out = {
        "updated_at": now.isoformat(timespec="seconds"),
        "updated_at_display": format_updated_display(now),
        "timezone": "America/Bogota",
        "trm": trm,
        "quotes": quotes,
        "notes": notes,
    }
    DATA.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Escrito {DATA}")


if __name__ == "__main__":
    main()
