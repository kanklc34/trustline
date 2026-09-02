import os
import httpx
from nokia_client import get_nokia_headers

# Real endpoint verified from Nokia NaC playground (taken from Test Endpoint cURL output)
SIM_SWAP_URL = "https://network-as-code.p-eu.apihub.nokia.io/passthrough/camara/v1/sim-swap/sim-swap/v0/check"

# --- DEMO SCENARIO NUMBERS (fictional, never hit the real Nokia API) ---
# These numbers are not real Nokia sandbox devices; they're used to reliably
# demonstrate scenarios where the live sandbox doesn't offer a stable,
# confirmed test number (e.g. Device Status, Number Verification pending state).
DEMO_SWAPPED_NUMBER = (
    "+90000000001"  # Only for demo purposes, not a real simulator number
)
DEMO_NOT_CONNECTED_NUMBER = (
    "+90000000002"  # Only for demo purposes, not a real simulator number
)
DEMO_PENDING_VERIFICATION_NUMBER = (
    "+90000000003"  # Only for demo purposes — always shown as "pending" Number Verification,
    # regardless of whether OAuth was run for it. Used to reliably demonstrate the
    # STEP_UP_VERIFICATION scenario in the demo without depending on OAuth flow state.
)

# --- OFFICIAL NOKIA SIM SWAP SIMULATOR NUMBERS ---
# Confirmed directly by Nokia Network-as-Code support (ticket #140813, Aug 31 2026):
# these two numbers reliably return the documented SIM Swap result from the real
# sandbox API. Unlike the DEMO_* numbers above, calls for these numbers DO hit
# the live Nokia endpoint — no mocking needed.
#   +99999991000 -> {"swapped": true}
#   +99999991001 -> {"swapped": false}
NOKIA_SIM_SWAPPED_NUMBER = "+99999991000"
NOKIA_SIM_CLEAN_NUMBER = "+99999991001"


async def check_sim_swap(phone_number: str) -> dict:
    """
    Checks via the CAMARA API whether a SIM change has occurred
    for the specified phone number within the last 240 hours (10 days).
    """
    # Demo scenario number: return a predefined "risky" result without hitting the real API.
    if phone_number == DEMO_SWAPPED_NUMBER:
        print(
            f"[DEMO SCENARIO] Returning predefined SIM Swap=true scenario for '{phone_number}' (real API was not called)."
        )
        return {"swapped": True, "_demo_scenario": True}

    if phone_number == DEMO_NOT_CONNECTED_NUMBER:
        # This number belongs to the Device Status demo scenario; it is considered "clean" in terms of SIM Swap.
        print(
            f"[DEMO SCENARIO] Returning default (clean) SIM Swap for '{phone_number}' (real API was not called)."
        )
        return {"swapped": False, "_demo_scenario": True}

    if phone_number == DEMO_PENDING_VERIFICATION_NUMBER:
        # This number is reserved for the STEP_UP_VERIFICATION demo scenario; SIM Swap is clean.
        print(
            f"[DEMO SCENARIO] Returning default (clean) SIM Swap for '{phone_number}' (real API was not called)."
        )
        return {"swapped": False, "_demo_scenario": True}

    api_key = os.getenv("NOKIA_NAC_API_KEY")

    # Developer convenience: If the API Key is not defined, let's simulate instead of throwing an error.
    if not api_key or api_key == "your_nokia_nac_api_key_here":
        print(
            f"[MOCK] Warning: NOKIA_NAC_API_KEY not found. Returning simulation data for '{phone_number}'."
        )
        return {"swapped": False}

    headers = {
        **get_nokia_headers(api_key),
        "Content-Type": "application/json",
    }

    payload = {"phoneNumber": phone_number, "maxAge": 240}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(SIM_SWAP_URL, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        # Fail-safe: if Nokia sandbox errors out or times out, don't crash the whole
        # agent flow. Return an "unknown" signal so evaluate_risk can treat it
        # conservatively instead of the whole request blowing up with a 500.
        print(f"[ERROR] SIM Swap check failed for '{phone_number}': {e}")
        return {"swapped": None, "_error": True, "_error_detail": str(e)}


DEVICE_STATUS_URL = (
    "https://network-as-code.p-eu.apihub.nokia.io/device-status/v0/connectivity"
)


async def check_device_status(phone_number: str) -> dict:
    """
    Checks whether the device is connected to the network for the specified phone number.
    """
    # For demo scenario numbers (both SIM Swap and Device Status demo numbers)
    # we never hit the real API — these are not real numbers recognized in Nokia's
    # simulator, but fictional numbers specific to our demo scenario.
    #
    # NOTE: Nokia support only confirmed stable behavior for NOKIA_SIM_SWAPPED_NUMBER /
    # NOKIA_SIM_CLEAN_NUMBER on the SIM Swap endpoint specifically (ticket #140813).
    # There's no such confirmation for the Device Status endpoint, so we still
    # return a fixed, predictable value for these two numbers here rather than
    # risking the same kind of inconsistent sandbox behavior we hit before.
    if phone_number in (NOKIA_SIM_SWAPPED_NUMBER, NOKIA_SIM_CLEAN_NUMBER):
        print(
            f"[DEMO SCENARIO] Returning default (CONNECTED_DATA) Device Status for '{phone_number}' "
            "(real API was not called — only the SIM Swap endpoint is confirmed stable for this number)."
        )
        return {"connectivityStatus": "CONNECTED_DATA", "_demo_scenario": True}

    if phone_number == DEMO_NOT_CONNECTED_NUMBER:
        print(
            f"[DEMO SCENARIO] Returning predefined NOT_CONNECTED scenario for '{phone_number}' (real API was not called)."
        )
        return {"connectivityStatus": "NOT_CONNECTED", "_demo_scenario": True}

    if phone_number == DEMO_SWAPPED_NUMBER:
        # The SIM Swap demo number is assumed to be in a "normal" connectivity state for Device Status.
        print(
            f"[DEMO SCENARIO] Returning default (CONNECTED_DATA) Device Status for '{phone_number}' (real API was not called)."
        )
        return {"connectivityStatus": "CONNECTED_DATA", "_demo_scenario": True}

    if phone_number == DEMO_PENDING_VERIFICATION_NUMBER:
        # STEP_UP_VERIFICATION demo scenario; Device Status is normal, only Number Verification is pending.
        print(
            f"[DEMO SCENARIO] Returning default (CONNECTED_DATA) Device Status for '{phone_number}' (real API was not called)."
        )
        return {"connectivityStatus": "CONNECTED_DATA", "_demo_scenario": True}

    api_key = os.getenv("NOKIA_NAC_API_KEY")

    if not api_key or api_key == "your_nokia_nac_api_key_here":
        print(
            f"[MOCK] Warning: NOKIA_NAC_API_KEY not found. Returning Device Status simulation data for '{phone_number}'."
        )
        return {"connectivityStatus": "CONNECTED_DATA"}

    headers = {
        **get_nokia_headers(api_key),
        "Content-Type": "application/json",
    }

    payload = {"device": {"phoneNumber": phone_number}}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(DEVICE_STATUS_URL, json=payload, headers=headers)
            response.raise_for_status()
            return response.json()
    except (httpx.HTTPStatusError, httpx.RequestError) as e:
        # Fail-safe: same reasoning as check_sim_swap — don't let a flaky sandbox
        # response take down the whole trust evaluation.
        print(f"[ERROR] Device Status check failed for '{phone_number}': {e}")
        return {"connectivityStatus": "UNKNOWN", "_error": True, "_error_detail": str(e)}
