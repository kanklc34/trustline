import os

# Shared Nokia Network-as-Code (NaC) constants, used by both camara.py (CAMARA
# API calls) and oauth.py (Number Verification 3-legged OAuth flow).
#
# This host string was previously duplicated in 4 separate places across
# camara.py and oauth.py. Kept in one place now so a future host/key change
# only has to happen here.
NAC_RAPIDAPI_HOST = "network-as-code.nokia.rapidapi.com"


def get_nokia_headers(api_key: str | None = None) -> dict:
    """
    Builds the standard RapidAPI headers used for Nokia NaC API calls.
    If api_key is not provided, reads NOKIA_NAC_API_KEY from the environment.
    """
    return {
        "x-rapidapi-key": api_key or os.getenv("NOKIA_NAC_API_KEY"),
        "x-rapidapi-host": NAC_RAPIDAPI_HOST,
    }
