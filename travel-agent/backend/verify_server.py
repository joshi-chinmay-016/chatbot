import sys
import urllib.request
import json

if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Check health
health_url = "http://127.0.0.1:8000/api/travel/health"
req = urllib.request.Request(health_url)
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print("Health Status:", data)

# Test POST /api/travel
travel_url = "http://127.0.0.1:8000/api/travel"
payload = json.dumps({"message": "Plan a 3-day trip to Goa from Bangalore under ₹15,000"}).encode("utf-8")
post_req = urllib.request.Request(travel_url, data=payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(post_req) as resp:
    plan_data = json.loads(resp.read().decode())
    print("Travel Response received for trip:", plan_data["trip_id"])
    print("Goal:", plan_data["goal"])
    print("Total Cost:", plan_data["total_cost"])
    print("Replanned:", plan_data["replanned"])
    print("Approval required:", plan_data["human_approval_required"])

# Test POST /api/travel/approve
approve_url = "http://127.0.0.1:8000/api/travel/approve"
approve_payload = json.dumps({"trip_id": plan_data["trip_id"], "action": "approve"}).encode("utf-8")
approve_req = urllib.request.Request(approve_url, data=approve_payload, headers={"Content-Type": "application/json"})
with urllib.request.urlopen(approve_req) as resp:
    approve_data = json.loads(resp.read().decode())
    print("Approval Response:", approve_data)

print("\nServer verification successful!")
