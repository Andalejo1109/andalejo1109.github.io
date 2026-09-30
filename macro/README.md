# Panel macro — TRM + mercados

Cinta superior y panel de tarjetas para [andalejo1109.github.io](https://andalejo1109.github.io/).

## URLs en vivo

- Cinta en la home: https://andalejo1109.github.io/
- Demo completa: https://andalejo1109.github.io/macro/
- Solo cinta (iframe): https://andalejo1109.github.io/macro/ticker.html
- JSON: https://andalejo1109.github.io/macro/data/macro.json

## Fuentes

| Serie | Fuente | Notas |
|-------|--------|--------|
| TRM | BanRep / datos.gov.co | Oficial Colombia |
| SPY, QQQ, OIL, GOLD, USDCOP | eToro (snapshot) | Mid bid/ask; requiere claves para refrescar |
| COLCAP | eToro CFD `Colombia` (id 689) | Proxy; **no** es el COLCAP oficial BVC |
| VIX | Yahoo Finance | Auxiliar |

**USDCOP eToro ≠ TRM BanRep.** Uso educativo; no es asesoría de inversión.

## Actualizar datos en GitHub Pages

El JSON en Pages es **estático** hasta que se regenera y se hace commit/push.

```bash
cd macro
python3 fetch_macro.py   # TRM siempre; eToro si hay ETORO_API_KEY + ETORO_USER_KEY
```

Sin claves eToro: conserva las últimas cotizaciones eToro del JSON y refresca TRM (+ VIX/Yahoo si disponible).

Workflow opcional: `.github/workflows/macro-refresh.yml` (cron) actualiza TRM + partes públicas y hace commit del JSON. Cotizaciones eToro solo si los secrets `ETORO_API_KEY` y `ETORO_USER_KEY` están configurados.
