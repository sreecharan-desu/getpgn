#!/usr/bin/env bash
# Replace all Vercel env vars with values from local .env files.
# Usage: ./scripts/sync-vercel-env.sh [path-to-env-source-dir]
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_DIR="${1:-/Users/sreecharandesu/Projects/notamate-mvp}"
ENVIRONMENTS=(production preview development)

SENSITIVE_KEYS=(
  DATABASE_URL
  JWT_SECRET
  AI_API_KEY
  RESEND_API_KEY
  RAZORPAY_KEY_ID
  RAZORPAY_KEY_SECRET
  RAZORPAY_MONTHLY_PLAN_ID
  RAZORPAY_YEARLY_PLAN_ID
  RAZORPAY_WEBHOOK_SECRET
)

cd "$ROOT"

if ! vercel whoami >/dev/null 2>&1; then
  echo "Not logged in. Run: vercel login"
  exit 1
fi

if [[ ! -f .vercel/project.json ]]; then
  echo "Linking Vercel project (getpgn)..."
  vercel link --yes --project getpgn
fi

merge_env() {
  local tmp
  tmp="$(mktemp)"
  : >"$tmp"
  for f in "$SOURCE_DIR/.env" "$SOURCE_DIR/.env.local"; do
    [[ -f "$f" ]] || continue
    echo "# from $f" >>"$tmp"
    grep -v '^#' "$f" | grep -v '^[[:space:]]*$' >>"$tmp" || true
  done
  echo "$tmp"
}

is_sensitive() {
  local key="$1"
  for s in "${SENSITIVE_KEYS[@]}"; do
    [[ "$key" == "$s" ]] && return 0
  done
  return 1
}

strip_quotes() {
  local v="$1"
  v="${v%\"}"; v="${v#\"}"
  v="${v%\'}"; v="${v#\'}"
  printf '%s' "$v"
}

echo "Removing existing Vercel env vars..."
for env in "${ENVIRONMENTS[@]}"; do
  mapfile -t keys < <(vercel env ls "$env" -F json 2>/dev/null | python3 -c "
import json, sys
try:
  data = json.load(sys.stdin)
  for item in data:
    print(item.get('key', ''))
except Exception:
  pass
" 2>/dev/null || true)
  for key in "${keys[@]}"; do
    [[ -z "$key" ]] && continue
    echo "  rm $key ($env)"
    vercel env rm "$key" "$env" --yes 2>/dev/null || vercel env rm "$key" "$env" -y
  done
done

MERGED="$(merge_env)"
echo "Adding env vars from $SOURCE_DIR (.env + .env.local)..."

while IFS= read -r line || [[ -n "$line" ]]; do
  [[ -z "$line" || "$line" =~ ^# ]] && continue
  key="${line%%=*}"
  key="$(echo "$key" | xargs)"
  [[ -z "$key" || "$key" == VERCEL_* ]] && continue
  value="$(strip_quotes "${line#*=}")"
  value="$(echo "$value" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')"
  [[ -z "$value" ]] && { echo "  skip $key (empty)"; continue; }

  sensitive_flag=()
  if is_sensitive "$key"; then
    sensitive_flag=(--sensitive)
  fi

  echo "  add $key → ${ENVIRONMENTS[*]}"
  printf '%s' "$value" | vercel env add "$key" production preview development --yes --force "${sensitive_flag[@]}"
done < "$MERGED"

rm -f "$MERGED"
echo "Done. Redeploy production for changes to take effect:"
echo "  vercel --prod"
