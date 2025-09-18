#!/bin/bash

# Deployment Verification Script for Jirung Senior Advisor
# This script runs a comprehensive check after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOYMENT_URL=${1:-"http://localhost:3000"}
TIMEOUT=30

echo -e "${BLUE}🚀 Jirung Senior Advisor - Deployment Verification${NC}"
echo -e "${BLUE}Testing URL: $DEPLOYMENT_URL${NC}"
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if URL is accessible
check_accessibility() {
    print_info "Checking if deployment is accessible..."
    
    if curl -s --max-time $TIMEOUT "$DEPLOYMENT_URL" > /dev/null; then
        print_status 0 "Deployment is accessible"
        return 0
    else
        print_status 1 "Deployment is not accessible"
        return 1
    fi
}

# Check health endpoint
check_health() {
    print_info "Checking health endpoint..."
    
    local response=$(curl -s --max-time $TIMEOUT "$DEPLOYMENT_URL/api/health")
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    
    if [ "$status" = "healthy" ]; then
        print_status 0 "Health endpoint reports healthy"
        return 0
    elif [ "$status" = "degraded" ]; then
        print_warning "Health endpoint reports degraded services"
        return 0
    else
        print_status 1 "Health endpoint reports unhealthy or no response"
        return 1
    fi
}

# Check chat API
check_chat_api() {
    print_info "Testing chat API..."
    
    local response=$(curl -s --max-time $TIMEOUT \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"message":"สวัสดีครับ"}' \
        "$DEPLOYMENT_URL/api/chat")
    
    if echo "$response" | grep -q '"response"'; then
        print_status 0 "Chat API is working"
        return 0
    else
        print_status 1 "Chat API is not responding correctly"
        return 1
    fi
}

# Check LINE integration
check_line_integration() {
    print_info "Testing LINE integration..."
    
    local response=$(curl -s --max-time $TIMEOUT \
        -X POST \
        -H "Content-Type: application/json" \
        -d '{"sessionId":"550e8400-e29b-41d4-a716-446655440000","context":"test"}' \
        "$DEPLOYMENT_URL/api/chat/line-click")
    
    if echo "$response" | grep -q '"success":true'; then
        print_status 0 "LINE integration is working"
        return 0
    else
        print_status 1 "LINE integration is not working"
        return 1
    fi
}

# Check security headers
check_security_headers() {
    print_info "Checking security headers..."
    
    local headers=$(curl -s -I --max-time $TIMEOUT "$DEPLOYMENT_URL")
    local missing_headers=()
    
    if ! echo "$headers" | grep -qi "x-content-type-options"; then
        missing_headers+=("X-Content-Type-Options")
    fi
    
    if ! echo "$headers" | grep -qi "x-frame-options"; then
        missing_headers+=("X-Frame-Options")
    fi
    
    if ! echo "$headers" | grep -qi "x-xss-protection"; then
        missing_headers+=("X-XSS-Protection")
    fi
    
    if ! echo "$headers" | grep -qi "referrer-policy"; then
        missing_headers+=("Referrer-Policy")
    fi
    
    if [ ${#missing_headers[@]} -eq 0 ]; then
        print_status 0 "All security headers are present"
        return 0
    else
        print_warning "Missing security headers: ${missing_headers[*]}"
        return 0  # Warning, not error
    fi
}

# Check SSL certificate (if HTTPS)
check_ssl() {
    if [[ $DEPLOYMENT_URL == https://* ]]; then
        print_info "Checking SSL certificate..."
        
        local domain=$(echo "$DEPLOYMENT_URL" | sed 's|https://||' | sed 's|/.*||')
        
        if openssl s_client -connect "$domain:443" -servername "$domain" < /dev/null 2>/dev/null | grep -q "Verify return code: 0"; then
            print_status 0 "SSL certificate is valid"
            return 0
        else
            print_status 1 "SSL certificate has issues"
            return 1
        fi
    else
        print_warning "SSL check skipped (not using HTTPS)"
        return 0
    fi
}

# Check response times
check_performance() {
    print_info "Checking response times..."
    
    local health_time=$(curl -s -w "%{time_total}" -o /dev/null --max-time $TIMEOUT "$DEPLOYMENT_URL/api/health")
    local page_time=$(curl -s -w "%{time_total}" -o /dev/null --max-time $TIMEOUT "$DEPLOYMENT_URL")
    
    # Convert to milliseconds for easier reading
    local health_ms=$(echo "$health_time * 1000" | bc -l | cut -d. -f1)
    local page_ms=$(echo "$page_time * 1000" | bc -l | cut -d. -f1)
    
    echo "  Health endpoint: ${health_ms}ms"
    echo "  Main page: ${page_ms}ms"
    
    if [ "$health_ms" -lt 1000 ] && [ "$page_ms" -lt 3000 ]; then
        print_status 0 "Response times are acceptable"
        return 0
    else
        print_warning "Response times are slower than expected"
        return 0  # Warning, not error
    fi
}

# Run E2E tests
run_e2e_tests() {
    print_info "Running E2E test suite..."
    
    if command -v npm >/dev/null 2>&1; then
        if [ -f "playwright.config.ts" ]; then
            if npm run test:e2e; then
                print_status 0 "E2E tests passed"
            else
                print_status 1 "E2E tests failed"
                return 1
            fi
        else
            print_warning "Playwright config not found"
        fi
    else
        print_warning "npm not available for E2E tests"
    fi
}

# Main verification function
main() {
    local failed_checks=0
    
    # Basic connectivity and functionality
    check_accessibility || ((failed_checks++))
    check_health || ((failed_checks++))
    check_chat_api || ((failed_checks++))
    check_line_integration || ((failed_checks++))
    
    # Security and performance
    check_security_headers || true  # Don't fail on warnings
    check_ssl || ((failed_checks++))
    check_performance || true  # Don't fail on warnings
    
    # Comprehensive tests (if available)
    if [ "$2" = "--full" ]; then
        run_e2e_tests || ((failed_checks++))
    fi
    
    echo ""
    echo -e "${BLUE}📊 Verification Summary${NC}"
    
    if [ $failed_checks -eq 0 ]; then
        echo -e "${GREEN}🎉 All critical checks passed! Deployment is ready.${NC}"
        echo ""
        echo -e "${GREEN}✅ Deployment URL: $DEPLOYMENT_URL${NC}"
        echo -e "${GREEN}✅ Health Check: $DEPLOYMENT_URL/api/health${NC}"
        echo -e "${GREEN}✅ Chat Interface: $DEPLOYMENT_URL${NC}"
        echo ""
        exit 0
    else
        echo -e "${RED}❌ $failed_checks critical check(s) failed.${NC}"
        echo -e "${RED}Please fix the issues before considering the deployment ready.${NC}"
        echo ""
        exit 1
    fi
}

# Help function
show_help() {
    echo "Usage: $0 [URL] [--full]"
    echo ""
    echo "Arguments:"
    echo "  URL     Deployment URL to test (default: http://localhost:3000)"
    echo "  --full  Run comprehensive tests including pre-deployment checks"
    echo ""
    echo "Examples:"
    echo "  $0                                    # Test local development"
    echo "  $0 https://myapp.vercel.app          # Test production deployment"
    echo "  $0 https://myapp.vercel.app --full   # Full test suite"
    echo ""
}

# Check for help flag
if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    show_help
    exit 0
fi

# Check dependencies
if ! command -v curl >/dev/null 2>&1; then
    echo -e "${RED}❌ curl is required but not installed.${NC}"
    exit 1
fi

if ! command -v bc >/dev/null 2>&1; then
    print_warning "bc is not installed. Response time calculations may not work."
fi

# Run main verification
main "$@"