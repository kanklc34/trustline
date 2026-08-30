import os
import httpx
import urllib.parse
from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse
from nokia_client import get_nokia_headers

router = APIRouter()

# In-memory data store: Temporary structure to hold verification results upon OAuth callback.
# In a real production system, this data should be stored in a distributed/persistent database like Redis.
verification_results = {}

# Real host verified in SIM Swap test: network-as-code.p-eu.apihub.nokia.io
NAC_AUTH_HOST = "https://network-as-code.p-eu.apihub.nokia.io"
NAC_API_HOST = "https://network-as-code.p-eu.apihub.nokia.io/passthrough/camara/v1/number-verification"

# We cache dynamically fetched values in memory (fetched again if the app restarts)
_oauth_config_cache: dict = {}

async def get_oauth_config() -> dict:
    """
    Implements steps 1 and 2 of the documentation:
    1) /oauth2/v1/auth/clientcredentials -> client_id, client_secret
    2) /.well-known/openid-configuration -> authorization_endpoint, token_endpoint
    Since this information doesn't change, it is simply cached (fetched once per process lifetime).
    """
    if _oauth_config_cache:
        return _oauth_config_cache

    api_key = os.getenv("NOKIA_NAC_API_KEY")
    headers = get_nokia_headers(api_key)

    async with httpx.AsyncClient() as client:
        cred_res = await client.get(f"{NAC_AUTH_HOST}/oauth2/v1/auth/clientcredentials", headers=headers)
        cred_res.raise_for_status()
        creds = cred_res.json()

        wellknown_res = await client.get(f"{NAC_AUTH_HOST}/.well-known/openid-configuration", headers=headers)
        wellknown_res.raise_for_status()
        wellknown = wellknown_res.json()

    _oauth_config_cache.update({
        "client_id": creds.get("client_id"),
        "client_secret": creds.get("client_secret"),
        "authorization_endpoint": wellknown.get("authorization_endpoint"),
        "token_endpoint": wellknown.get("token_endpoint"),
    })
    return _oauth_config_cache

@router.get("/auth/number-verification/start", tags=["OAuth"])
async def start_verification(phone_number: str):
    """
    [Step 3] Redirects the user to the CAMARA Number Verification (OAuth 2.0) page.
    The user is sent to the network provider (consent) to verify their own number.
    """
    # Normalize the number coming from the query parameter (see the same note in the callback).
    phone_number = phone_number.strip()
    if not phone_number.startswith("+"):
        phone_number = "+" + phone_number.lstrip()

    api_key = os.getenv("NOKIA_NAC_API_KEY")
    redirect_uri = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/number-verification/callback")

    # If the API key is not defined, a mock redirect is performed so as not to break developer experience (DX).
    if not api_key or api_key == "your_nokia_nac_api_key_here":
        print(f"[MOCK] OAuth Start: Initiating mock flow for '{phone_number}'.")
        mock_code = "mock_auth_code_for_" + phone_number.replace("+", "")
        return RedirectResponse(url=f"{redirect_uri}?code={mock_code}&state={phone_number}")

    try:
        config = await get_oauth_config()
    except Exception as e:
        print(f"[ERROR] Could not get OAuth config: {e}")
        raise HTTPException(status_code=502, detail="Failed to retrieve Nokia NaC OAuth configuration.")

    scope = "dpv:FraudPreventionAndDetection number-verification:verify"

    params = {
        "client_id": config["client_id"],
        "response_type": "code",
        "redirect_uri": redirect_uri,
        "scope": scope,
        "login_hint": phone_number,
        # For security, the state should contain both a random token (CSRF prevention) and context.
        # For this prototype, we carry the number directly in the state to identify it upon return.
        "state": phone_number
    }

    url = f"{config['authorization_endpoint']}?{urllib.parse.urlencode(params)}"
    return RedirectResponse(url=url)

@router.get("/auth/number-verification/callback", tags=["OAuth"])
async def verification_callback(code: str, state: str):
    """
    [Steps 4 and 5] The endpoint called when the user returns from the network provider (consent).
    The 'code' is exchanged for a token, and a request is made to the actual Number Verification API with this token.
    """
    # NOTE: In the OAuth redirect chain, the '+' character can sometimes turn into
    # a space according to URL query string rules (in application/x-www-form-urlencoded, '+' = space).
    # Therefore, we normalize the number before using it: clean spaces, add '+' if missing.
    phone_number = state.strip()
    if not phone_number.startswith("+"):
        phone_number = "+" + phone_number.lstrip()
    redirect_uri = os.getenv("REDIRECT_URI", "http://localhost:8000/auth/number-verification/callback")

    # Mock / Simulation logic (If real credentials are not present)
    if code.startswith("mock_auth_code_for_"):
        print(f"[MOCK] Callback received. Number: {phone_number}")
        # Test scenario: If the number is '+99999990500', return verification as failed (False)
        is_verified = False if phone_number == "+99999990500" else True
        verification_results[phone_number] = {"verified": is_verified, "status": "completed"}
        return {
            "message": "Verification simulated (MOCK).", 
            "phone_number": phone_number, 
            "verified": is_verified
        }

    try:
        config = await get_oauth_config()
    except Exception as e:
        print(f"[ERROR] Could not get OAuth config: {e}")
        raise HTTPException(status_code=502, detail="Failed to retrieve Nokia NaC OAuth configuration.")

    # Payload for getting the real token (Token Exchange)
    token_payload = {
        "grant_type": "authorization_code",
        "code": code,
        "client_id": config["client_id"],
        "client_secret": config["client_secret"],
        "redirect_uri": redirect_uri
    }
    
    async with httpx.AsyncClient() as client:
        try:
            # Step 4: Obtain Access Token using the authorization code
            token_res = await client.post(config["token_endpoint"], data=token_payload)
            token_res.raise_for_status()
            token_data = token_res.json()
            access_token = token_data.get("access_token")
            
            # Step 5: Make the 'Number Verification' request using the retrieved Access Token
            verify_url = f"{NAC_API_HOST}/number-verification/v0/verify"
            verify_headers = {
                **get_nokia_headers(),
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            }
            verify_payload = {"phoneNumber": phone_number}
            
            verify_res = await client.post(verify_url, json=verify_payload, headers=verify_headers)
            verify_res.raise_for_status()
            
            verify_data = verify_res.json()
            
            # The API usually returns 'devicePhoneNumberVerified' (bool)
            is_verified = verify_data.get("devicePhoneNumberVerified", False)
            
            # Save the result in the in-memory dictionary for the LangGraph agent to read
            verification_results[phone_number] = {
                "verified": is_verified,
                "raw_data": verify_data,
                "status": "completed"
            }
            
            return {
                "message": "Number Verification completed successfully.", 
                "verified": is_verified
            }

        except httpx.HTTPStatusError as e:
            print(f"[ERROR] Number Verification Error: {e.response.text}")
            verification_results[phone_number] = {"verified": False, "status": "failed", "error": str(e)}
            raise HTTPException(status_code=500, detail="A network error occurred during verification.")
