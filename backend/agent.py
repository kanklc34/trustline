import os
import json
import asyncio
from typing import Dict, Any, TypedDict
from langgraph.graph import StateGraph, END
from google import genai

from risk_policy import RISK_POLICY_PROMPT
from camara import check_sim_swap, check_device_status
from oauth import verification_results

# 1. State Tanımlaması (State Machine'in her düğümde güncellediği veri yapısı)
class TrustAgentState(TypedDict):
    phone_number: str
    action_type: str
    
    # Sinyaller
    sim_swap_result: dict
    number_verification_result: dict
    device_status_result: dict
    
    # Gemini Değerlendirmesi
    trust_score: int
    reasoning: str
    confidence: str
    
    # Nihai Karar ve Açıklama
    decision: str
    explanation: str

# 2. Düğümler (Nodes)
async def collect_signals(state: TrustAgentState) -> dict:
    """SIM Swap, Number Verification ve Device Status sinyallerini toplar."""
    phone_number = state["phone_number"]
    
    # Sinyalleri topluyoruz
    sim_swap_data = await check_sim_swap(phone_number)
    device_status_data = await check_device_status(phone_number)
    
    # Number Verification OAuth ile asenkron tamamlandığı için bellekteki son durumuna bakıyoruz
    nv_data = verification_results.get(phone_number, {"status": "pending", "verified": None})
    
    return {
        "sim_swap_result": sim_swap_data,
        "number_verification_result": nv_data,
        "device_status_result": device_status_data
    }

def evaluate_risk(state: TrustAgentState) -> dict:
    """Sinyalleri Gemini 2.5 Flash'a vererek trust_score hesaplatır."""
    api_key = os.getenv("GEMINI_API_KEY")
    
    # Eğer API key girilmemişse, MOCK değerlendirme dönerek akışın kopmamasını sağlıyoruz
    if not api_key or api_key == "your_gemini_api_key_here":
        print("[MOCK] Gemini API Key bulunamadı, sahte (mock) değerlendirme yapılıyor.")
        
        sim_swapped = state["sim_swap_result"].get("swapped", False)
        nv_verified = state["number_verification_result"].get("verified")
        
        if nv_verified == True and not sim_swapped:
            score = 90
        elif sim_swapped:
            score = 25
        else:
            score = 60 # pending veya ambiguous
            
        return {
            "trust_score": score,
            "reasoning": "Gemini API Key olmadığı için simüle edilmiş MOCK gerekçe.",
            "confidence": "medium"
        }
    
    # Gerçek Gemini entegrasyonu (yeni google-genai SDK)
    client = genai.Client(api_key=api_key)
    
    prompt = f"""
    {RISK_POLICY_PROMPT}
    
    MEVCUT DURUM:
    - Action Type: {state["action_type"]}
    - SIM Swap Result: {json.dumps(state["sim_swap_result"])}
    - Number Verification Result: {json.dumps(state["number_verification_result"])}
    - Device Status Result: {json.dumps(state["device_status_result"])}
    """
    
    try:
        response = client.models.generate_content(
            model="gemini-3.5-flash-lite",
            contents=prompt,
        )
        # JSON ayrıştırma (bazı LLM'ler markdown bloğu içinde dönebilir, temizliyoruz)
        response_text = response.text.replace("```json", "").replace("```", "").strip()
        data = json.loads(response_text)
        
        return {
            "trust_score": int(data.get("trust_score", 50)),
            "reasoning": data.get("reasoning", "Açıklama üretilemedi."),
            "confidence": data.get("confidence", "low")
        }
    except Exception as e:
        print(f"[HATA] Gemini Evaluation Error: {e}")
        # API hatası durumunda fail-safe yaklaşım (güvenliği riske atmamak için düşük skor)
        return {
            "trust_score": 30,
            "reasoning": "Yapay zeka değerlendirmesi sırasında bir hata oluştu. Varsayılan düşük skor atandı.",
            "confidence": "low"
        }

def decide(state: TrustAgentState) -> dict:
    """trust_score değerine göre kesin kural tabanlı kararı üretir. (Sınırlar LLM'e bırakılmaz)"""
    score = state.get("trust_score", 0)
    
    if score >= 70:
        decision = "APPROVE"
    elif 40 <= score < 70:
        decision = "STEP_UP_VERIFICATION"
    else:
        decision = "BLOCK"
        
    return {"decision": decision}

def explain(state: TrustAgentState) -> dict:
    """Nihai durumu loglanabilir ve UI'a dönülebilir bir metne paketler."""
    decision = state.get("decision")
    reasoning = state.get("reasoning")
    score = state.get("trust_score")
    
    explanation = f"KARAR: {decision} (Skor: {score}/100) | NEDEN: {reasoning}"
    return {"explanation": explanation}


# 3. LangGraph Workflow (State Machine) Kurulumu
workflow = StateGraph(TrustAgentState)

# Düğümleri ekliyoruz
workflow.add_node("collect_signals", collect_signals)
workflow.add_node("evaluate_risk", evaluate_risk)
workflow.add_node("decide", decide)
workflow.add_node("explain", explain)

# Bağlantıları (edges) kuruyoruz
workflow.set_entry_point("collect_signals")
workflow.add_edge("collect_signals", "evaluate_risk")
workflow.add_edge("evaluate_risk", "decide")
workflow.add_edge("decide", "explain")
workflow.add_edge("explain", END)

# Ajanı derliyoruz
trust_agent = workflow.compile()

async def run_trust_agent(phone_number: str, action_type: str = "login") -> dict:
    """Dışarıdan çağrılacak yardımcı fonksiyon"""
    initial_state = {
        "phone_number": phone_number,
        "action_type": action_type
    }
    
    # LangGraph state machine'i asenkron çalıştır
    final_state = await trust_agent.ainvoke(initial_state)
    return final_state
