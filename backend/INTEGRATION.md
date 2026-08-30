# TrustLine Integration Guide

## How to Integrate

As a fintech or e-commerce platform, you can call the TrustLine API to measure fraud risk in user transactions as shown below. All you need to do is send the phone number and the action type (login, checkout, password_reset).

```bash
curl -X POST "http://localhost:8000/api/evaluate" \
     -H "Content-Type: application/json" \
     -d '{
           "phone_number": "+99999991000",
           "action_type": "checkout"
         }'
```

You can direct your user flow based on the `trust_score` (0-100) in the returned response, or directly on the rule-based `decision` (APPROVE, STEP_UP_VERIFICATION, BLOCK) value.

## Pricing Model (Proposal)

*Note: The pricing model below is a conceptual proposal prepared for the hackathon concept.*

| Plan | Scope | Pricing |
| --- | --- | --- |
| **Free** | 100 API calls per month (Development & Testing) | Free |
| **Growth** | Unlimited API calls, standard support | $0.05 per transaction |
| **Enterprise** | Custom SLA, dedicated support, custom risk rules | Contact us |
