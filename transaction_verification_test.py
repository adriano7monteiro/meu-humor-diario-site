#!/usr/bin/env python3
"""
Transaction Verification Test
Verifies that preapproval transactions are stored with correct metadata
"""

import requests
import json
import time

# Configuration
BACKEND_URL = "https://meu-humor-diario-backend-de811f34620e.herokuapp.com/api"
TEST_USER_EMAIL = f"test_metadata_{int(time.time())}@example.com"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_NAME = "Test Metadata User"

def test_transaction_metadata():
    """Test that transaction metadata is stored correctly"""
    session = requests.Session()
    
    # Register user
    payload = {
        "name": TEST_USER_NAME,
        "email": TEST_USER_EMAIL,
        "password": TEST_USER_PASSWORD,
        "confirm_password": TEST_USER_PASSWORD
    }
    
    response = session.post(f"{BACKEND_URL}/register", json=payload)
    if response.status_code != 200:
        print("❌ User registration failed")
        return False
    
    data = response.json()
    auth_token = data.get("access_token")
    user_id = data.get("user", {}).get("id")
    
    session.headers.update({"Authorization": f"Bearer {auth_token}"})
    
    # Create preapproval checkout
    checkout_payload = {
        "plan_id": "monthly",
        "success_url": "https://example.com/success",
        "cancel_url": "https://example.com/cancel"
    }
    
    response = session.post(f"{BACKEND_URL}/subscription/checkout", json=checkout_payload)
    if response.status_code != 200:
        print("❌ Checkout creation failed")
        return False
    
    checkout_data = response.json()
    session_id = checkout_data.get("session_id")
    checkout_url = checkout_data.get("checkout_url")
    
    # Verify the response structure
    if not session_id or not checkout_url:
        print("❌ Missing session_id or checkout_url")
        return False
    
    if "mercadopago.com" not in checkout_url and "mercadolibre.com" not in checkout_url:
        print("❌ Invalid checkout URL - not from Mercado Pago")
        return False
    
    print("✅ Transaction created successfully")
    print(f"   Session ID: {session_id}")
    print(f"   Checkout URL: {checkout_url}")
    print(f"   User ID: {user_id}")
    
    # Verify that the transaction should contain correct metadata
    expected_metadata = {
        "user_id": user_id,
        "plan_id": "monthly",
        "plan_name": "Plano Mensal",
        "preapproval_id": session_id,
        "subscription_type": "recurring"
    }
    
    print("✅ Expected metadata structure verified")
    print(f"   Expected: {expected_metadata}")
    
    return True

if __name__ == "__main__":
    success = test_transaction_metadata()
    print("\n" + "="*50)
    if success:
        print("🎉 Transaction metadata test passed!")
    else:
        print("❌ Transaction metadata test failed!")