# DisasterCast
### AI-powered cost of inaction simulator for flood and wildfire prevention policy
**USAII Global AI Hackathon 2026 | Graduate Track | Brief 6A**

## What it does

City officials know what past disasters cost. They do not know what the next one will cost if nothing changes — or what to fix first to change that number.

DisasterCast answers exactly those two questions:

1. **What will the next disaster cost if nothing changes?** Based on real FEMA damage records across multiple events, the tool projects the next-event cost broken into direct damage, displaced families, healthcare burden, school days lost, and lost wages.

2. **What should the city prioritise to reduce that cost?** An AI layer reasons across FEMA Hazard Mitigation Grant Program outcomes and infrastructure research to generate ranked prevention actions specific to each city — ordered by projected disaster cost reduction per dollar invested.

Covers Houston (floods) and Los Angeles (wildfires) with real FEMA OpenFEMA data.

---

## Quick Start (Windows PowerShell)

```powershell
# 1. Install Python dependencies
pip install -r requirements.txt

# 2. Install frontend dependencies
cd frontend
npm install
cd ..

# 3. Add GROQ API key to .env
# Create a .env file in project root with:
# GROQ_API_KEY=gsk_...

# 4. Terminal 1 — Start backend
python -m uvicorn backend.main:app --reload --port 8000

# 5. Terminal 2 — Start frontend
cd frontend
npm run dev
```

Opens at **http://localhost:3000**

---

## Architecture

```
disastercast-diss/
├── backend/
│   ├── main.py               # FastAPI — 18 REST endpoints
│   └── requirements.txt
├── frontend/                 # Next.js 16 + React 19 + Tailwind v4
│   └── src/
│       ├── app/              # 5 routes (/, /dashboard, /interventions, /compare, 404)
│       ├── components/       # 17 UI + chart components
│       ├── lib/              # API client, report generator, persistence, utils
│       └── types/            # TypeScript definitions
├── utils/                    # Python core engine (~1,500 lines)
│   ├── data_loader.py        # CSV loading with caching
│   ├── pattern_inference.py  # scikit-learn LinearRegression trend detection
│   ├── cost_engine.py        # Cost projection + social cost multipliers
│   ├── rag_layer.py          # RAG retrieval from interventions DB
│   ├── ai_engine.py          # GROQ API enrichment + policy briefs
│   └── report_generator.py   # ReportLab PDF generation
├── data/                     # 9 curated CSV files (events, zones, population, infrastructure)
├── datasets/                 # 35 raw FEMA API download files
├── tests/                    # 19 pytest unit tests
├── requirements.txt          # Python dependencies
└── pyproject.toml            # Project metadata
```

---

## Setup

### 1. Clone and install
```bash
git clone https://github.com/Ruchess07/usaii-hackathon-disastercast-diss.git
cd usaii-hackathon-disastercast-diss
pip install -r requirements.txt
```

### 2. Get a free GROQ API key
Go to: https://console.groq.com/keys
Sign up (free tier, no credit card required), create an API key starting with `gsk_`.

### 3. Create a .env file
Create `.env` in the project root:
```
GROQ_API_KEY=gsk_your_key_here
```

### 4. Install frontend dependencies
```bash
cd frontend
npm install
cd ..
```

### 5. Run the app (two terminals)

**Terminal 1 — Backend:**
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```

Opens at **http://localhost:3000**

---

## Features

| Feature | Backend | Frontend |
|---------|---------|----------|
| City selection (Houston / LA) | `GET /api/cities` | Landing page with city cards |
| Cost summary | `GET /api/cities/{slug}/summary` | 4-metric summary bar |
| Historical damage chart | `GET /api/cities/{slug}/events` | Canvas bar chart with trend line |
| Time-range filter | `?since=&until=` on events/compounding | Year-range dropdowns |
| Cost breakdown + sources | `GET /api/cities/{slug}/projection` | 6 metric cards with collapsible sources |
| Zone heatmap | `GET /api/cities/{slug}/zones` | SVG grid colored by damage intensity |
| Infrastructure gaps | `GET /api/cities/{slug}/infrastructure` | Warning cards for <50% capacity projects |
| What-if scenario sliders | `POST /api/cities/{slug}/scenario` | Real-time infra/population sliders |
| Compounding cost chart | `GET /api/cities/{slug}/compounding` | Canvas bar chart (4 future events) |
| Pattern explanation | `GET /api/cities/{slug}/pattern-explanation` | GROQ-enriched plain-language summary |
| AI recommendations | `POST /api/cities/{slug}/recommendations` | GROQ-enriched intervention cards |
| AI policy brief | `POST /api/cities/{slug}/policy-brief` | GROQ-generated budget-committee brief |
| Save report | `GET /api/cities/{slug}/report` | Text download + PDF download |
| City comparison | `GET /api/compare` | Side-by-side table + dual-bar charts |
| Data freshness | `GET /api/cities/{slug}/data-freshness` | Footer badge with age indicator |
| Keyboard navigation | Keys 1-4 | Nav bar jump-to-step |
| Accessibility | `prefers-reduced-motion` | CSS disables all animations |

---

## API Endpoints (18 total)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| GET | `/api/cities` | List supported cities |
| GET | `/api/compare` | Side-by-side city comparison |
| GET | `/api/cities/{slug}/summary` | Aggregate damage statistics |
| GET | `/api/cities/{slug}/events` | Historical disaster events |
| GET | `/api/cities/{slug}/zones` | Damage by zone / neighborhood |
| GET | `/api/cities/{slug}/population` | Population growth data |
| GET | `/api/cities/{slug}/affected-zones` | Most affected zone names |
| GET | `/api/cities/{slug}/infrastructure` | Infrastructure project capacity |
| GET | `/api/cities/{slug}/data-freshness` | Dataset last-updated timestamps |
| GET | `/api/cities/{slug}/projection` | Next-event cost projection |
| POST | `/api/cities/{slug}/scenario` | What-if scenario simulation |
| GET | `/api/cities/{slug}/compounding` | Multi-event compounding projection |
| GET | `/api/cities/{slug}/interventions` | Top interventions by ROI |
| GET | `/api/cities/{slug}/pattern-explanation` | Cost pattern explanation |
| POST | `/api/cities/{slug}/recommendations` | AI prevention recommendations |
| POST | `/api/cities/{slug}/policy-brief` | AI policy brief |
| GET | `/api/cities/{slug}/report` | PDF report download |

---

## Data sources

| Dataset | Source | Used for |
|---------|--------|----------|
| FEMA OpenFEMA HousingAssistanceOwners | fema.gov/about/openfema/data-sets | Houston and LA damage by event — 24K+ records |
| FEMA DisasterDeclarationsSummaries | fema.gov/about/openfema/data-sets | Disaster metadata, incident types, dates |
| Harris County HCFCD | hcfcd.org | Houston flood zone infrastructure |
| OECD 2025 | oecd.org | AI and disaster damage cost methodology |
| Urban Institute | urban.org | Disaster to homelessness causal research |
| US Census ACS | census.gov | Population growth in vulnerable zones |

---

## Methodology

FEMA housing assistance records capture residential damage only. Total economic damage is estimated using scale factors derived from two anchor points where full economic damage is publicly documented:

- Harvey 2017: $2.18B FEMA housing → $125B total = **57.3x scale factor**
- Palisades 2025: $1.97B FEMA housing → $52B total = **26.4x scale factor**

Cost escalation rates derived from FEMA data analysis:
- Houston: **14.5% per year** (2019 to 2024 post-Harvey trend)
- Los Angeles: **29.7% per year** (2018 to 2025 trajectory)

Model used: **scikit-learn LinearRegression** — the same approach used by FEMA, World Bank, and Swiss Re for catastrophe cost modelling. Disaster costs compound, not accumulate linearly, because each event without infrastructure change leaves greater vulnerability for the next.

AI: **GROQ** (llama-3.3-70b-versatile) via OpenAI-compatible API — enriches RAG results with location-specific detail and generates plain-language policy briefs.

All projections powered by real data. Human expert review recommended before policy action.

---

## Responsible AI

**Risk:** Projections based on historic patterns may underestimate costs in rapidly urbanising zones where population density has grown faster than the damage baseline reflects.

**Mitigation:** Confidence intervals are displayed on every projection, not buried in footnotes. When population growth in a vulnerable zone exceeds 15% since the last major event, the tool widens the confidence interval and flags a human review recommendation. AI generates the analysis — the budget committee makes the decision.

---

## Testing

```powershell
python -m pytest tests/ -v
```

19 tests covering data loading, cost engine, and pattern inference.

---

## Licence

Built for USAII Global AI Hackathon 2026. Data sourced from US federal open data portals under public domain licence.
