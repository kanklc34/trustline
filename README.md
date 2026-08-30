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

1. **Clean Number (STEP_UP → APPROVE after OAuth)**:
   - Input: `+99999991000`
   - Expected right after entering the number: medium trust score (~60), yellow STEP_UP_VERIFICATION card — this is because SIM Swap is a fixed-clean demo scenario, but Number Verification starts as "pending" until OAuth completes.
   - Click "Start OAuth Verification" on the result card to run the real 3-legged Number Verification OAuth flow for this number (it's not fictional like the other demo numbers, so it can complete a real Nokia consent flow). Once verified, the page automatically re-checks and the score rises to 85+, green APPROVE.
   - *Note: SIM Swap and Device Status for this number are a fixed demo scenario handled entirely by the backend — they do not call the real Nokia sandbox, since Nokia's generic simulator numbers were found to return inconsistent SIM Swap results in testing. Only Number Verification uses the real OAuth flow for this number.*

2. **SIM Swapped Recently (BLOCK)**:
   - Input: `+90000000001`
   - Expected: Low trust score (<30), red BLOCK card.
   - *Note: Fixed demo scenario number, does not call the real Nokia sandbox.*

3. **Ambiguous/Pending (STEP-UP VERIFICATION)**:
   - Input: `+90000000003`
   - Expected: Medium trust score (40-69), yellow STEP_UP_VERIFICATION card.
   - *Note: Fixed demo scenario number — SIM Swap and Device Status are always returned as clean, while Number Verification is always shown as "pending" regardless of OAuth state, in order to reliably demonstrate this scenario in a demo.*
   - *You can also click the "Start OAuth Verification" link on any result card to run the real 3-legged Number Verification OAuth flow end-to-end.*

---

## ⚠️ Note on Data & Privacy

This is a hackathon prototype. All testing uses Nokia NaC's **simulator phone numbers** — no real user data is collected, stored, or processed. A production deployment of TrustLine would require full compliance with applicable data protection regulations (e.g. GDPR, KVKK) before processing real phone numbers or telecom signals.

## New Features (v2)

- **Device Status Signal**: A third risk signal added that checks whether the device is connected to the network via CAMARA.
- **Integration Guide**: `backend/INTEGRATION.md` document added, showing how fintech/e-commerce systems can call the API and example pricing.
- **Partner Dashboard**: A reporting interface and API added that lists risk evaluations, showing approval/rejection statistics with masked phone numbers.
