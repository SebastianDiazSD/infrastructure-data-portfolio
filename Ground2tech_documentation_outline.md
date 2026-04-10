# Ground2Tech Engineering — Master Documentation Outline
**Version 1.0 — April 10, 2026**
**Author: Sebastian Arce Diaz**
**Status: Confirmed outline — full documents to be written in Window 3 (Apr 23–26, 2026)**

---

## Document 1 — App 1: G2T Inspector
### AI-Powered Railway Sleeper Defect Detection

1. Executive Summary
2. Problem Statement and Motivation
3. Regulatory and Standards Context — DB Schadenklassen, Ril. 821.2018, DBS 918 143
4. Competitive Landscape — V-Cube, ENSCO TCIS, Schwelle 3.0 (DLR/DB), Quantup, WEKA Bausoftware
5. Proprietary Data Moat — why 566 ground-level site photos have no public equivalent
6. System Architecture Overview — two-layer design rationale (YOLO + Claude Vision)
7. Dataset Pipeline
   - Collection methodology (ground-level smartphone, opportunistic, shift-based)
   - Privacy — GPS EXIF stripping procedure and GDPR Art. 5(1)(c) rationale
   - Label Studio annotation workflow (local file storage mode, class definitions)
   - Class definitions — spalling_body, spalling_rail_seat, corner_breakout
   - Class imbalance analysis — 8.5:1 ratio, oversampling strategy (2× corner_breakout, 3× spalling_rail_seat)
   - Stratified train/val split — why random split fails for minority classes
   - Augmentation theory and parameters — Albumentations pipeline for domain gap
8. YOLOv8 Architecture Theory — backbone, neck, head, anchor-free detection
9. Training Infrastructure — Google Colab T4, local CPU fallback, epoch management
10. Training Run History
    - Run 1/2 — failure root cause analysis (nc:3 class index mismatch bug, classes.txt vs dataset.yaml)
    - Run 3 — full configuration, hyperparameters, results
    - Metric interpretation — mAP50=0.702, per-class breakdown
    - Graph analysis — F1-Confidence curve, PR curve, confusion matrix, training/val batch visualisation
11. ONNX Export
    - opset12 selection rationale
    - float32 vs float16 decision (onnxruntime 1.4.1 incompatibility)
    - Output tensor shape [1,9,8400] and transposition logic
12. Flutter Mobile Application
    - Framework choice rationale vs React Native vs PWA
    - Letterbox preprocessing theory
    - NMS implementation in Dart
    - Confidence threshold slider UX decision
    - API key security — dart-define / String.fromEnvironment, gitignore pattern
    - Folder structure
13. Severity Assessment Layer
    - Two-layer design justification — why not single model
    - Claude haiku-4-5 Vision API integration
    - DB standards mapping in prompt (SK1–SK4, F1–F4)
    - Privacy — crop-only transmission to external API
    - SK2 dominance observation — prompt tuning needed for SK1 and SK4 edge cases
14. Field Validation Results
    - Test methodology — 8 site photos, GS5850, March 2026
    - Results table — 5 TP, 3 TN, 0 FP at conf=0.41
    - False negative failure mode taxonomy: resolution-limited (~15×15px), Vossloh fastener occlusion, perspective/lighting mismatch
15. Domain Gap Analysis
    - Root cause — model trained on clean new concrete, fails on weathered/night/dusty
    - Real weathered photos as highest priority data source
    - SD LoRA risk assessment — SD-style spalling vs real damage geometry
16. V2 Hybrid Pipeline Architecture
    - Parallel YOLO + Vision execution rationale
    - Result status taxonomy — bothAgreePositive, bothAgreeNegative, conflict, visionOnlyDetection, yoloOnlyDetection
    - Feedback loop design — clean image + JSON sidecar
    - Google Drive upload pipeline
    - Active learning loop → Label Studio → Run 4
17. Run 4 Data Collection Strategy
    - Targets: 50+ night/lamp, 40+ weathered, 20+ oblique, 20+ Vossloh occluded
    - Heavy augmentation parameters (Albumentations pipeline)
    - RDD2022 as optional booster — class overlap check methodology
    - SDNET2018 for concrete crack pre-training
    - SD LoRA as last resort — conditions, mix ratio (max 20-30%)
18. Phase Roadmap
    - Phase 1: Railway sleepers (complete)
    - Phase 1.5: In-service sleepers, surface_crack activation
    - Phase 2: Bridge inspection — CODEBRIM, DIN 1076
    - Phase 3: Road surface damage — RDD2022 as primary dataset
    - Phase 4: General civil infrastructure inspection assistant
19. LLM Independence Strategy — fine-tuning 7–13B open-source model on anonymised domain data, 2027–2029 timeline
20. Challenges, Errors and Solutions Log — full chronological log
21. Folder Structure and Repository Organisation
22. Security and IP Protection — prompts.py gitignored, weights excluded, EXIF stripping

---

## Document 2 — App 4: G2T Site Reporter
### AI-Powered Bautagesbericht Generator

1. Executive Summary
2. Problem Statement
   - Manual report generation time (20-40 min per day)
   - VOB/B compliance requirements
   - Field conditions — phone-first, voice-first, no laptop on site
   - eBTB competitive analysis — what it does well and where it fails
   - App 4 differentiation — single AI-parsed input vs 15+ structured form entries
3. Target User Profile — Bauüberwacher, Polier, Bauleiter
4. Technology Stack Decisions and Rationale
   - FastAPI vs Django vs Flask
   - React + Vite + Ant Design vs alternatives
   - Motor async driver for MongoDB
   - python-docx for document generation
   - Whisper for transcription
   - Claude haiku-4-5 for report generation
   - PWA vs Flutter for mobile (App 4 stays PWA, Flutter stays App 1)
5. Repository and Folder Structure
6. Backend Architecture (FastAPI)
   - Routing structure and prefix decisions (/api, /auth)
   - Pydantic models and validation
   - Empty string validator design decision
   - Optional field handling — no "Keine Angaben" placeholders
   - Lifespan context manager vs deprecated on_event
7. AI Report Generation (Claude haiku-4-5)
   - Prompt engineering — anti-floskel instruction, structured output
   - Structured field approach vs packed strings
   - IP protection — prompts.py gitignored, prompts_template.py as placeholder
8. Input Parsing Pipeline (/api/parse-input)
   - LLM-based field extraction from free text
   - missing_required and missing_optional response structure
   - Date keyword interception — heute/today/hoy frontend logic
9. Voice Input Pipeline (OpenAI Whisper)
   - MediaRecorder API in browser
   - audio/webm → transcription → text injection
10. Document Generation (python-docx)
    - Bautagesbericht structure and field mapping
    - Conditional sections — only included when user filled them
    - Filename convention
11. Frontend Architecture (React + Vite + Ant Design)
    - Mode A — guided 6-step wizard with gate modal
    - Mode B — AI quick input with recovery form
    - Date keyword detection modal (heute/today/hoy → confirmation before prefill)
    - Recovery form for missing required fields
    - Gate modal — extra steps selection (Abnahme, Mängel, Störungen, Besonderheiten, Nächste Schritte)
    - BG-Meldung auto-detection from injury keywords
    - Responsive layout evolution — Vite default body centering bug and fix
    - IBM Plex Mono/Sans design system
12. Multilingual Support (DE/EN/ES)
    - LANG object structure
    - AUTH_LANG, HIST_LANG objects
    - Language selector in nav bar synced to all components
13. V2 Features
    - MongoDB Atlas integration — Motor async driver, lazy connection rationale
    - MongoDB URI special character encoding issue and resolution
    - User authentication — JWT (HS256) + bcrypt (rounds=12)
    - JWT token lifecycle — localStorage persistence
    - Report storage on generation — non-blocking try/except pattern
    - Anonymous reports — user_id=null, excluded from GET /api/reports
    - 7-day edit lock — legal rationale (Bautagesbericht as legal document), implementation
    - Report history view — 35-day calendar heatmap, list view with lock UI
    - PUT endpoint with lock enforcement
    - Trilingual auth UI — login/register modal
14. PWA Implementation
    - manifest.json — name, icons, theme_color, display standalone
    - Service worker — cache-first for /assets/, never cache /api/
    - Install-to-home-screen flow
    - apple-mobile-web-app-capable meta tags
15. Deployment (Render.com Frankfurt EU)
    - render.yaml configuration
    - Environment variable management — MONGODB_URI, JWT_SECRET, ANTHROPIC_API_KEY
    - Cold start behaviour on free tier
    - Python version pinning
    - MongoDB ping on startup removal — DNS timeout root cause and fix
    - HEAD handler for Render health check
    - dist/ removed from git tracking
16. DNS and Domain Setup (IONOS CNAME → report.ground2tech.com)
17. Security
    - API key server-side only
    - JWT token lifecycle
    - MongoDB URI encoding — special characters in passwords
    - Password hashing (bcrypt)
    - MongoDB Atlas network access — 0.0.0.0/0 on free tier, IP whitelist on paid
    - Vendor dependency mitigation — weekly export strategy
    - GitHub repo visibility strategy — public for portfolio, private before commercial use
18. Challenges, Errors and Solutions Log — full chronological log including MongoDB URI, DNS timeout, Render deploy failures, dotenv parse warning, Depends import error, dist cache issues, body centering Vite bug
19. Future Roadmap
    - Photo attachment to activities (Window 3)
    - Edit modal wired up (Window 3)
    - Registered user profile prefill (Window 3)
    - Mängel step VOB/B integration
    - MongoDB backup automation

---

## Document 3 — Ground2Tech Engineering: Foundation Document
### AI Consultancy for Civil Engineering and Construction Management

1. Founder Profile — Sebastian Arce Diaz, Bauüberwacher NBS Generalsanierung, MSc Computer Science York
2. Business Model — solo consultancy, app-first portfolio strategy, Upwork/Fiverr freelance, path to independence
3. Legal Structure — Freiberufler registration (Germany), ELSTER submission status
4. Brand and Online Presence — ground2tech.com (IONOS), Upwork (€65/hr), Fiverr (DiazG2Tech)
5. Product Portfolio Overview — App 1, App 2 (planned), App 3 (planned), App 4
6. Market Positioning
   - Target market: German railway and civil construction sector
   - Competitive landscape per app
   - Differentiation: domain expertise + proprietary data + regulatory grounding
7. Technology Philosophy
   - Backend-first development approach
   - Prompts as IP
   - Structured fields over packed strings
   - LLM independence strategy — passive data collection now, fine-tuning 2027-2029
8. Development Methodology
   - Master Plan structure — Windows and Blocks
   - Parallel workstreams: Ground2Tech + MSc
   - Context file system for session restoration
   - Documentation as parallel output
9. Infrastructure and Tools
   - Development stack — PyCharm Community, Python 3.12, FastAPI, React, Flutter
   - ML/AI stack — YOLOv8, ONNX, Google Colab T4, Label Studio
   - APIs — Claude API, Whisper, Claude Vision
   - Infrastructure — Render.com Frankfurt, IONOS, MongoDB Atlas Frankfurt
   - Version control — GitHub (SebastianDiazSD/infrastructure-data-portfolio)
10. Data Strategy and Privacy
    - GDPR compliance approach
    - GPS EXIF stripping policy
    - Anonymisation before external upload
    - Proprietary dataset value proposition
11. IP Protection Strategy
    - prompts.py gitignore pattern across all apps
    - Model weights exclusion
    - Repo visibility lifecycle
    - License notice
12. MSc Integration — COM00142M Advanced Programming, York University, target Sept 2027

---

## Session Notes — April 9–10, 2026
*Captured for documentation reference*

### App 4 V2 — completed this session:
- MongoDB Atlas lazy connection fix (removed startup ping causing Render DNS timeout)
- User registration and login (JWT HS256 + bcrypt rounds=12)
- Report storage on generation (non-blocking, user_id linked)
- GET /api/reports with Bearer auth, filtered by user
- PUT /api/reports/{id} with 7-day edit lock enforcement
- Report history frontend — 35-day calendar heatmap, list view, lock UI
- Trilingual auth UI (DE/EN/ES) — AUTH_LANG, HIST_LANG objects
- PWA manifest + service worker
- Responsive layout fix — removed Vite default body display:flex / place-items:center
- Date keyword detection modal (heute/today/hoy → resolved date confirmation)
- Deployed and verified live on Render (Frankfurt EU)
- MongoDB Atlas confirmed connected (lazy, Frankfurt eu-central-1)

### eBTB Competitive Analysis — captured:
- eBTB (infraView / DB E&C) uses SharePoint-based architecture
- Requires 27-page PDF user guide — zero discoverability
- No relational link between Personal, Geräte, Leistung entries
- Cannot connect specific workers to specific activities
- Desktop-only, form-heavy, 15+ entries per day
- Monthly calendar view and lock icon are worth referencing in App 4 docs
- App 4 differentiator: single dictated paragraph → full structured report in under 60 seconds

### App 1 — domain gap and Run 4 strategy confirmed:
- Real weathered photos remain highest priority
- Albumentations augmentation parameters locked
- RDD2022 as optional booster with class overlap check first
- SDNET2018 for concrete crack pre-training
- Phase roadmap extended: sleepers → bridges → road damage → general civil infrastructure

### Security decisions logged:
- MongoDB 0.0.0.0/0 acceptable on free tier (still password protected + TLS)
- IP whitelist only possible on Render paid plan (static outbound IPs)
- dist/ removed from git tracking
- Repo to be made private before first paying client
- Weekly Atlas export recommended for vendor independence

---
*End of document — Ground2Tech Engineering Master Documentation Outline v1.0*
