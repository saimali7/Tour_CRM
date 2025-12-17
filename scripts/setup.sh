#!/bin/bash
set -e

echo ""
echo "======================================"
echo "   Tour CRM Development Setup"
echo "======================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
success() { echo -e "${GREEN}✓${NC} $1"; }
warn() { echo -e "${YELLOW}⚠${NC} $1"; }
error() { echo -e "${RED}✗${NC} $1"; }
info() { echo -e "  $1"; }

# 1. Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    error "Node.js is not installed"
    info "Install Node.js 20+: https://nodejs.org/"
    exit 1
fi
success "Node.js $(node -v)"

if ! command -v pnpm &> /dev/null; then
    warn "pnpm not found, installing..."
    npm install -g pnpm
fi
success "pnpm $(pnpm -v)"

echo ""

# 2. Install dependencies
echo "Installing dependencies..."
pnpm install
success "Dependencies installed"

echo ""

# 3. Setup environment file
if [ ! -f .env.local ]; then
    if [ -f .env.local.example ]; then
        cp .env.local.example .env.local
        success "Created .env.local from example"
        warn "Please update .env.local with your credentials"
    else
        warn ".env.local.example not found, skipping"
    fi
else
    success ".env.local already exists"
fi

echo ""

# 4. Setup git hooks (if husky is available)
if [ -d ".husky" ] || grep -q "husky" package.json 2>/dev/null; then
    echo "Setting up git hooks..."
    pnpm exec husky install 2>/dev/null || true
    success "Git hooks configured"
    echo ""
fi

# 5. Check for Docker (optional)
if command -v docker &> /dev/null; then
    success "Docker is available for local services"
    info "Run 'make docker-up' to start local Postgres & Redis"
else
    info "Docker not found (optional - you can use Supabase instead)"
fi

echo ""

# 6. Database setup prompt
echo "Database setup..."
if [ -n "$DATABASE_URL" ] || grep -q "DATABASE_URL" .env.local 2>/dev/null; then
    read -p "Push database schema? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        pnpm db:push
        success "Database schema pushed"
    fi
else
    warn "DATABASE_URL not configured in .env.local"
    info "Configure your database connection, then run: pnpm db:push"
fi

echo ""
echo "======================================"
echo "   Setup Complete!"
echo "======================================"
echo ""
echo "Next steps:"
echo "  1. Update .env.local with your credentials"
echo "  2. Run 'pnpm dev' to start developing"
echo "  3. Open http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  pnpm dev        - Start development server"
echo "  pnpm db:studio  - Open database UI"
echo "  make help       - Show all available commands"
echo ""
