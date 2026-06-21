# DisasterCast
### AI-powered cost of inaction simulator for flood and wildfire prevention policy
**USAII Global AI Hackathon 2026 | Graduate Track | Brief 6A**

## What it does

City officials know what past disasters cost. They do not know what the next one will cost if nothing changes, or what to fix first to change that number.

DisasterCast answers exactly those two questions:

1. **What will the next disaster cost if nothing changes?** Based on real FEMA damage records across multiple events, the tool projects the next-event cost broken into direct damage, displaced families, healthcare burden, and lost wages.

2. **What should the city prioritise to reduce that cost?** An AI layer reasons across FEMA Hazard Mitigation Grant Program outcomes and infrastructure research to generate ranked prevention actions specific to each city, ordered by projected disaster cost reduction per dollar invested.

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

# 4. Terminal 1, start backend
python -m uvicorn backend.main:app --reload --port 8000

# 5. Terminal 2, start frontend
cd frontend
npm run dev
```

Opens at **http://localhost:3000**

---

## Architecture

```
disastercast-diss/
├── backend/
│   ├── main.py               # FastAPI, 22 REST endpoints
│   └── requirements.txt
├── frontend/                 # Next.js 16 + React 19 + Tailwind v4
│   └── src/
│       ├── app/              # 4 routes (/, /dashboard, /interventions, /glossary)
│       ├── components/       # 24 UI + chart components
│       ├── lib/              # API client, report generator, persistence
│       └── types/            # TypeScript definitions
├── utils/                    # Python core engine (~1,500 lines)
│   ├── data_loader.py        # CSV loading with caching
│   ├── pattern_inference.py  # scikit-learn LinearRegression trend detection
│   ├── cost_engine.py        # Cost projection + social cost multipliers
│   ├── rag_layer.py          # RAG retrieval from interventions DB
│   ├── ai_engine.py          # GROQ API enrichment + policy briefs + glossary
│   └── report_generator.py   # ReportLab PDF generation
├── data/                     # 9 curated CSV files (events, zones, population, infrastructure)
├── datasets/                 # Raw FEMA API download files
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

**Terminal 1, Backend:**
```bash
python -m uvicorn backend.main:app --reload --port 8000
```

**Terminal 2, Frontend:**
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
| Historical damage chart | `GET /api/cities/{slug}/events` | Canvas bar chart with trend line, animated timeline (play/pause/step) |
| Time-range filter | `?since=&until=` on events/compounding | Year-range dropdowns |
| Cost breakdown + sources | `GET /api/cities/{slug}/projection` | 6 metric cards with collapsible sources |
| Harvey watershed damage | `GET /api/cities/houston/watersheds` | Canvas horizontal bar chart (10 watersheds) |
| Compounding cost chart | `GET /api/cities/{slug}/compounding` | Canvas bar chart (4 future events) |
| AI recommendations | `POST /api/cities/{slug}/recommendations` | GROQ-enriched intervention cards |
| AI policy brief | `POST /api/cities/{slug}/policy-brief` | GROQ-generated budget-committee brief |
| Save report | `GET /api/cities/{slug}/report` | Text download + PDF download |
| Data freshness | `GET /api/cities/{slug}/data-freshness` | Footer badge with age indicator |
| Disaster glossary | `GET /api/glossary` | Collapsible definition list page |
| Keyboard navigation | Keys 1-5 | Nav bar jump-to-step |
| Accessibility | `prefers-reduced-motion` | CSS disables all animations |
| localStorage persistence | none | Saves city and range settings across sessions |

---

## API Endpoints (22 total)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| GET | `/api/cities` | List supported cities |
| GET | `/api/compare` | Side-by-side city comparison data, no longer called by the frontend, the comparison page was removed |
| GET | `/api/glossary` | Disaster policy jargon definitions |
| GET | `/api/cities/{slug}/summary` | Aggregate damage statistics |
| GET | `/api/cities/{slug}/events` | Historical disaster events |
| GET | `/api/cities/{slug}/zones` | Damage by zone / neighborhood |
| GET | `/api/cities/{slug}/population` | Population growth data |
| GET | `/api/cities/{slug}/affected-zones` | Most affected zone names |
| GET | `/api/cities/{slug}/infrastructure` | Infrastructure project capacity |
| GET | `/api/cities/{slug}/intervention-effectiveness` | Intervention records with real outcomes, no longer called by the frontend, the scorecard duplicated the ranked priority cards and was removed |
| GET | `/api/cities/{slug}/data-freshness` | Dataset last-updated timestamps |
| GET | `/api/cities/{slug}/projection` | Next-event cost projection |
| POST | `/api/cities/{slug}/scenario` | What-if scenario simulation |
| GET | `/api/cities/{slug}/compounding` | Multi-event compounding projection |
| GET | `/api/cities/{slug}/interventions` | Top interventions by ROI |
| GET | `/api/cities/{slug}/pattern-explanation` | Cost pattern explanation, no longer called by the frontend, the dashboard card showing this text was removed as duplicate of the regression explanation shown elsewhere on the page |
| POST | `/api/cities/{slug}/recommendations` | AI prevention recommendations |
| POST | `/api/cities/{slug}/policy-brief` | AI policy brief |
| GET | `/api/cities/{slug}/report` | PDF report download |
| GET | `/api/cities/{slug}/homelessness` | Real HUD PIT count homelessness trend |
| GET | `/api/cities/houston/watersheds` | Watershed-level Harvey damage summary |
| GET | `/api/cities/houston/damage-map` | Property-level Harvey damage points (GeoJSON) |

---

## Data sources

| Dataset | Source | Used for |
|---------|--------|----------|
| FEMA OpenFEMA HousingAssistanceOwners | fema.gov/about/openfema/data-sets | Houston and LA damage by event, 24K+ records |
| FEMA DisasterDeclarationsSummaries | fema.gov/about/openfema/data-sets | Disaster metadata, incident types, dates |
| Harris County HCFCD | hcfcd.org | Houston flood zone infrastructure |
| OECD 2025 | oecd.org | AI and disaster damage cost methodology |
| Urban Institute | urban.org | Disaster to homelessness causal research |
| US Census ACS | census.gov | Population growth in vulnerable zones |
| HUD PIT Count | hud.gov | Annual homelessness count data (2007-2024) |

---

## Methodology

FEMA housing assistance records capture residential damage only. Total economic damage is estimated using scale factors derived from two anchor points where full economic damage is publicly documented:

- Harvey 2017: $2.18B FEMA housing → $125B total = **57.3x scale factor**
- Palisades 2025: $1.97B FEMA housing → $52B total = **26.4x scale factor**

Cost escalation rates derived from FEMA data analysis:
- Houston: **14.5% per year** (2019 to 2024 post-Harvey trend)
- Los Angeles: **29.7% per year** (2018 to 2025 trajectory)

Model used: **scikit-learn LinearRegression**, the same approach used by FEMA, World Bank, and Swiss Re for catastrophe cost modelling. Disaster costs compound, not accumulate linearly, because each event without infrastructure change leaves greater vulnerability for the next.

AI: **GROQ** (llama-3.3-70b-versatile) via OpenAI-compatible API, enriches RAG results with location-specific detail and generates plain-language policy briefs.

All projections powered by real data. Human expert review recommended before policy action.

---

## Responsible AI

**Risk:** Projections based on historic patterns may underestimate costs in rapidly urbanising zones where population density has grown faster than the damage baseline reflects.

**Mitigation:** When population growth in a vulnerable zone exceeds 15% since the last major event, the tool flags a human review recommendation. AI generates the analysis, the budget committee makes the decision.

**Removed feature, intentional:** an earlier build included an infrastructure capacity card showing completion percentages for named Houston flood control projects, for example Brays Bayou at 40 percent complete. We checked that figure against Harris County Flood Control District's own public records and found the project had actually been completed years earlier. The figure was not approximated or corrected, it was removed entirely, along with the card displaying it. The backend endpoint and underlying data file still exist for reference, but nothing in the current frontend renders them. If real, sourced capacity data becomes available, this should be rebuilt from that data, not from estimated figures.

**Additional corrections found during verification:** the AI recommendation engine's background context for both cities was checked against current public sources. A claim that LA building codes were not upgraded after the Woolsey Fire was outdated, Malibu adopted updated codes in January 2026, the context was corrected to reflect that and to note the real bottleneck is rebuild speed instead. A claim attributing the Eaton Fire's cause to overhead power lines as settled fact overstated certainty on a question still under active investigation and litigation, the context was corrected to reflect that the cause is contested, not confirmed. A vegetation management deferral percentage and a defensible space compliance percentage for LA had no traceable source and were replaced with a sourced finding from the Insurance Institute for Business and Home Safety. Separately, a flat school-days-lost cost multiplier, applied identically to both cities with no verifiable source, was removed from the cost model, the frontend, and both downloadable reports, rather than replaced with another unverified figure.

**Known limitation:** none of these corrections are automated. They were found by manually searching for and checking each specific, falsifiable claim against a real source. No mechanism in the application currently detects when a referenced project's status changes after the fact, so this verification would need to be repeated by hand if the AI's background context is ever expanded or reused after this submission.

**Removed feature, different reason:** a side-by-side city comparison page and a separate cross-city what-if simulator both existed at one point but were never linked from anywhere a user would naturally navigate. Unlike the corrections above, nothing in either page was factually wrong, the underlying numbers were genuine. They were removed because they duplicated information already shown elsewhere and did not clearly help a city official decide anything about their own city. The backend endpoints they used still exist, the frontend pages do not.

---

## Testing

```powershell
python -m pytest tests/ -v
```

19 tests covering data loading, cost engine, and pattern inference.

---

## Tools Used

- **OpenCode**, AI-assisted development environment
- **Claude Code**, AI pair programming assistant
- GROQ (llama-3.3-70b-versatile), LLM inference for AI features
- FastAPI + Uvicorn, Python REST backend
- Next.js 16 + React 19 + Tailwind CSS v4, Frontend framework
- scikit-learn, LinearRegression pattern inference
- ReportLab, Server-side PDF report generation
- Leaflet + react-leaflet, Harvey property damage map
- Recharts, Homelessness trend chart
