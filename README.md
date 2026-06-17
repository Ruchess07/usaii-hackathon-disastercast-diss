# DisasterCast
### AI-powered cost of inaction simulator for flood and wildfire prevention policy
**USAII Global AI Hackathon 2026 | Graduate Track | Brief 6A + 6B**

---

## What it does
DisasterCast answers two questions city officials have never had answered before:
1. What will the next disaster cost if nothing changes?
2. What should we fix first to reduce that cost?

Covers Houston (floods) and Los Angeles (wildfires) with real historic FEMA and CalFire data.

---

## Setup — do this first

### 1. Clone and install
```bash
git clone <your-repo>
cd disastercast
pip install -r requirements.txt
```

### 2. Set your Claude API key
```bash
export ANTHROPIC_API_KEY=your_key_here
```
Or create a `.env` file:
```
ANTHROPIC_API_KEY=your_key_here
```

### 3. Run the app
```bash
streamlit run app.py
```

Opens at http://localhost:8501

---

## Deploy to Streamlit Cloud (for judges)
1. Push to GitHub
2. Go to share.streamlit.io
3. Connect your repo, set `app.py` as the main file
4. Add `ANTHROPIC_API_KEY` in the secrets manager
5. Deploy — get a shareable link in 2 minutes

---

## Project structure
```
disastercast/
├── app.py                  # Main Streamlit app (3 screens)
├── requirements.txt
├── utils/
│   ├── data_loader.py      # Historic disaster data (Houston + LA)
│   ├── cost_engine.py      # Cost projection and compounding logic
│   └── ai_engine.py        # Claude API — recommendations + policy brief
└── README.md
```

---

## Data sources
| Dataset | Source | Used for |
|---------|--------|----------|
| FEMA OpenFEMA | fema.gov/about/openfema/data-sets | Houston flood damage by event |
| Harvey FEMA+HCAD merged | github.com/JustinGOSSES | Pre-cleaned Harvey property damage |
| Harris County HCFCD | hcfcd.org | Flood zone infrastructure data |
| CalFire incident data | data.cnra.ca.gov | LA wildfire history |
| FEMA DR-4856 | fema.gov/disaster/4856 | 2025 LA fires damage data |
| LA County CEO Dashboard | ceo.lacounty.gov | 2025 displacement and social cost |
| Rice Kinder Institute | kinder.rice.edu | Multi-event Houston analysis |

---

## Team roles this week
| Person | Focus |
|--------|-------|
| Person 1 | cost_engine.py + ai_engine.py refinement, API integration |
| Person 2 | app.py UI polish, Plotly charts, Streamlit layout |
| Person 3 | Replace embedded data with real FEMA/CalFire CSV files |
| Person 4 | Devpost writeup, demo video script, policy brief template |

---

## Devpost submission checklist
- [ ] Project description
- [ ] 2-5 min demo video (Houston first, then LA, 3-act structure)
- [ ] AI architecture explanation
- [ ] Responsible AI guardrail
- [ ] Human-in-the-loop design
- [ ] Decision impact statement
- [ ] Tool and data disclosure

---

## Responsible AI
**Risk:** Cost projections based on historic patterns may underestimate costs
in rapidly urbanising zones where density has outpaced data collection.

**Mitigation:** All projections shown with confidence ranges. Human expert
review required before policy action. AI generates the brief — the budget
committee makes the decision.
