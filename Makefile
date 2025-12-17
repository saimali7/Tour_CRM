# =============================================================================
# Tour Platform - Makefile
# =============================================================================

.PHONY: help install dev build lint typecheck format clean
.PHONY: docker-up docker-down docker-logs docker-ps docker-clean
.PHONY: db-generate db-push db-studio db-seed
.PHONY: setup check deploy-staging deploy-prod pre-deploy

# Default target
.DEFAULT_GOAL := help

# Colors for output
CYAN := \033[36m
GREEN := \033[32m
YELLOW := \033[33m
RED := \033[31m
RESET := \033[0m

# =============================================================================
# Help
# =============================================================================

help: ## Show this help message
	@echo ""
	@echo "$(CYAN)Tour Platform - Development Commands$(RESET)"
	@echo ""
	@echo "$(GREEN)Setup:$(RESET)"
	@grep -E '^(setup|install):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Development:$(RESET)"
	@grep -E '^(dev|build|lint|typecheck|format|clean|check):.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Docker:$(RESET)"
	@grep -E '^docker-.*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Database:$(RESET)"
	@grep -E '^db-.*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(GREEN)Deployment:$(RESET)"
	@grep -E '^(deploy-|pre-deploy).*:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(CYAN)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""

# =============================================================================
# Setup
# =============================================================================

setup: ## Initial project setup (install deps, start docker, setup env)
	@echo "$(CYAN)Setting up Tour Platform...$(RESET)"
	@make install
	@if [ ! -f .env.local ]; then \
		cp .env.example .env.local; \
		echo "$(GREEN)Created .env.local from .env.example$(RESET)"; \
		echo "$(YELLOW)Please update .env.local with your credentials$(RESET)"; \
	fi
	@make docker-up
	@echo ""
	@echo "$(GREEN)Setup complete!$(RESET)"
	@echo ""
	@echo "Next steps:"
	@echo "  1. Update .env.local with your Clerk keys (get from clerk.com)"
	@echo "  2. Run 'make dev' to start development servers"
	@echo ""
	@echo "Services running:"
	@echo "  - PostgreSQL: localhost:5432"
	@echo "  - Redis: localhost:6379"
	@echo "  - MinIO Console: http://localhost:9001 (minioadmin/minioadmin)"
	@echo "  - Mailpit: http://localhost:8025"

install: ## Install all dependencies
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	pnpm install

# =============================================================================
# Development
# =============================================================================

dev: ## Start development servers (CRM: 3000, Web: 3001)
	@echo "$(CYAN)Starting development servers...$(RESET)"
	@echo "  CRM: http://localhost:3000"
	@echo "  Web: http://localhost:3001"
	pnpm dev

dev-crm: ## Start only CRM app
	pnpm dev --filter @tour/crm

dev-web: ## Start only Web app
	pnpm dev --filter @tour/web

build: ## Build all packages and apps
	@echo "$(CYAN)Building all packages...$(RESET)"
	pnpm build

lint: ## Run ESLint on all packages
	@echo "$(CYAN)Running linter...$(RESET)"
	pnpm lint

typecheck: ## Run TypeScript type checking
	@echo "$(CYAN)Running type check...$(RESET)"
	pnpm typecheck

format: ## Format code with Prettier
	@echo "$(CYAN)Formatting code...$(RESET)"
	pnpm format

check: ## Run all checks (lint + typecheck)
	@echo "$(CYAN)Running all checks...$(RESET)"
	@make lint
	@make typecheck
	@echo "$(GREEN)All checks passed!$(RESET)"

clean: ## Clean build artifacts and node_modules
	@echo "$(CYAN)Cleaning project...$(RESET)"
	pnpm clean
	rm -rf node_modules
	rm -rf apps/*/node_modules
	rm -rf packages/*/node_modules
	rm -rf apps/*/.next
	rm -rf .turbo

# =============================================================================
# Docker
# =============================================================================

docker-up: ## Start all Docker services
	@echo "$(CYAN)Starting Docker services...$(RESET)"
	docker-compose up -d
	@echo "$(GREEN)Services started!$(RESET)"
	@make docker-ps

docker-down: ## Stop all Docker services
	@echo "$(CYAN)Stopping Docker services...$(RESET)"
	docker-compose down

docker-logs: ## View Docker logs (use: make docker-logs s=postgres)
	@if [ -z "$(s)" ]; then \
		docker-compose logs -f; \
	else \
		docker-compose logs -f $(s); \
	fi

docker-ps: ## Show running Docker services
	@echo ""
	@echo "$(CYAN)Running services:$(RESET)"
	@docker-compose ps
	@echo ""

docker-clean: ## Stop and remove all Docker data (volumes)
	@echo "$(RED)Warning: This will delete all data!$(RESET)"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker-compose down -v
	@echo "$(GREEN)Docker data cleaned$(RESET)"

docker-restart: ## Restart all Docker services
	@make docker-down
	@make docker-up

# =============================================================================
# Database
# =============================================================================

db-generate: ## Generate Drizzle migrations
	@echo "$(CYAN)Generating migrations...$(RESET)"
	pnpm db:generate

db-push: ## Push schema to database
	@echo "$(CYAN)Pushing schema to database...$(RESET)"
	pnpm db:push

db-studio: ## Open Drizzle Studio
	@echo "$(CYAN)Opening Drizzle Studio...$(RESET)"
	pnpm db:studio

db-seed: ## Seed database with test data
	@echo "$(CYAN)Seeding database...$(RESET)"
	pnpm db:seed

# =============================================================================
# Shortcuts
# =============================================================================

up: docker-up ## Alias for docker-up
down: docker-down ## Alias for docker-down
logs: docker-logs ## Alias for docker-logs
ps: docker-ps ## Alias for docker-ps

# =============================================================================
# Production & Deployment
# =============================================================================

prod-build: ## Build for production
	@echo "$(CYAN)Building for production...$(RESET)"
	NODE_ENV=production pnpm build

deploy-staging: ## Deploy to staging (push to dev branch)
	@echo "$(CYAN)Deploying to staging...$(RESET)"
	git push origin dev
	@echo "$(GREEN)Staging deployment triggered!$(RESET)"
	@echo "Monitor at: https://github.com/$(shell git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/.git$$//')/actions"

deploy-prod: ## Deploy to production (merge dev to main)
	@echo "$(YELLOW)Deploying to production...$(RESET)"
	@read -p "Are you sure you want to deploy to production? [y/N] " confirm && [ "$$confirm" = "y" ] || exit 1
	git checkout main
	git pull origin main
	git merge dev --no-edit
	git push origin main
	git checkout dev
	@echo "$(GREEN)Production deployment triggered!$(RESET)"
	@echo "Monitor at: https://github.com/$(shell git remote get-url origin | sed 's/.*github.com[:/]//' | sed 's/.git$$//')/actions"

# =============================================================================
# Quick Checks Before Deploy
# =============================================================================

pre-deploy: ## Run all checks before deploying
	@echo "$(CYAN)Running pre-deployment checks...$(RESET)"
	@make lint
	@make typecheck
	@make build
	@echo "$(GREEN)All pre-deployment checks passed!$(RESET)"
