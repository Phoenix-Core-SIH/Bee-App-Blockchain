#!/usr/bin/env bash
# =============================================================================
# HoneyChain Full Backend Test Runner
# Starts all services, waits for them to be healthy, runs all tests,
# and prints a summary. Cleans up background processes on exit.
# =============================================================================
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
DJANGO_DIR="$ROOT_DIR/bee-app-backend"

# Hardhat deployer (account 0) — always the operator in local dev
DEPLOYER_ADDR="0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

# Export so deploy.js picks them up — grants deployer all operator roles on localhost
export INITIAL_BEEKEEPERS="$DEPLOYER_ADDR"
export INITIAL_PROCESSORS="$DEPLOYER_ADDR"

# ── Colors ────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Ordered result list: "name|status" ────────────────────────────────────────
RESULTS=()
PIDS=()

# ── Cleanup: kill background services on exit ─────────────────────────────────
cleanup() {
  echo ""
  echo -e "${YELLOW}Stopping services...${NC}"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
  lsof -ti:8545 | xargs kill -9 2>/dev/null || true
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  wait 2>/dev/null || true
  echo -e "${GREEN}Services stopped.${NC}"
}
trap cleanup EXIT

# ── Helper: wait_for_port <port> <name> [timeout_sec] ────────────────────────
wait_for_port() {
  local port="$1" name="$2" timeout="${3:-45}" elapsed=0
  echo -ne "   Waiting for ${name} on :${port}"
  while ! nc -z localhost "$port" 2>/dev/null; do
    if [ "$elapsed" -ge "$timeout" ]; then
      echo -e " ${RED}TIMEOUT${NC}"
      return 1
    fi
    sleep 1; elapsed=$((elapsed+1)); echo -ne "."
  done
  echo -e " ${GREEN}UP${NC}"
}

# ── Helper: record_result <name> <exit_code> ──────────────────────────────────
record_result() {
  local name="$1" code="$2"
  if [ "$code" -eq 0 ]; then
    RESULTS+=("${name}|PASS")
    echo -e "${GREEN}✓ PASS${NC}: ${name}"
  else
    RESULTS+=("${name}|FAIL")
    echo -e "${RED}✗ FAIL${NC}: ${name}"
  fi
}

# ── start_hardhat: kill old node, start fresh, wait for it ───────────────────
start_hardhat() {
  lsof -ti:8545 | xargs kill -9 2>/dev/null || true
  sleep 1
  cd "$ROOT_DIR"
  npx hardhat node > /tmp/honeychain_hardhat.log 2>&1 &
  PIDS+=($!)
  wait_for_port 8545 "Hardhat" 60 || return 1
}

# ── deploy_contract: deploy and grant deployer all op roles ──────────────────
deploy_contract() {
  cd "$ROOT_DIR"
  if npx hardhat run scripts/deploy.js --network localhost > /tmp/honeychain_deploy.log 2>&1; then
    echo -e "   ${GREEN}✓ Contract deployed + roles granted${NC}"
    return 0
  else
    echo -e "   ${RED}✗ Deployment failed${NC}"
    cat /tmp/honeychain_deploy.log
    return 1
  fi
}

# ── start_backend: kill old, start fresh node server ─────────────────────────
start_backend() {
  lsof -ti:3000 | xargs kill -9 2>/dev/null || true
  sleep 1
  cd "$BACKEND_DIR"
  node src/server.js > /tmp/honeychain_backend.log 2>&1 &
  PIDS+=($!)
  wait_for_port 3000 "Blockchain Backend" 30 || return 1
}

# =============================================================================
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     HoneyChain Full Backend Test Runner              ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Hardhat ────────────────────────────────────────────────────────────────
echo -e "${BOLD}[1/5] Starting Hardhat local blockchain...${NC}"
start_hardhat || { echo -e "${RED}Hardhat failed${NC}"; exit 1; }

# ── 2. Deploy ─────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[2/5] Deploying BatchRegistry contract + granting roles...${NC}"
deploy_contract
record_result "Contract Deploy" $?

# ── 3. Blockchain Backend ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[3/5] Starting Blockchain Backend (Node.js on :3000)...${NC}"
start_backend || { echo -e "${RED}Backend failed. Log: /tmp/honeychain_backend.log${NC}"; exit 1; }

# ── 4. Django Backend ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[4/5] Starting Django Backend (Python on :8000)...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
sleep 1
cd "$DJANGO_DIR"
source venv/bin/activate
python manage.py migrate --no-input > /tmp/honeychain_migrate.log 2>&1
python manage.py runserver 0.0.0.0:8000 --noreload > /tmp/honeychain_django.log 2>&1 &
PIDS+=($!)
wait_for_port 8000 "Django Backend" 30 || { echo -e "${RED}Django failed. Log: /tmp/honeychain_django.log${NC}"; exit 1; }

# ── 5. Tests ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}[5/5] Running Tests...${NC}"
echo -e "${CYAN}─────────────────────────────────────────────────────${NC}"

# ── 5a. Django unit tests ─────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}▶ Django Unit Tests${NC}"
cd "$DJANGO_DIR"
source venv/bin/activate
python manage.py test apps --verbosity=1 2>&1
django_exit=$?
record_result "Django Unit Tests" $django_exit

# ── 5b. Blockchain Backend Jest tests ────────────────────────────────────────
# IMPORTANT: Jest's globalSetup runs `pkill -9 -f 'node.*hardhat'` which would
# kill our main Hardhat on :8545. Shut it down cleanly before Jest runs.
# Jest uses its own isolated Hardhat on port 18547.
echo ""
echo -e "${CYAN}${BOLD}▶ Blockchain Backend Jest Tests (25 tests)${NC}"
echo -e "   ${YELLOW}(Stopping main Hardhat/Backend so Jest's pkill doesn't corrupt them)${NC}"
lsof -ti:8545 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
sleep 1
cd "$BACKEND_DIR"
# Jest --forceExit sends SIGKILL to the process group after tests complete,
# which always corrupts the npm exit code (137). Detect pass/fail from output instead.
npm test 2>&1 | tee /tmp/jest_output.log || true
if grep -qE "Tests:\s+[0-9]+ passed" /tmp/jest_output.log && \
   ! grep -qE "^FAIL " /tmp/jest_output.log && \
   ! grep -qE "Tests:.*[0-9]+ failed" /tmp/jest_output.log; then
  record_result "Blockchain Jest Tests (25)" 0
else
  record_result "Blockchain Jest Tests (25)" 1
fi

# ── 5c. Restart services for E2E ─────────────────────────────────────────────
echo ""
echo -e "${YELLOW}Re-starting services for E2E test...${NC}"
start_hardhat || { record_result "E2E Integration" 1; }
deploy_contract || { record_result "E2E Integration" 1; }
start_backend || { record_result "E2E Integration" 1; }

# ── 5c. Django <-> Blockchain E2E ────────────────────────────────────────────
echo ""
echo -e "${CYAN}${BOLD}▶ E2E Integration (Django → Blockchain → Hardhat)${NC}"
cd "$DJANGO_DIR"
source venv/bin/activate
e2e_output=$(python e2e_integration_test.py 2>&1)
echo "$e2e_output"
if echo "$e2e_output" | grep -q "SUCCESS!"; then
  record_result "E2E Integration" 0
else
  record_result "E2E Integration" 1
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║                  TEST SUMMARY                       ║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"

ALL_PASS=true
for entry in "${RESULTS[@]}"; do
  name="${entry%%|*}"
  status="${entry##*|}"
  if [ "$status" = "PASS" ]; then
    echo -e "  ${GREEN}✓${NC}  $name"
  else
    echo -e "  ${RED}✗${NC}  $name"
    ALL_PASS=false
  fi
done

echo ""
if $ALL_PASS; then
  echo -e "${GREEN}${BOLD}All tests passed! 🍯${NC}"
  EXIT_CODE=0
else
  echo -e "${RED}${BOLD}Some tests failed. Check output above.${NC}"
  EXIT_CODE=1
fi

echo ""
echo -e "${YELLOW}Logs:${NC}"
echo "  /tmp/honeychain_hardhat.log"
echo "  /tmp/honeychain_backend.log"
echo "  /tmp/honeychain_django.log"
echo ""
exit $EXIT_CODE
