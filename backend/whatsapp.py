import os
from flask import Flask, request
from twilio.twiml.messaging_response import MessagingResponse
import requests

app = Flask(__name__)

# Store user states (better than session for Twilio)
user_sessions = {}

API_BASE = "http://127.0.0.1:5000/api"  # change if needed

@app.route("/webhook/twilio-whatsapp", methods=['POST'])
def whatsapp_bot():
    incoming_msg = request.values.get('Body', '').strip()
    from_number = request.values.get('From')

    resp = MessagingResponse()
    msg = resp.message()

    # Get user state
    user_state = user_sessions.get(from_number, {}).get("state", "START")

    # ======================
    # START MENU
    # ======================
    if user_state == "START" or incoming_msg.lower() in ['hi', 'hello', 'menu']:
        user_sessions[from_number] = {"state": "MENU"}

        msg.body(
            "👋 Welcome to Ontract Services\n\n"
            "Choose an option:\n"
            "1️⃣ View My Work Orders\n"
            "2️⃣ Check Work Order Status\n"
            "3️⃣ Assign Contractor\n"
            "4️⃣ Help"
        )

    # ======================
    # MENU HANDLING
    # ======================
    elif user_state == "MENU":

        # 1️⃣ VIEW WORK ORDERS
        if incoming_msg == "1":
            try:
                res = requests.get(f"{API_BASE}/workorders")
                data = res.json()

                if not data:
                    msg.body("No work orders found.")
                else:
                    reply = "📋 Work Orders:\n\n"
                    for wo in data[:5]:
                        reply += f"• {wo['workorder']} ({wo['status']})\n"

                    msg.body(reply)

            except Exception as e:
                msg.body(f"Error fetching work orders: {str(e)}")

        # 2️⃣ CHECK STATUS
        elif incoming_msg == "2":
            user_sessions[from_number]["state"] = "WAITING_WO"
            msg.body("Enter Work Order ID:")

        # 3️⃣ ASSIGN CONTRACTOR
        elif incoming_msg == "3":
            user_sessions[from_number]["state"] = "ASSIGN_WO"
            msg.body("Enter Work Order ID to assign contractor:")

        # 4️⃣ HELP
        elif incoming_msg == "4":
            msg.body("Contact support at support@ontract.com")

        else:
            msg.body("Invalid option. Please choose 1–4.")

    # ======================
    # CHECK STATUS FLOW
    # ======================
    elif user_state == "WAITING_WO":
        try:
            res = requests.get(f"{API_BASE}/workorders/code/{incoming_msg}")
            data = res.json()

            msg.body(
                f"📌 Work Order: {data.get('workorder')}\n"
                f"Status: {data.get('status')}\n"
                f"Client: {data.get('client')}"
            )

        except:
            msg.body("❌ Work order not found.")

        user_sessions[from_number]["state"] = "MENU"

    # ======================
    # ASSIGN CONTRACTOR FLOW
    # ======================
    elif user_state == "ASSIGN_WO":
        user_sessions[from_number]["workorder"] = incoming_msg
        user_sessions[from_number]["state"] = "WAITING_CONTRACTOR"

        msg.body("Enter Contractor ID:")

    elif user_state == "WAITING_CONTRACTOR":
        wo = user_sessions[from_number].get("workorder")

        try:
            res = requests.post(
                f"{API_BASE}/workorders/assign/{wo}",
                json={"contractor_id": incoming_msg}
            )

            msg.body("✅ Contractor assigned successfully!")

        except:
            msg.body("❌ Failed to assign contractor.")

        user_sessions[from_number]["state"] = "MENU"

    return str(resp)


if __name__ == "__main__":
    app.run(port=5000)