#!/usr/bin/env python3
"""
Backend Test Suite for Mercado Pago Preapproval Implementation
Tests the recurring subscription functionality using Mercado Pago API
"""

import requests
import json
import uuid
from datetime import datetime
import time

# Configuration
BACKEND_URL = "https://meu-humor-diario-backend-de811f34620e.herokuapp.com/api"
TEST_USER_EMAIL = f"test_user_{int(time.time())}@example.com"
TEST_USER_PASSWORD = "testpass123"
TEST_USER_NAME = "Test User Preapproval"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def register_test_user(self):
        """Register a test user for authentication"""
        try:
            payload = {
                "name": TEST_USER_NAME,
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD,
                "confirm_password": TEST_USER_PASSWORD
            }
            
            response = self.session.post(f"{BACKEND_URL}/register", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                self.user_id = data.get("user", {}).get("id")
                
                # Set authorization header for future requests
                self.session.headers.update({
                    "Authorization": f"Bearer {self.auth_token}"
                })
                
                self.log_result(
                    "User Registration", 
                    True, 
                    f"User registered successfully with ID: {self.user_id}"
                )
                return True
            else:
                self.log_result(
                    "User Registration", 
                    False, 
                    f"Registration failed with status {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("User Registration", False, f"Exception: {str(e)}")
            return False
    
    def test_subscription_plans(self):
        """Test getting subscription plans"""
        try:
            response = self.session.get(f"{BACKEND_URL}/subscription/plans")
            
            if response.status_code == 200:
                data = response.json()
                plans = data.get("plans", [])
                
                # Check if monthly plan exists
                monthly_plan = next((p for p in plans if p.get("id") == "monthly"), None)
                
                if monthly_plan:
                    self.log_result(
                        "Subscription Plans", 
                        True, 
                        f"Found {len(plans)} plans including monthly plan"
                    )
                    return True
                else:
                    self.log_result(
                        "Subscription Plans", 
                        False, 
                        "Monthly plan not found in response",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Subscription Plans", 
                    False, 
                    f"Failed to get plans, status: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Subscription Plans", False, f"Exception: {str(e)}")
            return False
    
    def test_preapproval_checkout(self):
        """Test creating preapproval checkout session"""
        try:
            payload = {
                "plan_id": "monthly",
                "success_url": "http://localhost:3000/success",
                "cancel_url": "http://localhost:3000/cancel"
            }
            
            response = self.session.post(f"{BACKEND_URL}/subscription/checkout", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                checkout_url = data.get("checkout_url")
                session_id = data.get("session_id")
                
                if checkout_url and session_id:
                    # Verify the checkout_url is from Mercado Pago
                    if "mercadopago.com" in checkout_url or "mercadolibre.com" in checkout_url:
                        self.log_result(
                            "Preapproval Checkout Creation", 
                            True, 
                            f"Preapproval created successfully with session_id: {session_id}"
                        )
                        
                        # Store session_id for webhook testing
                        self.preapproval_session_id = session_id
                        return True
                    else:
                        self.log_result(
                            "Preapproval Checkout Creation", 
                            False, 
                            "Invalid checkout URL - not from Mercado Pago",
                            data
                        )
                        return False
                else:
                    self.log_result(
                        "Preapproval Checkout Creation", 
                        False, 
                        "Missing checkout_url or session_id in response",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Preapproval Checkout Creation", 
                    False, 
                    f"Failed to create checkout, status: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Preapproval Checkout Creation", False, f"Exception: {str(e)}")
            return False
    
    def test_webhook_preapproval_authorized(self):
        """Test webhook handler with preapproval authorized event"""
        try:
            # Simulate Mercado Pago webhook for preapproval authorized
            webhook_payload = {
                "type": "subscription_preapproval",
                "action": "payment.updated",
                "data": {
                    "id": getattr(self, 'preapproval_session_id', 'test_preapproval_id')
                }
            }
            
            # Remove auth header for webhook (webhooks don't use auth)
            headers = self.session.headers.copy()
            if 'Authorization' in headers:
                del headers['Authorization']
            
            response = requests.post(
                f"{BACKEND_URL}/webhook/mercadopago", 
                json=webhook_payload,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_result(
                        "Webhook Preapproval Handler", 
                        True, 
                        "Webhook processed successfully"
                    )
                    return True
                else:
                    self.log_result(
                        "Webhook Preapproval Handler", 
                        False, 
                        "Webhook returned unexpected response",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Webhook Preapproval Handler", 
                    False, 
                    f"Webhook failed with status: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Webhook Preapproval Handler", False, f"Exception: {str(e)}")
            return False
    
    def test_webhook_recurring_payment(self):
        """Test webhook handler with recurring payment event"""
        try:
            # Simulate Mercado Pago webhook for recurring payment
            webhook_payload = {
                "type": "payment",
                "data": {
                    "id": "test_payment_id_123"
                }
            }
            
            # Remove auth header for webhook
            headers = self.session.headers.copy()
            if 'Authorization' in headers:
                del headers['Authorization']
            
            response = requests.post(
                f"{BACKEND_URL}/webhook/mercadopago", 
                json=webhook_payload,
                headers=headers
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    self.log_result(
                        "Webhook Recurring Payment Handler", 
                        True, 
                        "Recurring payment webhook processed successfully"
                    )
                    return True
                else:
                    self.log_result(
                        "Webhook Recurring Payment Handler", 
                        False, 
                        "Webhook returned unexpected response",
                        data
                    )
                    return False
            else:
                self.log_result(
                    "Webhook Recurring Payment Handler", 
                    False, 
                    f"Webhook failed with status: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Webhook Recurring Payment Handler", False, f"Exception: {str(e)}")
            return False
    
    def test_subscription_status(self):
        """Test getting subscription status after webhook processing"""
        try:
            response = self.session.get(f"{BACKEND_URL}/subscription/status")
            
            if response.status_code == 200:
                data = response.json()
                has_subscription = data.get("has_subscription", False)
                status = data.get("status", "none")
                
                self.log_result(
                    "Subscription Status Check", 
                    True, 
                    f"Status retrieved: {status}, has_subscription: {has_subscription}"
                )
                return True
            else:
                self.log_result(
                    "Subscription Status Check", 
                    False, 
                    f"Failed to get status, code: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Subscription Status Check", False, f"Exception: {str(e)}")
            return False
    
    def test_checkout_status(self):
        """Test getting checkout status"""
        try:
            session_id = getattr(self, 'preapproval_session_id', 'test_session_id')
            response = self.session.get(f"{BACKEND_URL}/subscription/checkout/status/{session_id}")
            
            if response.status_code == 200:
                data = response.json()
                status = data.get("status", "unknown")
                payment_status = data.get("payment_status", "unknown")
                
                self.log_result(
                    "Checkout Status Check", 
                    True, 
                    f"Checkout status: {status}, payment_status: {payment_status}"
                )
                return True
            else:
                self.log_result(
                    "Checkout Status Check", 
                    False, 
                    f"Failed to get checkout status, code: {response.status_code}",
                    response.text
                )
                return False
                
        except Exception as e:
            self.log_result("Checkout Status Check", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting Mercado Pago Preapproval Backend Tests")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.register_test_user,
            self.test_subscription_plans,
            self.test_preapproval_checkout,
            self.test_webhook_preapproval_authorized,
            self.test_webhook_recurring_payment,
            self.test_subscription_status,
            self.test_checkout_status
        ]
        
        passed = 0
        total = len(tests)
        
        for test in tests:
            if test():
                passed += 1
            print()  # Add spacing between tests
        
        # Summary
        print("=" * 60)
        print(f"📊 Test Summary: {passed}/{total} tests passed")
        
        if passed == total:
            print("🎉 All tests passed! Mercado Pago preapproval implementation is working correctly.")
        else:
            print("⚠️  Some tests failed. Check the details above.")
        
        return passed, total, self.test_results

def main():
    """Main test execution"""
    tester = BackendTester()
    passed, total, results = tester.run_all_tests()
    
    # Save detailed results to file
    with open('/app/test_results_detailed.json', 'w') as f:
        json.dump({
            "summary": {
                "passed": passed,
                "total": total,
                "success_rate": f"{(passed/total)*100:.1f}%"
            },
            "results": results
        }, f, indent=2)
    
    return passed == total

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)