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

1. **Clean Number (APPROVE)**:
   - Input: `+99999991000`
   - Expected: High trust score (85+), green APPROVE card.
   
2. **SIM Swapped Recently (BLOCK)**:
   - Input: `+99999990404`
   - Expected: Low trust score (<40), red BLOCK card.

3. **Ambiguous/Pending (STEP-UP VERIFICATION)**:
   - Input: `+99999990500` or any number without completed OAuth.
   - Expected: Medium trust score (40-69), yellow STEP_UP_VERIFICATION card.
   - *You can click the "OAuth Doğrulamayı Başlat" link in the UI to simulate the 3-legged Number Verification flow.*

---

## ⚠️ Note on Data & Privacy

This is a hackathon prototype. All testing uses Nokia NaC's **simulator phone numbers** — no real user data is collected, stored, or processed. A production deployment of TrustLine would require full compliance with applicable data protection regulations (e.g. GDPR, KVKK) before processing real phone numbers or telecom signals.

## Yeni Özellikler (v2)

- **Device Status Sinyali**: CAMARA üzerinden cihazın ağa bağlı olup olmadığını kontrol eden üçüncü bir risk sinyali eklendi.
- **Entegrasyon Rehberi**: Fintech/E-ticaret sistemlerinin API'yi nasıl çağıracağını ve örnek fiyatlandırmayı gösteren `backend/INTEGRATION.md` belgesi eklendi.
- **Partner Dashboard**: Yapılan risk değerlendirmelerini listeleyen, onay/ret istatistiklerini maskeli numaralarla gösteren bir raporlama arayüzü ve API eklendi.
