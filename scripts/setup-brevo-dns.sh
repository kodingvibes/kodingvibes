#!/usr/bin/env bash
# ------------------------------------------------------------------------------
# setup-brevo-dns.sh
#
# Agrega el registro TXT de verificación de Brevo al DNS de kodingvibes.com
# (gestionado por Vercel). El valor de verificación se pide interactivamente
# para que no quede en el historial del shell.
#
# Requisitos:
#   - vercel CLI logueado (vercel login) y con acceso al proyecto/production
#   - jq (https://stedolan.github.io/jq/) para parsear respuestas de la API
#
# Uso:
#   ./scripts/setup-brevo-dns.sh                # producción (kodingvibes.com)
#   VERIFICATION_TOKEN=brevo-domain-verification=... ./scripts/setup-brevo-dns.sh
#   DOMAIN=staging.kodingvibes.com ./scripts/setup-brevo-dns.sh
# ------------------------------------------------------------------------------

set -euo pipefail

DOMAIN="${DOMAIN:-kodingvibes.com}"
HOST_NAME="@"
RECORD_TYPE="TXT"
RECORD_NAME="_dmarc"  # Brevo a veces usa _dmarc o @; ajustable

# 1) Verificar que vercel esté logueado
if ! vercel whoami >/dev/null 2>&1; then
  echo "[error] No estás logueado en Vercel CLI. Corré: vercel login" >&2
  exit 1
fi

# 2) Verificar que jq esté disponible (lo usamos para esperar a que el
#    registro propague y para listar de forma prolija)
if ! command -v jq >/dev/null 2>&1; then
  echo "[warn] jq no está instalado. La verificación de propagación puede fallar." >&2
  HAS_JQ=0
else
  HAS_JQ=1
fi

# 3) Obtener el token de verificación de Brevo (interactivo, no en historial)
if [[ -z "${VERIFICATION_TOKEN:-}" ]]; then
  echo
  echo "Brevo te da un registro TXT con este formato:"
  echo "  brevo-domain-verification=XXXXXXXXXXXXXXXX"
  echo
  read -r -s -p "Pegá acá SOLO el valor (lo que va después del =): " TOKEN_VALUE
  echo
  if [[ -z "${TOKEN_VALUE}" ]]; then
    echo "[error] Token vacío. Abortando." >&2
    exit 1
  fi
else
  TOKEN_VALUE="${VERIFICATION_TOKEN}"
fi

FULL_RECORD_NAME="$HOST_NAME"
echo
echo "[info] Dominio:       $DOMAIN"
echo "[info] Nombre host:   $FULL_RECORD_NAME"
echo "[info] Tipo:          $RECORD_TYPE"
echo "[info] Valor:         brevo-domain-verification=$TOKEN_VALUE"
echo

read -r -p "¿Agregar este registro? [y/N] " CONFIRM
if [[ "${CONFIRM,,}" != "y" ]]; then
  echo "Cancelado."
  exit 0
fi

# 4) Verificar si ya existe un TXT en el root
echo "[info] Listando registros TXT actuales en $DOMAIN ..."
EXISTING=$(vercel dns ls "$DOMAIN" --json 2>/dev/null || true)
if [[ "$HAS_JQ" -eq 1 ]] && [[ -n "$EXISTING" ]]; then
  CURRENT_TXT=$(echo "$EXISTING" | jq -r --arg n "$FULL_RECORD_NAME" --arg t "$RECORD_TYPE" \
    '.[] | select(.name==$n and .type==$t) | .value' 2>/dev/null || true)
  if [[ -n "$CURRENT_TXT" && "$CURRENT_TXT" != "null" ]]; then
    echo "[warn] Ya existe un TXT en $FULL_RECORD_NAME con valor:"
    echo "         $CURRENT_TXT"
    read -r -p "¿Reemplazarlo? [y/N] " REPLACE
    if [[ "${REPLACE,,}" != "y" ]]; then
      echo "Cancelado."
      exit 0
    fi
    # Borrar el existente
    RECORD_ID=$(echo "$EXISTING" | jq -r --arg n "$FULL_RECORD_NAME" --arg t "$RECORD_TYPE" \
      '.[] | select(.name==$n and .type==$t) | .id' | head -n1)
    if [[ -n "$RECORD_ID" && "$RECORD_ID" != "null" ]]; then
      echo "[info] Borrando registro existente ($RECORD_ID) ..."
      vercel dns rm "$RECORD_ID" "$DOMAIN" --yes
    fi
  fi
fi

# 5) Agregar el registro TXT
echo "[info] Agregando TXT a $DOMAIN ..."
vercel dns add "$DOMAIN" "$FULL_RECORD_NAME" "$RECORD_TYPE" "brevo-domain-verification=$TOKEN_VALUE"

# 6) Esperar a que propague (DNS simple check)
echo "[info] Esperando a que propague (máx 5 min) ..."
EXPECTED="brevo-domain-verification=$TOKEN_VALUE"
ATTEMPTS=0
MAX_ATTEMPTS=60
PROPAGATED=0
while [[ $ATTEMPTS -lt $MAX_ATTEMPTS ]]; do
  # Consultar TXT público vía Google DNS-over-HTTPS
  RESP=$(curl -fsS "https://dns.google/resolve?name=$DOMAIN&type=TXT" 2>/dev/null || true)
  if [[ -n "$RESP" ]] && echo "$RESP" | grep -q "$EXPECTED"; then
    PROPAGATED=1
    break
  fi
  ATTEMPTS=$((ATTEMPTS + 1))
  printf "."
  sleep 5
done
echo

if [[ $PROPAGATED -eq 1 ]]; then
  echo "[ok] TXT propagado."
  echo "[next] Andá a Brevo → Settings → Senders & Domains → kodingvibes.com → Verify."
else
  echo "[warn] No se detectó propagación en $((MAX_ATTEMPTS * 5))s. Puede seguir propagando en background."
  echo "        Reintentá el botón Verify en Brevo en unos minutos."
fi
