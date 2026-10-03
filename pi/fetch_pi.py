#!/usr/bin/env python3
"""Refresca pi/stats.json con el ranking público de Andalejo1109.

Usa ETORO_API_KEY + ETORO_USER_KEY (los mismos secrets que macro).
Si no hay claves, sale 0 y deja el último snapshot.
Sharpe no viene en eToro: se conserva el valor ya guardado (BullAware).
"""
from __future__ import annotations

import json
import os
import sys
import uuid
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "stats.json"
USERNAME = "Andalejo1109"
PERIOD = "CurrYear"
URL = f"https://public-api.etoro.com/api/v2/portfolios/{USERNAME}/rankings?period={PERIOD}"
BOGOTA = ZoneInfo("America/Bogota")
# Etiqueta pública fija: Champion por debajo de US$400.000 de AUC.
# No mapear subType de eToro (pi-elite llega antes de ese umbral).


def format_updated_display(dt: datetime) -> str:
    meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]
    h = dt.hour
    ampm = "a.m." if h < 12 else "p.m."
    h12 = h % 12 or 12
    return f"{dt.day} {meses[dt.month - 1]} {dt.year}, {h12}:{dt.minute:02d} {ampm} COT"


def aum_label(value: float) -> str:
    if value >= 1_000_000:
        return f"US$ {value / 1_000_000:.2f} mill."
    if value >= 1000:
        return f"US$ {value / 1000:.1f} mil"
    return f"US$ {value:,.0f}"


def load_prev() -> dict:
    if OUT.exists():
        return json.loads(OUT.read_text(encoding="utf-8"))
    return {}


def main() -> int:
    api_key = os.environ.get("ETORO_API_KEY")
    user_key = os.environ.get("ETORO_USER_KEY")
    if not api_key or not user_key:
        print(
            "AVISO: sin ETORO_API_KEY+ETORO_USER_KEY; se conserva pi/stats.json",
            file=sys.stderr,
        )
        return 0

    req = urllib.request.Request(
        URL,
        headers={
            "User-Agent": "pi-stats/1.0",
            "Accept": "application/json",
            "x-api-key": api_key,
            "x-user-key": user_key,
            "x-request-id": str(uuid.uuid4()),
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:400]
        print(f"AVISO: eToro HTTP {e.code}: {body}", file=sys.stderr)
        return 0
    except Exception as e:
        print(f"AVISO: eToro falló ({e}); se conserva el snapshot", file=sys.stderr)
        return 0

    row = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(row, dict) or row.get("copiers") is None:
        print("AVISO: respuesta sin fila de ranking; no se escribe", file=sys.stderr)
        return 0

    prev = load_prev()
    gain = float(row["gain"])
    aum = float(row["aumValue"])
    copiers = int(row["copiers"])
    risk = int(row["riskScore"])
    sub = row.get("subType") or ""
    # eToro subType (p. ej. pi-elite) no es la etiqueta pública.
    # Champion hasta US$400.000 de AUC; Elite solo a partir de ese monto.
    level = "Elite" if aum >= 400_000 else "Champion"
    now = datetime.now(BOGOTA)
    sharpe = prev.get("sharpe", 1.3)
    sharpe_label = prev.get("sharpeLabel", "1.30")
    out = {
        "username": USERNAME,
        "updatedAt": now.isoformat(timespec="seconds"),
        "updatedLabel": format_updated_display(now),
        "timezone": "America/Bogota",
        "period": PERIOD,
        "kicker": f"Registro en vivo · Pro Investor, nivel {level}",
        "subType": sub,
        "level": level,
        "aumUsd": round(aum),
        "aumLabel": aum_label(aum),
        "aumTierDesc": row.get("aumTierDesc"),
        "copiers": copiers,
        "riskScore": risk,
        "lowLeveragePct": row.get("lowLeveragePct"),
        "ytdGain": gain,
        "ytdLabel": f"{gain * 100:+.2f}%",
        "sharpe": sharpe,
        "sharpeLabel": sharpe_label,
        "sources": {
            "aumUsd": f"eToro Public API GET /api/v2/portfolios/{USERNAME}/rankings?period={PERIOD} aumValue",
            "copiers": "eToro Public API rankings copiers",
            "riskScore": "eToro Public API rankings riskScore",
            "ytdGain": "eToro Public API rankings gain (fracción; CurrYear = YTD)",
            "subType": "eToro Public API rankings subType",
            "sharpe": "BullAware (no está en eToro). Se conserva el último valor guardado.",
        },
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"PI {USERNAME}: AUC {out['aumLabel']} · copiers {copiers} · risk {risk} · YTD {out['ytdLabel']} · {level}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
