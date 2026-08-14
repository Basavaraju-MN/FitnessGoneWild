import sys
import os
import json
import uuid
import traceback

from dotenv import load_dotenv

from phonepe.sdk.pg.payments.v2.standard_checkout_client import (
    StandardCheckoutClient
)

from phonepe.sdk.pg.payments.v2.models.request.standard_checkout_pay_request import (
    StandardCheckoutPayRequest
)

from phonepe.sdk.pg.env import Env

from phonepe.sdk.pg.common.exceptions import (
    PhonePeException
)


# ============================================================
# LOAD ENVIRONMENT
# ============================================================

load_dotenv()


CLIENT_ID = os.getenv(
    "PHONEPE_CLIENT_ID"
)

CLIENT_SECRET = os.getenv(
    "PHONEPE_CLIENT_SECRET"
)

CLIENT_VERSION = int(
    os.getenv(
        "PHONEPE_CLIENT_VERSION",
        "1"
    )
)

PHONEPE_ENV = os.getenv(
    "PHONEPE_ENV",
    "SANDBOX"
).upper()

REDIRECT_URL = os.getenv(
    "PHONEPE_REDIRECT_URL"
)

WEBHOOK_USERNAME = os.getenv(
    "PHONEPE_WEBHOOK_USERNAME"
)

WEBHOOK_PASSWORD = os.getenv(
    "PHONEPE_WEBHOOK_PASSWORD"
)


# ============================================================
# VALIDATE CONFIGURATION
# ============================================================

if not CLIENT_ID:
    raise Exception(
        "PHONEPE_CLIENT_ID missing"
    )

if not CLIENT_SECRET:
    raise Exception(
        "PHONEPE_CLIENT_SECRET missing"
    )


# ============================================================
# PHONEPE ENVIRONMENT
# ============================================================

if PHONEPE_ENV == "PRODUCTION":

    environment = Env.PRODUCTION

else:

    environment = Env.SANDBOX


# ============================================================
# CREATE PHONEPE CLIENT
# ============================================================

client = StandardCheckoutClient.get_instance(

    client_id=CLIENT_ID,

    client_secret=CLIENT_SECRET,

    client_version=CLIENT_VERSION,

    env=environment,

    should_publish_events=False,

    should_retry=False

)


# ============================================================
# HELPER
# ============================================================

def get_attr(
    obj,
    attribute,
    default=None
):

    if obj is None:
        return default

    return getattr(
        obj,
        attribute,
        default
    )


# ============================================================
# PAYMENT DETAIL SERIALIZER
# ============================================================

def serialize_payment_details(
    payment_details
):

    result = []

    if not payment_details:
        return result


    for payment in payment_details:

        result.append({

            "transactionId":
                get_attr(
                    payment,
                    "transaction_id"
                ),

            "paymentMode":
                str(
                    get_attr(
                        payment,
                        "payment_mode",
                        ""
                    )
                ),

            "timestamp":
                get_attr(
                    payment,
                    "timestamp"
                ),

            "state":
                str(
                    get_attr(
                        payment,
                        "state",
                        ""
                    )
                ),

            "errorCode":
                get_attr(
                    payment,
                    "error_code"
                ),

            "detailedErrorCode":
                get_attr(
                    payment,
                    "detailed_error_code"
                )

        })


    return result


# ============================================================
# CREATE ORDER ID
# ============================================================

def generate_order_id():

    return (
        "FGW_"
        + uuid.uuid4()
        .hex[:25]
    )


# ============================================================
# CREATE PAYMENT
# ============================================================

def create_payment(data):

    amount_rupees = data.get(
        "amount"
    )


    if amount_rupees is None:

        raise Exception(
            "amount is required"
        )


    try:

        amount_rupees = float(
            amount_rupees
        )

    except ValueError:

        raise Exception(
            "Invalid amount"
        )


    if amount_rupees <= 0:

        raise Exception(
            "Amount must be greater than 0"
        )


    # /*
    # PhonePe expects amount in paisa.
    # */

    amount_paise = round(
        amount_rupees * 100
    )


    if amount_paise < 100:

        raise Exception(
            "Minimum amount is ₹1"
        )


    merchant_order_id = (
        data.get(
            "merchantOrderId"
        )
        or
        generate_order_id()
    )


    redirect_url = (
        data.get(
            "redirectUrl"
        )
        or
        REDIRECT_URL
    )


    if not redirect_url:

        raise Exception(
            "Redirect URL is missing"
        )


    payment_request = (
        StandardCheckoutPayRequest
        .build_request(

            merchant_order_id=
                merchant_order_id,

            amount=
                amount_paise,

            redirect_url=
                redirect_url,

            expire_after=
                3600,

            disable_payment_retry=
                False

        )
    )


    response = client.pay(
        payment_request
    )


    return {

        "merchantOrderId":
            merchant_order_id,

        "phonepeOrderId":
            get_attr(
                response,
                "order_id"
            ),

        "state":
            str(
                get_attr(
                    response,
                    "state",
                    ""
                )
            ),

        "redirectUrl":
            get_attr(
                response,
                "redirect_url"
            ),

        "expireAt":
            get_attr(
                response,
                "expire_at"
            ),

        "amountRupees":
            amount_rupees,

        "amountPaise":
            amount_paise

    }


# ============================================================
# CHECK PAYMENT STATUS
# ============================================================

def check_payment_status(data):

    merchant_order_id = data.get(
        "merchantOrderId"
    )


    if not merchant_order_id:

        raise Exception(
            "merchantOrderId is required"
        )


    response = (
        client.get_order_status(
            merchant_order_id
        )
    )


    payment_details = (
        get_attr(
            response,
            "payment_details",
            []
        )
    )


    return {

        "merchantOrderId":
            merchant_order_id,

        "phonepeOrderId":
            get_attr(
                response,
                "order_id"
            ),

        "state":
            str(
                get_attr(
                    response,
                    "state",
                    ""
                )
            ),

        "amount":
            get_attr(
                response,
                "amount"
            ),

        "expireAt":
            get_attr(
                response,
                "expire_at"
            ),

        "paymentDetails":
            serialize_payment_details(
                payment_details
            )

    }


# ============================================================
# WEBHOOK
# ============================================================

def process_webhook(data):

    authorization = data.get(
        "authorization"
    )

    raw_body = data.get(
        "rawBody"
    )


    if not authorization:

        raise Exception(
            "Authorization header missing"
        )


    if not raw_body:

        raise Exception(
            "Webhook body missing"
        )


    if not WEBHOOK_USERNAME:

        raise Exception(
            "PHONEPE_WEBHOOK_USERNAME missing"
        )


    if not WEBHOOK_PASSWORD:

        raise Exception(
            "PHONEPE_WEBHOOK_PASSWORD missing"
        )


    callback_response = (
        client.validate_callback(

            username=
                WEBHOOK_USERNAME,

            password=
                WEBHOOK_PASSWORD,

            callback_header_data=
                authorization,

            callback_response_data=
                raw_body

        )
    )


    payload = get_attr(
        callback_response,
        "payload"
    )


    event = (
        get_attr(
            callback_response,
            "event"
        )
        or
        get_attr(
            callback_response,
            "type"
        )
    )


    merchant_order_id = (
        get_attr(
            payload,
            "original_merchant_order_id"
        )
        or
        get_attr(
            payload,
            "merchant_order_id"
        )
    )


    payment_details = (
        get_attr(
            payload,
            "payment_details",
            []
        )
    )


    result = {

        "valid":
            True,

        "event":
            str(event)
            if event
            else None,

        "merchantOrderId":
            merchant_order_id,

        "phonepeOrderId":
            get_attr(
                payload,
                "order_id"
            ),

        "state":
            str(
                get_attr(
                    payload,
                    "state",
                    ""
                )
            ),

        "amount":
            get_attr(
                payload,
                "amount"
            ),

        "paymentDetails":
            serialize_payment_details(
                payment_details
            )

    }


    return result


# ============================================================
# MAIN
# ============================================================

def main():

    try:

        # /*
        # Read JSON passed from Node.js.
        # */

        input_data = (
            sys.stdin.read()
        )


        if not input_data:

            raise Exception(
                "No input received"
            )


        request = json.loads(
            input_data
        )


        action = request.get(
            "action"
        )

        data = request.get(
            "data",
            {}
        )


        # ------------------------------------------
        # CREATE PAYMENT
        # ------------------------------------------

        if action == "create-payment":

            result = create_payment(
                data
            )


        # ------------------------------------------
        # CHECK STATUS
        # ------------------------------------------

        elif action == "check-status":

            result = check_payment_status(
                data
            )


        # ------------------------------------------
        # WEBHOOK
        # ------------------------------------------

        elif action == "webhook":

            result = process_webhook(
                data
            )


        else:

            raise Exception(
                f"Invalid action: {action}"
            )


        # /*
        # IMPORTANT:

        # stdout should contain ONLY JSON,
        # because Node.js parses this output.
        # */

        print(
            json.dumps({
                "success": True,
                "data": result
            })
        )


    except PhonePeException as error:

        error_message = str(
            getattr(
                error,
                "message",
                str(error)
            )
        )


        print(
            json.dumps({

                "success":
                    False,

                "message":
                    error_message,

                "httpStatusCode":
                    getattr(
                        error,
                        "http_status_code",
                        None
                    )

            })
        )


    except Exception as error:

        print(
            json.dumps({

                "success":
                    False,

                "message":
                    str(error)

            })
        )


# ============================================================
# EXECUTE
# ============================================================

if __name__ == "__main__":

    main()