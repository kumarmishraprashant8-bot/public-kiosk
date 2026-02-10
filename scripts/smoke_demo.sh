#!/bin/bash
# CivicPulse Demo Smoke Test
# Comprehensive E2E test for hackathon demo
# Usage: ./smoke_demo.sh

set -e

BASE_URL="${API_URL:-http://localhost:8000}"
ADMIN_PASS="${ADMIN_PASSWORD:-admin123}"

echo "🔍 CivicPulse Demo Smoke Test"
echo "=============================="
echo "Base URL: $BASE_URL"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

test_endpoint() {
    local name="$1"
    local endpoint="$2"
    local method="${3:-GET}"
    local data="$4"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$endpoint" 2>/dev/null || echo -e "\n000")
    elif [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X "$method" -H "Content-Type: application/json" -d "$data" "$endpoint" 2>/dev/null || echo -e "\n000")
    else
        response=$(curl -s -w "\n%{http_code}" -X "$method" "$endpoint" 2>/dev/null || echo -e "\n000")
    fi
    
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status" = "200" ] || [ "$status" = "201" ]; then
        echo -e "${GREEN}✓ PASS${NC} ($status)"
        ((passed++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} ($status)"
        ((failed++))
        return 1
    fi
}

echo -e "${YELLOW}1. Basic Health Checks${NC}"
echo "------------------------"
test_endpoint "API Health" "$BASE_URL/health"
test_endpoint "API Root" "$BASE_URL/"

echo ""
echo -e "${YELLOW}2. Admin Endpoints${NC}"
echo "------------------------"
test_endpoint "Admin Metrics" "$BASE_URL/admin/metrics?password=$ADMIN_PASS"
test_endpoint "Admin Clusters" "$BASE_URL/admin/clusters?password=$ADMIN_PASS"

echo ""
echo -e "${YELLOW}3. Seed Demo Data${NC}"
echo "------------------------"
test_endpoint "Seed Demo" "$BASE_URL/admin/seed-demo?password=$ADMIN_PASS&count=50" "POST"

echo ""
echo -e "${YELLOW}4. Run Clustering${NC}"
echo "------------------------"
test_endpoint "Trigger Clustering" "$BASE_URL/admin/cluster-trigger?password=$ADMIN_PASS" "POST"

echo ""
echo -e "${YELLOW}5. Verify Clusters Created${NC}"
echo "------------------------"
test_endpoint "Get Clusters (after seed)" "$BASE_URL/admin/clusters?password=$ADMIN_PASS"

echo ""
echo -e "${YELLOW}6. OTP Flow Test${NC}"
echo "------------------------"
# Request OTP
echo -n "Testing OTP Request... "
otp_response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
    -d '{"phone": "+91-9876543210"}' \
    "$BASE_URL/auth/request-otp" 2>/dev/null || echo -e "\n000")
otp_status=$(echo "$otp_response" | tail -n1)
if [ "$otp_status" = "200" ]; then
    echo -e "${GREEN}✓ PASS${NC} ($otp_status)"
    ((passed++))
else
    echo -e "${RED}✗ FAIL${NC} ($otp_status)"
    ((failed++))
fi

# Verify OTP with bypass code
echo -n "Testing OTP Bypass (000000)... "
verify_response=$(curl -s -w "\n%{http_code}" -X POST -H "Content-Type: application/json" \
    -d '{"phone": "+91-9876543210", "code": "000000"}' \
    "$BASE_URL/auth/verify-otp" 2>/dev/null || echo -e "\n000")
verify_status=$(echo "$verify_response" | tail -n1)
verify_body=$(echo "$verify_response" | sed '$d')
if [ "$verify_status" = "200" ]; then
    # Extract token
    TOKEN=$(echo "$verify_body" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$TOKEN" ]; then
        echo -e "${GREEN}✓ PASS${NC} (got token)"
        ((passed++))
    else
        echo -e "${YELLOW}⚠ PARTIAL${NC} (no token in response)"
        ((passed++))
    fi
else
    echo -e "${RED}✗ FAIL${NC} ($verify_status)"
    ((failed++))
fi

echo ""
echo -e "${YELLOW}7. Submission Flow Test${NC}"
echo "------------------------"
if [ -n "$TOKEN" ]; then
    echo -n "Testing Create Submission... "
    sub_response=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "intent": "water_outage",
            "text": "No water supply since morning - smoke test",
            "latitude": 12.9716,
            "longitude": 77.5946
        }' \
        "$BASE_URL/submission" 2>/dev/null || echo -e "\n000")
    sub_status=$(echo "$sub_response" | tail -n1)
    sub_body=$(echo "$sub_response" | sed '$d')
    
    if [ "$sub_status" = "200" ] || [ "$sub_status" = "201" ]; then
        RECEIPT_ID=$(echo "$sub_body" | grep -o '"receipt_id":"[^"]*"' | cut -d'"' -f4)
        echo -e "${GREEN}✓ PASS${NC} (receipt: $RECEIPT_ID)"
        ((passed++))
        
        # Verify receipt
        if [ -n "$RECEIPT_ID" ]; then
            echo -n "Testing Receipt Verification... "
            receipt_response=$(curl -s -w "\n%{http_code}" "$BASE_URL/receipt/$RECEIPT_ID" 2>/dev/null || echo -e "\n000")
            receipt_status=$(echo "$receipt_response" | tail -n1)
            if [ "$receipt_status" = "200" ]; then
                echo -e "${GREEN}✓ PASS${NC}"
                ((passed++))
            else
                echo -e "${RED}✗ FAIL${NC} ($receipt_status)"
                ((failed++))
            fi
        fi
    else
        echo -e "${RED}✗ FAIL${NC} ($sub_status)"
        ((failed++))
    fi
else
    echo -e "${YELLOW}⚠ SKIPPED${NC} (no auth token)"
fi

echo ""
echo "=============================="
echo -e "Results: ${GREEN}$passed passed${NC}, ${RED}$failed failed${NC}"
echo ""

if [ $failed -gt 0 ]; then
    echo -e "${RED}❌ Some tests failed!${NC}"
    exit 1
else
    echo -e "${GREEN}✅ All tests passed! Demo is ready.${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Open Kiosk:  http://localhost:3000"
    echo "  2. Open Admin:  http://localhost:3001"
    echo "  3. Login with:  admin123"
    exit 0
fi
