# TrustLine

**TrustLine** is an AI-powered state machine (agent) built for the GSMA MENA Ignite Hackathon (Open Innovation). It uses CAMARA Network APIs to combat SIM swap fraud and fake accounts by evaluating real-time telecom network signals.

## Architecture

- **Backend**: Python + FastAPI
- **AI Agent**: LangGraph (State Machine) + Google Gemini 3.5 Flash Lite
- **Frontend**: Next.js (App Router) + TailwindCSS
- **Network APIs**: Nokia Network-as-Code (NaC) Sandbox (SIM Swap & Number Verification)

---

## 🚀 Instructions to Run

Follow these steps to run the complete environment (Backend + Frontend) locally.

### 1. Prerequisites
- Python 3.9+
- Node.js 18+ & npm

### 2. Backend Setup
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create your `.env` file (⚠️ must be created **inside the `backend/` folder**, next to `.env.example` — not in the project root):
   ```bash
   cp .env.example .env
   ```
5. **Fill in the `.env` file** with your API keys:
   - `GEMINI_API_KEY`: Your Google AI Studio API key for Gemini.
   - `NOKIA_NAC_API_KEY`: Your NaC API key (if applicable for SIM Swap).
   - `NOKIA_NAC_CLIENT_ID` & `NOKIA_NAC_CLIENT_SECRET`: Your OAuth credentials from the Nokia NaC Dashboard for Number Verification.
   *(Note: If you leave these blank or as their default placeholder text, the backend will gracefully fall back to **MOCK mode** using pre-configured simulator numbers).*
6. Start the FastAPI server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   *The API will be available at http://localhost:8000*

### 3. Frontend Setup
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node dependencies:
   ```bash
   npm install
   ```
3. Start the Next.js development server:
   ```bash
   npm run dev
   ```
4. Open your browser and go to **http://localhost:3000**

---

## 🧪 Testing the 3 Main Scenarios

Once both servers are running, use the UI at `http://localhost:3000` to test the agent:

1. **Clean SIM (STEP_UP → APPROVE after OAuth)**:
   - Input: `+99999991001`
   - Expected right after entering the number: medium trust score (~60), yellow STEP_UP_VERIFICATION card — this is because Number Verification starts as "pending" until OAuth completes.
   - Click "Start OAuth Verification" on the result card to run the real 3-legged Number Verification OAuth flow for this number. Once verified, the page automatically re-checks and the score rises to 85+, green APPROVE.
   - *Note: SIM Swap for this number calls the real Nokia sandbox — Nokia Network-as-Code support confirmed (support ticket #140813) that `+99999991001` reliably returns `{"swapped": false}` on the live SIM Swap endpoint. Device Status still uses a fixed value for this number, since Nokia has only confirmed stable behavior for the SIM Swap endpoint specifically.*

2. **SIM Swapped Recently (BLOCK) — real Nokia sandbox**:
   - Input: `+99999991000`
   - Expected: Low trust score (<30), red BLOCK card.
   - *Note: Confirmed by Nokia Network-as-Code support (ticket #140813) to reliably return `{"swapped": true}` on the live SIM Swap endpoint.*

3. **SIM Swapped Recently (BLOCK) — fallback demo scenario**:
   - Input: `+90000000001`
   - Expected: Low trust score (<30), red BLOCK card.
   - *Note: Fixed demo scenario number, does not call the real Nokia sandbox. Useful as a fallback if the live sandbox is unavailable.*

4. **Ambiguous/Pending (STEP-UP VERIFICATION)**:
   - Input: `+90000000003`
   - Expected: Medium trust score (40-69), yellow STEP_UP_VERIFICATION card.
   - *Note: Fixed demo scenario number — SIM Swap and Device Status are always returned as clean, while Number Verification is always shown as "pending" regardless of OAuth state, in order to reliably demonstrate this scenario in a demo.*

---

## ⚠️ Note on Data & Privacy

This is a hackathon prototype. All testing uses Nokia NaC's **simulator phone numbers** — no real user data is collected, stored, or processed. A production deployment of TrustLine would require full compliance with applicable data protection regulations (e.g. GDPR, KVKK) before processing real phone numbers or telecom signals.

## New Features (v2)

- **Device Status Signal**: A third risk signal added that checks whether the device is connected to the network via CAMARA.
- **Integration Guide**: `backend/INTEGRATION.md` document added, showing how fintech/e-commerce systems can call the API and example pricing.
- **Partner Dashboard**: A reporting interface and API added that lists risk evaluations, showing approval/rejection statistics with masked phone numbers.

## License

This project is licensed under the [Apache License 2.0](LICENSE).
