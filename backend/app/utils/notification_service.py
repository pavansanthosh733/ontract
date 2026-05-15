from firebase_admin import messaging
import logging


# =====================================================
# 🔥 SINGLE TOKEN NOTIFICATION
# =====================================================
def send_notification(token, title, body):
    """
    Send notification to a single device
    """

    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            webpush=messaging.WebpushConfig(
                notification=messaging.WebpushNotification(
                    title=title,
                    body=body,
                    icon="https://cdn-icons-png.flaticon.com/512/1827/1827392.png"
                )
            ),
            token=token,
        )

        response = messaging.send(message)

        logging.info(f"✅ Single notification sent: {response}")

    except Exception as e:
        logging.error(f"❌ Error sending single notification: {e}", exc_info=True)


# =====================================================
# 🔥 MULTIPLE TOKENS NOTIFICATION (MAIN FUNCTION)
# =====================================================
def send_notification_to_tokens(tokens, title, body):
    logging.info("Notification function called")

    try:
        if not tokens:
            logging.warning("No tokens available")
            return

        message = messaging.MulticastMessage(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data={
                "title": title,
                "body": body,
                "route": "/provider_home"
            },
            tokens=tokens,
        )

        response = messaging.send_each_for_multicast(message)

        logging.info(f"Success count: {response.success_count}")
        logging.info(f"Failure count: {response.failure_count}")

        # =========================
        # 🔍 ADD THIS BLOCK (IMPORTANT)
        # =========================
        from app.models.provider_model import ProviderModel

        for idx, resp in enumerate(response.responses):
            if not resp.success:
                error = str(resp.exception)

                logging.error(f"Token failed: {tokens[idx]}")
                logging.error(f"Firebase error: {error}")

                # =========================
                # 🧹 REMOVE INVALID TOKENS
                # =========================
                if (
                    "NotRegistered" in error
                    or "Invalid" in error
                    or "Requested entity was not found" in error
                ):
                    try:
                        ProviderModel.delete_token(tokens[idx])
                        logging.info(f"Removed invalid token: {tokens[idx]}")
                    except Exception as delete_err:
                        logging.error(f"Error deleting token: {delete_err}")

    except Exception as e:
        logging.error(f"Notification error: {e}", exc_info=True)


# =====================================================
# 🔥 OPTIONAL: SEND TO USER (FETCH TOKENS INSIDE)
# =====================================================
def send_notification_to_user(user_id, title, body, get_tokens_function):
    """
    Wrapper function:
    - Fetch tokens using model
    - Send notification

    get_tokens_function → pass your model function here
    """

    try:
        tokens, error = get_tokens_function(user_id)

        if error:
            logging.error(f"❌ Token fetch error: {error}")
            return

        if not tokens:
            logging.warning("⚠️ No tokens found for user")
            return

        send_notification_to_tokens(tokens, title, body)

    except Exception as e:
        logging.error(f"❌ Error sending notification to user: {e}", exc_info=True)