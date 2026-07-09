import logging

from app.models.workorder import (
    WorkOrder,
    run_async_with_app_context
)
from app.utils.email_utils import send_rfq_email


def send_rfq_notifications_async(rfq):
    """
    Starts RFQ email notifications in the background.
    Returns immediately without blocking the API response.
    """

    run_async_with_app_context(
        _send_rfq_notifications,
        rfq
    )


def _send_rfq_notifications(rfq):
    """
    Sends RFQ notification emails to all contractors.
    Runs inside a background thread with Flask app context.
    """

    try:

        contractors = WorkOrder.get_all_rfq_contractors()

        logging.info(
            f"RFQ {rfq.get('rfq_no')} : Found {len(contractors)} contractors."
        )

        for contractor in contractors:

            email = contractor.get("email_id")

            if not email:
                continue

            try:

                html_body = f"""
                <html>
                <body>

                    <h2>New RFQ Published</h2>

                    <table border="1" cellpadding="8" cellspacing="0">

                        <tr>
                            <td><b>RFQ No</b></td>
                            <td>{rfq.get('rfq_no')}</td>
                        </tr>

                        <tr>
                            <td><b>RFQ Title</b></td>
                            <td>{rfq.get('rfq_title')}</td>
                        </tr>

                        <tr>
                            <td><b>Closing Date</b></td>
                            <td>{rfq.get('closing_date')}</td>
                        </tr>

                        <tr>
                            <td><b>Description</b></td>
                            <td>{rfq.get('description')}</td>
                        </tr>

                        <tr>
                            <td><b>Remarks</b></td>
                            <td>{rfq.get('remarks')}</td>
                        </tr>

                    </table>

                    <br>

                    <p>
                        Please login to the portal and submit your quotation.
                    </p>

                </body>
                </html>
                """

                send_rfq_email(
                    recipient=email,
                    html_body=html_body,
                    rfq_no=rfq["rfq_no"]
                )

                logging.info(
                    f"RFQ {rfq.get('rfq_no')} : Mail sent -> {email}"
                )

            except Exception:

                logging.exception(
                    f"RFQ {rfq.get('rfq_no')} : Failed sending mail -> {email}"
                )

        logging.info(
            f"RFQ {rfq.get('rfq_no')} : Notification completed."
        )

    except Exception:

        logging.exception(
            f"RFQ {rfq.get('rfq_no')} : Background notification failed."
        )