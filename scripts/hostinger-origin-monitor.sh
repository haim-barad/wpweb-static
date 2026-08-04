#!/bin/bash
# Hostinger origin-IP drift monitor  (alert only — never changes DNS)
#
# Detects the failure that took all 11 WPWeb sites down on 2026-07-29:
# Hostinger silently migrated the account to a new server and retired the old IP,
# while Cloudflare's A records kept pointing at the dead one.
#
# Three independent checks:
#   1. DRIFT  — has Hostinger's current origin IP changed from the recorded baseline?
#   2. HEALTH — are the public (Cloudflare-fronted) sites actually serving?
#   3. LOAD   — is the shared node oversubscribed by OTHER tenants?
#
# A failed origin probe is sorted into DEAD (no TCP handshake — the address is
# gone, repoint Cloudflare) or DEGRADED (handshake fine, request failed — the
# address is good, do NOT repoint). Before 2026-08-04 both produced the same
# "ORIGIN IP NOT SERVING" page, whose triage said to repoint the A records —
# advice that is actively wrong for the degraded case. Probes are also confirmed
# over several attempts now, because the degraded case is usually transient.
#
# Drift is the early warning: it usually trips while the OLD ip still works,
# which is the window where updating Cloudflare costs zero downtime.
#
# LOAD exists because of 2026-07-30: a client site was intermittently
# throwing 503/500 with 70-121s TTFB. Node load climbed 43 -> 83 on 64 cores in
# ~30 minutes while OUR account used 4.4% CPU and 9 of 6,971 node-wide processes.
# Nothing inside the account could fix that. Every sample is appended to
# $STATE_DIR/load.csv so there is hard evidence to hand Hostinger support —
# "your node, not my site" is only persuasive with a week of numbers behind it.
#
# Usage:  hostinger-origin-monitor.sh [--check|--status|--load|--set-baseline <ip>|--test-alert]
# Cron:   */15 * * * * /path/to/hostinger-origin-monitor.sh --check >> ~/.hostinger-monitor/cron.log 2>&1

set -uo pipefail

STATE_DIR="$HOME/.hostinger-monitor"
STATE_FILE="$STATE_DIR/baseline"
LAST_ALERT="$STATE_DIR/last-alert"
LOG_FILE="$STATE_DIR/monitor.log"
CONFIG_FILE="$STATE_DIR/config"
LOAD_CSV="$STATE_DIR/load.csv"
PROC_LOG="$STATE_DIR/procs.log"

# ---- environment-specific values --------------------------------------------
# Set these in $CONFIG_FILE (default ~/.hostinger-monitor/config), NOT here.
# This script is in a public repo; account IDs, site lists and origin IPs are
# not. Publishing an origin IP would let anyone bypass the Cloudflare proxy in
# front of these sites and reach the origin directly, which is the one thing the
# proxy exists to prevent. See hostinger-origin-monitor.config.example.
HOSTINGER_USER="${HOSTINGER_USER:-}"
PROBE_DOMAIN="${PROBE_DOMAIN:-}"
PROBE_DB="${PROBE_DB:-}"             # only used by the fallback origin lookup

# Address to suggest in alert triage if the configured origin dies. Both the
# baseline and this are routes to the same node.
FALLBACK_ORIGIN_IP="${FALLBACK_ORIGIN_IP:-}"
# Sites checked publicly, through Cloudflare. Populated from $CONFIG_FILE.
SITES=()

# Alerting: Telegram via Hermes ("Clyde"). Bare "telegram" = home channel.
HERMES_BIN="${HERMES_BIN:-$HOME/.local/bin/hermes}"
TELEGRAM_TARGET="${TELEGRAM_TARGET:-telegram}"

# Sites probed DIRECTLY against the configured origin IP (bypassing Cloudflare).
# Keep this short — it is the fast, decisive check. From $CONFIG_FILE.
ORIGIN_PROBE_SITES=()

# Every site that genuinely resolves to the origin. Used only for the per-site
# TTFB breakdown written into $PROC_LOG during a CPU spike — that breakdown is
# the one thing that says WHICH site is consuming the shared LVE, since the
# process table cannot tell you. From $CONFIG_FILE; defaults to the probe list.
ORIGIN_SITES=()

# Re-alert throttle: don't re-send the same alert more often than this (seconds)
RENOTIFY_AFTER=21600   # 6h

# --- origin probe tuning -----------------------------------------------------
# A SINGLE failed probe is not an outage. On 2026-08-04 this script paged three
# times with "ORIGIN IP NOT SERVING" while the origin was in fact answering 200
# in under half a second either side of every alert. The cause was our own
# account briefly exceeding its CloudLinux LVE CPU/process limit (237-400% CPU,
# 36-56 procs) so PHP requests queued past the probe timeout. The IP was fine.
#
# Two changes came out of that:
#   1. Confirm before paging — reprobe a few times before declaring an outage.
#   2. Distinguish DEAD from DEGRADED — see classify_origin(). A retired IP and a
#      throttled account look identical to a plain curl, but the fixes are
#      opposite: one means "repoint Cloudflare", the other means "do NOT".
ORIGIN_PROBE_TIMEOUT="${ORIGIN_PROBE_TIMEOUT:-25}"
ORIGIN_CONNECT_TIMEOUT="${ORIGIN_CONNECT_TIMEOUT:-10}"
ORIGIN_CONFIRM_TRIES="${ORIGIN_CONFIRM_TRIES:-3}"
ORIGIN_CONFIRM_DELAY="${ORIGIN_CONFIRM_DELAY:-20}"

# ---------------------------------------------------------------- node load
# SSH is the only way to see node load: Hostinger's API exposes nothing about
# host contention, and /proc/lve/list is not readable by the account.
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_rsa}"
SSH_PORT="${SSH_PORT:-65002}"
SSH_HOST="${SSH_HOST:-}"               # defaults to the configured origin baseline
# Alert when 1-min load exceeds this. The node has 64 cores, so 70 means every
# core is saturated with a queue forming. Tune in $CONFIG_FILE if it gets noisy.
LOAD_ALERT_THRESHOLD="${LOAD_ALERT_THRESHOLD:-70}"

# When OUR OWN account CPU exceeds this (percent, summed across processes),
# capture what is actually running into $PROC_LOG. Added 2026-08-04: the origin
# was intermittently unreachable because the account was being LVE-throttled at
# 237-400% CPU / 36-56 processes, and by the time anyone looked the burst was
# over. A 15-minute sample interval cannot catch a 2-minute spike in the act —
# so the sampler has to grab the evidence itself, at the moment it trips.
OURCPU_CAPTURE_THRESHOLD="${OURCPU_CAPTURE_THRESHOLD:-150}"

mkdir -p "$STATE_DIR"
[ -f "$CONFIG_FILE" ] && . "$CONFIG_FILE"

ALERT_TO="${ALERT_TO:-}"                 # only used if optional SMTP is configured

# ---- required configuration --------------------------------------------------
# Fail loudly rather than monitor nothing: with no config the site lists are
# empty and every check would pass vacuously, which looks exactly like health.
_missing=""
[ -z "$HOSTINGER_USER" ] && _missing="$_missing HOSTINGER_USER"
[ -z "$PROBE_DOMAIN" ]   && _missing="$_missing PROBE_DOMAIN"
[ "${#SITES[@]}" -eq 0 ]              && _missing="$_missing SITES"
[ "${#ORIGIN_PROBE_SITES[@]}" -eq 0 ] && _missing="$_missing ORIGIN_PROBE_SITES"
if [ -n "$_missing" ]; then
  printf 'ERROR: missing required config:%s\n' "$_missing" >&2
  printf 'Set them in %s\n' "$CONFIG_FILE" >&2
  printf 'Copy hostinger-origin-monitor.config.example alongside this script to start.\n' >&2
  exit 2
fi
unset _missing

# The per-site TTFB list is optional; fall back to the decisive probe list.
[ "${#ORIGIN_SITES[@]}" -eq 0 ] && ORIGIN_SITES=("${ORIGIN_PROBE_SITES[@]}")

log() { printf '%s  %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*" | tee -a "$LOG_FILE"; }

# ---------------------------------------------------------------- credentials
# Read the Hostinger token from the existing Claude config so the secret is not
# duplicated into a second file. Override by setting HOSTINGER_API_TOKEN in config.
get_token() {
  if [ -n "${HOSTINGER_API_TOKEN:-}" ]; then printf '%s' "$HOSTINGER_API_TOKEN"; return; fi
  /usr/bin/python3 - <<'PY' 2>/dev/null
import json, os, re
for p in [os.path.expanduser("~/.claude.json"),
          os.path.expanduser("~/.claude/settings.json")]:
    try:
        raw = open(p, encoding="utf-8").read()
    except OSError:
        continue
    m = re.search(r'"HOSTINGER_API_TOKEN"\s*:\s*"([^"]+)"', raw)
    if m:
        print(m.group(1)); break
PY
}

# ------------------------------------------------------------- current origin
# Authoritative: phpinfo runs ON the node via Hostinger's control plane, so it
# works even when the public IP is unreachable. Its "System" line names the host.
current_origin() {
  local token host ip
  token="$(get_token)"
  [ -z "$token" ] && { echo "ERROR:no-token"; return 1; }

  host=$(/usr/bin/curl -s -m 45 \
        -H "Authorization: Bearer $token" -H "Accept: application/json" \
        "https://developers.hostinger.com/api/hosting/v1/accounts/$HOSTINGER_USER/websites/$PROBE_DOMAIN/php/php-info" \
        2>/dev/null \
      | /usr/bin/python3 -c '
import sys, re, html
t = html.unescape(re.sub(r"<[^>]+>", "|", sys.stdin.read()))
m = re.search(r"System\s*\|+\s*Linux\s+(\S+)", t)
print(m.group(1) if m else "")
' 2>/dev/null)

  # Fallback: the phpMyAdmin SSO host also tracks the current node.
  if [ -z "$host" ]; then
    host=$(/usr/bin/curl -s -m 30 \
          -H "Authorization: Bearer $token" -H "Accept: application/json" \
          "https://developers.hostinger.com/api/hosting/v1/accounts/$HOSTINGER_USER/databases/$PROBE_DB/phpmyadmin-link" \
          2>/dev/null \
        | /usr/bin/python3 -c '
import sys, re
m = re.search(r"https://([^/\"]+)/", sys.stdin.read())
print(m.group(1) if m else "")
' 2>/dev/null)
  fi

  [ -z "$host" ] && { echo "ERROR:no-host"; return 1; }

  ip=$(/usr/bin/dig +short +time=5 +tries=2 "$host" A 2>/dev/null | /usr/bin/grep -E '^[0-9.]+$' | /usr/bin/head -1)
  [ -z "$ip" ] && { echo "ERROR:unresolved:$host"; return 1; }

  printf '%s %s' "$ip" "$host"
}

# ------------------------------------------------------------------ node load
# Returns: "load1 load5 load15 cores ourCpuPct ourProcs runnable/total"
# Empty on any failure — the caller must treat load monitoring as best-effort so
# an SSH hiccup never masks the origin/health checks that actually page someone.
sample_node_load() {
  local host="$SSH_HOST"
  [ -z "$host" ] && host=$(/usr/bin/head -1 "$STATE_FILE" 2>/dev/null)
  [ -z "$host" ] && return 1
  [ -f "$SSH_KEY" ] || return 1

  # The account permits only one SSH session at a time, so keep this to a single
  # short connection and never retry inside a run.
  /usr/bin/ssh -i "$SSH_KEY" -p "$SSH_PORT" \
      -o BatchMode=yes -o ConnectTimeout=15 -o ServerAliveInterval=5 \
      -o StrictHostKeyChecking=accept-new -o LogLevel=ERROR \
      "$HOSTINGER_USER@$host" "bash -s -- $OURCPU_CAPTURE_THRESHOLD" 2>/dev/null <<'REMOTE'
thr="${1:-150}"
read l1 l5 l15 pr rest < /proc/loadavg
cores=$(nproc 2>/dev/null || echo 0)
me=$(id -un)
cpu=$(ps -u "$me" --no-headers -o pcpu 2>/dev/null | awk '{c+=$1} END {printf "%.1f", c+0}')
n=$(ps -u "$me" --no-headers 2>/dev/null | wc -l)
printf "%s %s %s %s %s %s %s\n" "$l1" "$l5" "$l15" "$cores" "${cpu:-0}" "${n:-0}" "$pr"
# Over our own limit? Grab the process table NOW — these bursts are far shorter
# than the 15-minute sample gap, so this is the only chance to see the cause.
if awk "BEGIN{exit !(${cpu:-0} > $thr)}" 2>/dev/null; then
  echo "PROCS:"
  # An lsphp worker CANNOT be attributed to a site from the process table: it
  # runs out of /opt/alt/php84/usr/bin (so cwd is useless) and its environ holds
  # only pool config, not DOCUMENT_ROOT. Record the pool limits instead —
  # saturating LSAPI_CHILDREN is itself the failure mode, and the per-site TTFB
  # block that the caller appends is what identifies the site.
  # NOT "ps -u $me -C lsphp": procps ORs selection flags, so that returns any of
  # our processes and the first hit is usually a shell, whose environ has no
  # LSAPI_ vars at all. Filter on comm explicitly.
  pid1=$(ps -u "$me" -o pid=,comm= 2>/dev/null | awk '$2=="lsphp"{print $1; exit}')
  if [ -n "$pid1" ]; then
    tr '\0' '\n' < "/proc/$pid1/environ" 2>/dev/null |
      grep -E '^LSAPI_(CHILDREN|MAX_IDLE_CHILDREN|MAX_PROCESS_TIME)=' |
      sed 's/^/  pool /'
  fi
  printf '%7s %6s %10s %s\n' PID CPU% ELAPSED COMM
  ps -u "$me" -o pid=,pcpu=,etime=,comm= --sort=-pcpu 2>/dev/null | head -25 |
    awk '{printf "%7s %6s %10s %s\n", $1, $2, $3, $4}'
fi
REMOTE
}

# Sample, append to CSV, and echo the raw sample back for the caller to alert on.
record_node_load() {
  local out s ps_dump l1 l5 l15 cores cpu procs pr
  out="$(sample_node_load)" || true
  # NOTE: every log() call in this function must go to stderr. log() tees to
  # stdout, and this function's stdout IS its return value — the caller reads it
  # with $(...). Logging to stdout here silently prepends the log text to the
  # sample, and do_check then parses a timestamp as the load average.
  [ -z "$out" ] && { log "WARN node-load sample failed (ssh) — load check skipped" >&2; return 1; }

  s="$(printf '%s\n' "$out" | /usr/bin/head -1)"
  ps_dump="$(printf '%s\n' "$out" | /usr/bin/sed -n '/^PROCS:/,$p' | /usr/bin/tail -n +2)"

  read -r l1 l5 l15 cores cpu procs pr <<<"$s"
  [ -s "$LOAD_CSV" ] || printf 'ts_utc,load1,load5,load15,cores,our_cpu_pct,our_procs,runnable,node_procs\n' > "$LOAD_CSV"
  printf '%s,%s,%s,%s,%s,%s,%s,%s,%s\n' \
      "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$l1" "$l5" "$l15" "$cores" "$cpu" "$procs" \
      "${pr%%/*}" "${pr##*/}" >> "$LOAD_CSV"

  # Evidence, captured at the instant the account was over its own limit.
  if [ -n "$ps_dump" ]; then
    local d probe base_ip
    base_ip="$(/usr/bin/head -1 "$STATE_FILE" 2>/dev/null)"
    { printf '\n===== %s  our_cpu=%s%%  our_procs=%s  node_load1=%s =====\n' \
          "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$cpu" "$procs" "$l1"
      printf '%s\n' "$ps_dump"
      # WHICH site is eating the shared LVE. Measured from here, against the
      # origin IP directly — never from the box itself, where curling a public
      # hostname hairpins through Cloudflare and reports bogus 503s and 20-100s
      # TTFBs that have nothing to do with the real origin.
      if [ -n "$base_ip" ]; then
        printf '  per-site response direct to origin (http ttfb):\n'
        for d in "${ORIGIN_SITES[@]}"; do
          probe=$(/usr/bin/curl -s -o /dev/null -k -w '%{http_code} %{time_starttransfer}s' \
                  --connect-timeout 5 -m 20 --resolve "$d:443:$base_ip" "https://$d/" 2>/dev/null)
          printf '    %-26s %s\n' "$d" "${probe:-no-response}"
        done
      fi
    } >> "$PROC_LOG"
    log "our account at ${cpu}% CPU / ${procs} procs — process detail captured to $PROC_LOG" >&2
  fi

  printf '%s' "$s"
}

# ------------------------------------------------------------- origin probing
# Probe one domain against a specific IP, bypassing Cloudflare entirely.
# Echoes: "<http_code> <time_connect> <time_total> <curl_exit>"
#
# time_connect is the discriminator. If it is > 0 the TCP handshake completed,
# which means the IP is alive and routing to us — so whatever failed afterwards
# is the SERVER being slow or erroring, not the ADDRESS being dead. A retired IP
# cannot complete a handshake at all.
probe_origin_one() {
  local d="$1" ip="$2" out rc
  out=$(/usr/bin/curl -s -o /dev/null -k \
        -w '%{http_code} %{time_connect} %{time_total}' \
        --connect-timeout "$ORIGIN_CONNECT_TIMEOUT" -m "$ORIGIN_PROBE_TIMEOUT" \
        --resolve "$d:443:$ip" "https://$d/" 2>/dev/null)
  rc=$?
  printf '%s %s' "${out:-000 0 0}" "$rc"
}

# Probe every ORIGIN_PROBE_SITES entry against $1 and sort failures into two
# buckets: DEAD (no TCP handshake) vs DEGRADED (handshake fine, request failed).
# Sets ORIGIN_DEAD / ORIGIN_DEGRADED; returns 0 only when everything answered.
classify_origin() {
  local ip="$1" d code tconn ttot rc
  ORIGIN_DEAD=""; ORIGIN_DEGRADED=""
  for d in "${ORIGIN_PROBE_SITES[@]}"; do
    read -r code tconn ttot rc <<<"$(probe_origin_one "$d" "$ip")"
    case "$code" in
      200|301|302) continue ;;
    esac
    if /usr/bin/awk "BEGIN{exit !(${tconn:-0} > 0)}" 2>/dev/null; then
      ORIGIN_DEGRADED="$ORIGIN_DEGRADED $d(http=$code,${ttot}s)"
    else
      ORIGIN_DEAD="$ORIGIN_DEAD $d(no-connect,curl=$rc)"
    fi
  done
  [ -z "$ORIGIN_DEAD$ORIGIN_DEGRADED" ]
}

# ---------------------------------------------------------------- site health
check_sites() {
  local bad=""
  for d in "${SITES[@]}"; do
    local code
    code=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' -m 30 "https://$d/" 2>/dev/null)
    case "$code" in
      200|301|302) ;;
      *) bad="$bad $d($code)" ;;
    esac
  done
  printf '%s' "$bad"
}

# --------------------------------------------------------------------- alerts
send_alert() {
  local subject="$1" body="$2" key="$3"

  # throttle repeats of the same condition
  if [ -f "$LAST_ALERT" ]; then
    local prev_key prev_at now
    prev_key=$(/usr/bin/head -1 "$LAST_ALERT" 2>/dev/null)
    prev_at=$(/usr/bin/tail -1 "$LAST_ALERT" 2>/dev/null)
    now=$(date +%s)
    if [ "$prev_key" = "$key" ] && [ $((now - ${prev_at:-0})) -lt $RENOTIFY_AFTER ]; then
      log "ALERT suppressed (throttled, same condition): $subject"
      return 0
    fi
  fi
  printf '%s\n%s\n' "$key" "$(date +%s)" > "$LAST_ALERT"

  log "ALERT: $subject"
  printf '%s\n' "$body" >> "$LOG_FILE"

  # 1. PRIMARY: Telegram via Hermes ("Clyde" bot).
  #    `hermes send` reuses the gateway's bot-token credentials and needs no
  #    LLM, no agent loop and no running gateway — safe to call from cron.
  if [ -x "$HERMES_BIN" ]; then
    if printf '%s\n' "$body" | "$HERMES_BIN" send --to "$TELEGRAM_TARGET" \
         --subject "$subject" --quiet 2>>"$LOG_FILE"; then
      log "  -> telegram sent ($TELEGRAM_TARGET)"
    else
      log "  -> TELEGRAM FAILED (exit $?) — falling back to notification + log"
    fi
  else
    log "  -> hermes not found at $HERMES_BIN; notification + log only"
  fi

  # 2. macOS notification — local backstop, no credentials needed
  /usr/bin/osascript -e "display notification \"$subject\" with title \"WPWeb origin monitor\" sound name \"Basso\"" 2>/dev/null

  # 3. Email via SMTP — optional, inert unless configured in $CONFIG_FILE
  if [ -n "${SMTP_USER:-}" ] && [ -n "${SMTP_PASS:-}" ] && [ -n "${SMTP_HOST:-}" ]; then
    local tmp; tmp=$(/usr/bin/mktemp)
    {
      printf 'From: %s\n' "${SMTP_FROM:-$SMTP_USER}"
      printf 'To: %s\n' "$ALERT_TO"
      printf 'Subject: %s\n' "$subject"
      printf 'Content-Type: text/plain; charset=utf-8\n\n'
      printf '%s\n' "$body"
    } > "$tmp"

    if /usr/bin/curl -s --max-time 45 --ssl-reqd \
        --url "smtps://${SMTP_HOST}:${SMTP_PORT:-465}" \
        --user "${SMTP_USER}:${SMTP_PASS}" \
        --mail-from "${SMTP_FROM:-$SMTP_USER}" \
        --mail-rcpt "$ALERT_TO" \
        --upload-file "$tmp" 2>>"$LOG_FILE"; then
      log "  -> emailed $ALERT_TO"
    else
      log "  -> EMAIL FAILED (check $CONFIG_FILE); alert is in $LOG_FILE"
    fi
    rm -f "$tmp"
  else
    log "  -> email not configured; notification + log only. See $CONFIG_FILE"
  fi
}

# ---------------------------------------------------------------------- modes
do_check() {
  local origin ip host baseline last_node bad code d load_sample
  # Sample load FIRST so the CSV keeps accruing evidence even on runs that exit
  # early via an origin/health alert. The load ALERT itself fires at the bottom,
  # so a genuine outage always takes precedence over a contention warning.
  load_sample="$(record_node_load)" || true

  origin="$(current_origin)" || true

  if [[ "$origin" == ERROR:* ]]; then
    log "WARN could not determine Hostinger node ($origin) — node check skipped"
    ip=""; host=""
  else
    ip="${origin%% *}"; host="${origin##* }"
  fi

  # state line 1 = configured origin IP (what the Cloudflare A records point at)
  # state line 2 = last-seen Hostinger node IP (informational)
  baseline=$(/usr/bin/head -1 "$STATE_FILE" 2>/dev/null)
  last_node=$(/usr/bin/tail -1 "$STATE_FILE" 2>/dev/null)
  [ "$last_node" = "$baseline" ] && last_node=""

  if [ -z "$baseline" ] && [ -n "$ip" ]; then
    printf '%s\n%s\n' "$ip" "$ip" > "$STATE_FILE"
    log "origin baseline initialised: $ip ($host)"
    baseline="$ip"; last_node="$ip"
  fi

  # ---- PRIMARY CHECK: is the IP our A records point at still serving? ----------
  # This is the check that would have caught the 2026-07-29 outage. That day the
  # ACCOUNT-ASSIGNED ip went dark while the node itself stayed up,
  # so comparing node IPs detected nothing. Probe the configured origin directly,
  # bypassing Cloudflare, so Cloudflare caching cannot mask a dead origin.
  #
  # Never page on a single sample. Transient LVE throttling fails this probe in
  # exactly the same way a dead IP does; the only way to tell them apart is to
  # check whether TCP connected (classify_origin) and to reprobe before paging.
  local origin_dead="" origin_degraded="" try=1
  if [ -n "$baseline" ]; then
    while :; do
      if classify_origin "$baseline"; then
        [ "$try" -gt 1 ] && log "origin recovered on attempt $try/$ORIGIN_CONFIRM_TRIES — transient, not alerting"
        origin_dead=""; origin_degraded=""
        break
      fi
      origin_dead="$ORIGIN_DEAD"; origin_degraded="$ORIGIN_DEGRADED"
      [ "$try" -ge "$ORIGIN_CONFIRM_TRIES" ] && break
      log "origin probe failed (attempt $try/$ORIGIN_CONFIRM_TRIES):${origin_dead}${origin_degraded} — reprobing in ${ORIGIN_CONFIRM_DELAY}s"
      /bin/sleep "$ORIGIN_CONFIRM_DELAY"
      try=$((try + 1))
    done
  fi

  # Our own share of the box. When the origin is slow rather than dead, this is
  # the number that decides whether the cause is us or the node.
  local our_cpu="?" our_procs="?" node_l1="?" node_cores="?"
  if [ -n "$load_sample" ]; then
    read -r node_l1 _ _ node_cores our_cpu our_procs _ <<<"$load_sample"
  fi

  # ---- 1a. DEAD: no TCP handshake at all. This is the 2026-07-29 drift mode. --
  if [ -n "$origin_dead" ]; then
    send_alert \
      "WPWeb ORIGIN IP NOT SERVING: $baseline" \
      "The IP your Cloudflare A records point at is refusing TCP connections.
This is the 2026-07-29 failure mode. Visitors will get Cloudflare 522 shortly.

  Configured origin : $baseline   <-- NO TCP HANDSHAKE
  Failing probes    :$origin_dead
  Hostinger node    : ${ip:-unknown} (${host:-unknown})
  Confirmed over    : $ORIGIN_CONFIRM_TRIES probes ${ORIGIN_CONFIRM_DELAY}s apart
  Detected          : $(date -u '+%Y-%m-%d %H:%M UTC')

TRIAGE:
  1. Is the node itself alive?   $0 --status
  2. Does the node IP serve the sites?
       curl -sI -k --resolve $PROBE_DOMAIN:443:${ip:-NODEIP} https://$PROBE_DOMAIN/
  3. If the node IP works but $baseline does not, temporarily repoint the
     Cloudflare A records to ${ip:-the node IP} to restore service, then contact
     Hostinger.${FALLBACK_ORIGIN_IP:+ Known good fallback: $FALLBACK_ORIGIN_IP}
  4. Hostinger support: hPanel -> Help (24/7 live chat)

NOTE: the configured origin and the node IP are usually two routes to the SAME
node. An outage of one does not mean the server is down." \
      "originbad:$baseline"
    return
  fi

  # ---- 1b. DEGRADED: TCP fine, requests failing. Do NOT repoint DNS. ----------
  # The address is alive and routing to us; the server behind it is stalling or
  # erroring. Repointing the A records would move the same problem to a new IP.
  if [ -n "$origin_degraded" ]; then
    send_alert \
      "WPWeb origin DEGRADED (not an IP problem): $baseline" \
      "The origin IP is alive — TCP and TLS both complete — but requests are
failing or timing out. This is NOT the 2026-07-29 IP-drift failure.
DO NOT repoint the Cloudflare A records: the address is fine.

  Configured origin : $baseline   (handshake OK)
  Failing probes    :$origin_degraded
  Confirmed over    : $ORIGIN_CONFIRM_TRIES probes ${ORIGIN_CONFIRM_DELAY}s apart
  OUR account       : ${our_cpu}% CPU, ${our_procs} processes
  Node load         : ${node_l1} on ${node_cores} cores
  Detected          : $(date -u '+%Y-%m-%d %H:%M UTC')

READ THE TWO NUMBERS ABOVE — they say whose fault it is:
  * OUR CPU high (>200%) + node load normal -> we are hitting the CloudLinux LVE
    per-account limit and being throttled. The cause is inside the account, and
    it is account-wide, not per-site: all 11 domains share one LVE.
    See the process capture: $PROC_LOG
  * OUR CPU low + node load high (>$LOAD_ALERT_THRESHOLD) -> host contention,
    not us. Gather evidence with '$0 --load' and open a Hostinger ticket.

Cloudflare 524 = origin too slow; 522 = origin refused the handshake.

First seen 2026-08-04: three of these in 75 minutes, our account at 237-400%
CPU / 36-56 procs while the node sat at 28-47 of 64 cores. Origin answered 200
in under 0.5s either side of every alert." \
      "origindegraded:$baseline"
    return
  fi

  # ---- SECONDARY: has Hostinger moved the account to a different node? --------
  # Informational. Does NOT mean the site is down; the assigned IP usually follows
  # the account. Worth knowing because it may precede an IP change.
  if [ -n "$ip" ] && [ -n "$last_node" ] && [ "$ip" != "$last_node" ]; then
    printf '%s\n%s\n' "$baseline" "$ip" > "$STATE_FILE"
    send_alert \
      "WPWeb Hostinger node changed: $last_node -> $ip" \
      "Hostinger has moved account $HOSTINGER_USER to a different node.

  Previous node   : $last_node
  New node        : $ip ($host)
  Configured origin (A records): $baseline  -- still serving OK
  Detected        : $(date -u '+%Y-%m-%d %H:%M UTC')

No action needed while the configured origin keeps serving. But this is often a
precursor to the assigned IP being retired, so verify the A records still work:
  $0 --check" \
      "node:$ip"
    return
  fi

  bad="$(check_sites)"
  if [ -n "$bad" ]; then
    send_alert \
      "WPWeb SITES DOWN:$bad" \
      "Public site checks failed (via Cloudflare).

  Failing         :$bad
  Current origin  : ${ip:-unknown} (${host:-unknown})
  Baseline origin : ${baseline:-none}
  Checked         : $(date -u '+%Y-%m-%d %H:%M UTC')

If the origin matches the baseline, this is NOT the 2026-07-29 IP-drift failure —
check Hostinger status and the LVE resource limits instead.
A Cloudflare 522 means the origin refused a TCP handshake; 524 means it was too slow." \
      "down:$bad"
    return
  fi

  # ---- TERTIARY: is the shared NODE oversubscribed (by other tenants)? --------
  # Runs last: the sites are up, so this is a warning about degradation, not an
  # outage. The alert deliberately carries our own tiny share of the box, because
  # that is the number that turns "my site is slow" into a supportable claim.
  if [ -n "$load_sample" ]; then
    local l1 l5 l15 cores ourcpu ourprocs pr
    read -r l1 l5 l15 cores ourcpu ourprocs pr <<<"$load_sample"
    if [ "${cores:-0}" -gt 0 ] 2>/dev/null && \
       awk "BEGIN{exit !($l1 > $LOAD_ALERT_THRESHOLD)}" 2>/dev/null; then
      send_alert \
        "WPWeb node overloaded: load $l1 on $cores cores" \
        "The shared Hostinger node is oversubscribed. Sites are still answering,
but uncached PHP will be slow and may intermittently 503/500.

  Load (1/5/15) : $l1 / $l5 / $l15   on $cores cores
  Node processes: ${pr##*/} total, ${pr%%/*} runnable
  OUR account   : ${ourcpu}% CPU, ${ourprocs} processes   <-- our entire share
  Threshold     : $LOAD_ALERT_THRESHOLD
  Detected      : $(date -u '+%Y-%m-%d %H:%M UTC')

This is NOT fixable from inside the account: PHP memory is already at the plan
cap (2048M) and our own footprint is negligible. If this keeps recurring, open a
Hostinger ticket asking to move $HOSTINGER_USER to a less contended node, or to
quote the Cloud tier (guaranteed resources).

Evidence for the ticket:  $0 --load" \
        "nodeload"
      return
    fi
  fi

  log "OK  configured-origin=$baseline serving; node=${ip:-?} ($host); all ${#SITES[@]} sites healthy${load_sample:+; load ${load_sample%% *}}"
}

case "${1:---check}" in
  --check)   do_check ;;
  --status)
      echo "baseline : $(/usr/bin/head -1 "$STATE_FILE" 2>/dev/null || echo 'not set')"
      echo "host     : $(/usr/bin/tail -1 "$STATE_FILE" 2>/dev/null || echo '-')"
      echo "telegram : $([ -x "$HERMES_BIN" ] && echo "hermes send --to $TELEGRAM_TARGET" || echo "hermes NOT found at $HERMES_BIN")"
      echo "email    : $([ -n "${SMTP_USER:-}" ] && echo "configured -> $ALERT_TO" || echo "not configured (optional; Telegram is primary)")"
      echo "log      : $LOG_FILE"
      echo "load     : $([ -s "$LOAD_CSV" ] && echo "$(( $(/usr/bin/wc -l < "$LOAD_CSV") - 1 )) samples in $LOAD_CSV  (see --load)" || echo "no samples yet")"
      echo "ssh      : $([ -f "$SSH_KEY" ] && echo "$SSH_KEY port $SSH_PORT" || echo "KEY MISSING at $SSH_KEY — load check will be skipped")"
      echo
      echo "live origin now: $(current_origin)"
      ;;
  --load)
      # Summarise the accrued load history. This is the evidence you paste into a
      # Hostinger ticket: it shows the node's load next to our own share of it.
      if [ ! -s "$LOAD_CSV" ]; then
        echo "no load samples yet — run '$0 --check' at least once"
        echo "(cron collects one sample every 15 min into $LOAD_CSV)"
        exit 1
      fi
      /usr/bin/awk -F, 'NR>1 {
          n++; l=$2+0; s+=l; if (l>max) {max=l; maxat=$1}
          c=$5+0; if (c>0) cores=c
          ocpu+=$6+0; oproc+=$7+0
          if (l > thr) over++
        }
        END {
          if (n==0) { print "no samples"; exit }
          printf "samples          : %d  (every 15 min => ~%.1f days)\n", n, n/96
          printf "node cores       : %d\n", cores
          printf "load1 average    : %.1f  (%.0f%% of cores)\n", s/n, (s/n)/cores*100
          printf "load1 peak       : %.1f  at %s  (%.0f%% of cores)\n", max, maxat, max/cores*100
          printf "samples over %-3d : %d  (%.1f%% of the time)\n", thr, over, over*100/n
          printf "OUR avg share    : %.1f%% CPU, %.1f processes\n", ocpu/n, oproc/n
          print  ""
          if (max > thr) {
            print "VERDICT: node has been oversubscribed. Our share is negligible ->"
            print "         this is host contention, not the site. Worth a ticket."
          } else {
            print "VERDICT: node load has stayed under threshold so far."
          }
        }' thr="$LOAD_ALERT_THRESHOLD" "$LOAD_CSV"
      echo
      echo "worst 8 samples (load1, our cpu%, our procs):"
      /usr/bin/tail -n +2 "$LOAD_CSV" | /usr/bin/sort -t, -k2 -gr | /usr/bin/head -8 \
        | /usr/bin/awk -F, '{printf "  %s  load=%-7s ourcpu=%-6s ourprocs=%s\n", $1, $2, $6, $7}'
      echo
      echo "raw: $LOAD_CSV"
      ;;
  --set-baseline)
      [ -z "${2:-}" ] && { echo "usage: $0 --set-baseline <ip>"; exit 1; }
      # line1 = configured origin (A-record target); line2 = current node IP.
      # Record the live node IP so the node-change check has a correct starting
      # point — writing a placeholder here makes the next run fire a false alert.
      _n="$(current_origin)"; _n="${_n%% *}"
      [[ "$_n" == ERROR:* || -z "$_n" ]] && _n="$2"
      printf '%s\n%s\n' "$2" "$_n" > "$STATE_FILE"
      echo "configured origin set to $2   (node currently $_n)"
      ;;
  --preflight)
      # Before repointing a domain to connect.hostinger.com, confirm Hostinger's edge
      # already presents a TLS cert for it. Without one, Cloudflare in Full/Full(Strict)
      # mode fails the origin handshake and the site 525/526s.
      [ -z "${2:-}" ] && { echo "usage: $0 --preflight <domain> [more...]"; exit 1; }
      shift
      edge=$(/usr/bin/dig +short +time=5 connect.hostinger.com A | /usr/bin/grep -E '^[0-9.]+$' | /usr/bin/head -1)
      echo "Hostinger edge: $edge"
      echo
      rc=0
      for d in "$@"; do
        subj=$(echo | /usr/bin/openssl s_client -connect "$edge:443" -servername "$d" 2>/dev/null \
               | /usr/bin/openssl x509 -noout -subject 2>/dev/null)
        http=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' -m 20 \
               --resolve "$d:443:$edge" "https://$d/" 2>/dev/null)
        if [ -n "$subj" ] && [ "$http" = "200" -o "$http" = "301" -o "$http" = "302" ]; then
          printf '  SAFE TO SWITCH  %-28s cert=%s https=%s\n' "$d" "${subj#*=}" "$http"
        else
          printf '  DO NOT SWITCH   %-28s cert=%s https=%s\n' "$d" "${subj:-NONE}" "${http:-fail}"
          rc=1
        fi
      done
      echo
      [ $rc -eq 0 ] && echo "All checked domains have an edge cert — safe to repoint." \
                    || echo "At least one domain has NO edge cert. Repointing it with Cloudflare SSL=Full/Strict will 525/526."
      exit $rc
      ;;
  --watch-cert)
      # Poll Hostinger's edge until it presents a cert for <domain>, then alert.
      # Use during the DNS-only window so you can re-enable the Cloudflare proxy
      # the moment it is safe, keeping the HTTPS-broken window minimal.
      [ -z "${2:-}" ] && { echo "usage: $0 --watch-cert <domain> [timeout-minutes]"; exit 1; }
      d="$2"; mins="${3:-30}"; deadline=$(( $(date +%s) + mins*60 )); n=0
      echo "Watching Hostinger edge for a cert for $d (timeout ${mins}m)..."
      while [ "$(date +%s)" -lt "$deadline" ]; do
        n=$((n+1))
        edge=$(/usr/bin/dig +short +time=5 connect.hostinger.com A | /usr/bin/grep -E '^[0-9.]+$' | /usr/bin/head -1)
        subj=$(echo | /usr/bin/openssl s_client -connect "$edge:443" -servername "$d" 2>/dev/null \
               | /usr/bin/openssl x509 -noout -subject 2>/dev/null)
        if [ -n "$subj" ]; then
          http=$(/usr/bin/curl -s -o /dev/null -w '%{http_code}' -m 20 --resolve "$d:443:$edge" "https://$d/" 2>/dev/null)
          msg="Edge cert ISSUED for $d after ~$((n*20))s.
  cert  : ${subj#*=}
  https : $http via edge $edge

SAFE to re-enable the Cloudflare proxy (orange cloud) for $d now.
Then verify: curl -sI https://$d/"
          echo "$msg"
          send_alert "Hostinger edge cert issued: $d" "$msg" "cert:$d"
          exit 0
        fi
        printf '  [%s] check %s: no cert yet (edge %s)\n' "$(date -u '+%H:%M:%SZ')" "$n" "$edge"
        sleep 20
      done
      msg="NO cert issued for $d after ${mins}m.

The DNS-only window is still exposed: HTTPS is failing for visitors.
Consider reverting $d to an A record -> ${FALLBACK_ORIGIN_IP:-the origin IP} and investigating with Hostinger."
      echo "$msg"
      send_alert "Hostinger edge cert NOT issued: $d" "$msg" "certfail:$d"
      exit 1
      ;;
  --procs)
      # What was actually running whenever our own account blew past its LVE
      # limit. Populated automatically by --check; this is the answer to
      # "the origin went slow again, what was eating the account?"
      if [ ! -s "$PROC_LOG" ]; then
        echo "no process captures yet — none since OUR account last exceeded ${OURCPU_CAPTURE_THRESHOLD}% CPU."
        echo "(--check captures automatically; see $LOAD_CSV for the load history)"
        exit 0
      fi
      echo "process captures above ${OURCPU_CAPTURE_THRESHOLD}% account CPU:"
      echo
      /usr/bin/grep -c '^=====' "$PROC_LOG" | /usr/bin/awk '{printf "  %s capture(s) recorded\n\n", $1}'
      /usr/bin/tail -60 "$PROC_LOG"
      echo
      echo "raw: $PROC_LOG"
      ;;
  --test-alert)
      send_alert "WPWeb monitor test alert" "This is a test. If you received this by email, delivery works." "test:$(date +%s)"
      ;;
  *) /bin/cat <<USAGE
usage: $0 <mode>

  --check                      drift + site-health + node-load check (cron runs this)
  --status                     show baseline, alert channel, and live origin IP
  --load                       summarise accrued node-load history.
                               Use this to prove host contention to Hostinger:
                               it prints node load beside our own (tiny) share.
  --procs                      show what was running whenever OUR OWN account
                               exceeded its LVE CPU limit. This is the one to
                               reach for when the origin goes slow but the IP
                               is fine (a "DEGRADED", not "NOT SERVING", alert).
  --set-baseline <ip>          re-baseline after a legitimate Hostinger migration
  --preflight <domain>...      BEFORE switching a domain to connect.hostinger.com:
                               confirm the edge already has a TLS cert for it.
                               No cert + Cloudflare Full/Strict = 525, site down.
  --watch-cert <domain> [min]  poll the edge until a cert is issued, then alert.
                               Run this during the DNS-only window so you can
                               re-enable the Cloudflare proxy as soon as it's safe.
  --test-alert                 send a test alert through Telegram/Hermes
USAGE
     exit 1 ;;
esac
