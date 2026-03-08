#!/bin/bash
# APT Casino CreditCoin Deployment Script
# Deploys Solidity contracts to CreditCoin Testnet and frontend to Vercel

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"

DEPLOY_CONTRACTS=true
DEPLOY_FRONTEND=true
VERBOSE=false

print_status() { echo -e "${GREEN}[INFO]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }
print_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

check_prerequisites() {
  print_step "Checking prerequisites..."
  command -v node >/dev/null 2>&1 || { print_error "Node.js is not installed. Please install Node.js 18+"; exit 1; }
  command -v npm >/dev/null 2>&1 || { print_error "npm is not installed"; exit 1; }
  command -v npx >/dev/null 2>&1 || { print_error "npx is not available"; exit 1; }
  command -v vercel >/dev/null 2>&1 || { print_warning "Vercel CLI not installed. Run: npm install -g vercel"; }
  print_status "Prerequisites OK"
}

check_environment() {
  print_step "Checking environment..."
  if [ -z "$CREDITCOIN_TREASURY_PRIVATE_KEY" ] && [ -z "$TREASURY_PRIVATE_KEY" ]; then
    print_warning "CREDITCOIN_TREASURY_PRIVATE_KEY or TREASURY_PRIVATE_KEY not set (required for contract deploy)"
  fi
  print_status "Environment checked"
}

install_dependencies() {
  print_step "Installing dependencies..."
  cd "$PROJECT_ROOT" && npm install
  print_status "Dependencies installed"
}

compile_contracts() {
  print_step "Compiling Solidity contracts..."
  cd "$PROJECT_ROOT"
  if [ "$VERBOSE" = true ]; then
    npx hardhat compile
  else
    npx hardhat compile >/dev/null 2>&1
  fi
  print_status "Contracts compiled"
}

deploy_contracts() {
  print_step "Deploying contracts to CreditCoin Testnet..."
  cd "$PROJECT_ROOT"
  if [ "$VERBOSE" = true ]; then
    npx hardhat run scripts/deploy-creditcoin-contracts.js --network creditcoin-testnet
  else
    npx hardhat run scripts/deploy-creditcoin-contracts.js --network creditcoin-testnet 2>/dev/null
  fi
  print_status "Contracts deployed to creditcoin-testnet"
}

build_frontend() {
  print_step "Building frontend..."
  cd "$PROJECT_ROOT"
  if [ "$VERBOSE" = true ]; then
    npm run build
  else
    npm run build >/dev/null 2>&1
  fi
  print_status "Frontend built"
}

deploy_vercel() {
  print_step "Deploying to Vercel..."
  cd "$PROJECT_ROOT"
  vercel whoami >/dev/null 2>&1 || { print_warning "Run: vercel login"; exit 1; }
  [ "$VERBOSE" = true ] && vercel --prod || vercel --prod --yes
  print_status "Deployed to Vercel"
}

show_help() {
  echo "APT Casino CreditCoin Deployment"
  echo "Usage: $0 [OPTIONS]"
  echo "  -c, --contracts-only   Deploy only contracts (CreditCoin Testnet)"
  echo "  -f, --frontend-only    Deploy only frontend (build + Vercel)"
  echo "  -v, --verbose          Verbose output"
  echo "  -h, --help             This help"
  echo ""
  echo "Env: CREDITCOIN_TREASURY_PRIVATE_KEY or TREASURY_PRIVATE_KEY for contract deploy"
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -c|--contracts-only) DEPLOY_FRONTEND=false; shift ;;
    -f|--frontend-only)  DEPLOY_CONTRACTS=false; shift ;;
    -v|--verbose)       VERBOSE=true; shift ;;
    -h|--help)           show_help; exit 0 ;;
    *) print_error "Unknown option: $1"; show_help; exit 1 ;;
  esac
done

echo "🚀 APT Casino CreditCoin Deployment"
echo "   Contracts: $DEPLOY_CONTRACTS | Frontend: $DEPLOY_FRONTEND"
echo ""

check_prerequisites
check_environment
install_dependencies

[ "$DEPLOY_CONTRACTS" = true ] && { compile_contracts; deploy_contracts; }
[ "$DEPLOY_FRONTEND" = true ]  && { build_frontend; deploy_vercel; }

echo ""
print_status "🎉 Deployment completed."
echo "   Set env vars in Vercel and test the app."
