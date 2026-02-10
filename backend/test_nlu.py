import requests
import json

url = "http://127.0.0.1:8000/submission"
headers = {
    "Content-Type": "application/json",
    # "Authorization": "Bearer ..." # Not needed in demo mode logic if header absent? 
    # Wait, get_current_user logic: "if settings.DEMO_MODE and not authorization: ... return demo_user"
    # So no auth needed.
}

# Test Hindi
data_hi = {
    "intent": "water_issue",
    "text": "मेरे घर में पानी नहीं आ रहा है", # "Water is not coming to my house"
    "latitude": 12.9716,
    "longitude": 77.5946
}

try:
    response = requests.post(url, headers=headers, json=data_hi)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        # DB was reset, so likely ID is 1. If not, this is just a test script.
        submission_id = 1
        
        # Get submission details
        s_resp = requests.get(f"http://127.0.0.1:8000/submission/{submission_id}")
        s_data = s_resp.json()
        print(f"Detected Language: {s_data.get('language')}")
        print(f"Full Submission: {s_data}")
except Exception as e:
    print(f"Error: {e}")
