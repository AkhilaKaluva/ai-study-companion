# 🎓 AI Study Companion: AI-Powered Learning & Growth Workspace

> A persistent, contextual, and measurable AI learning companion that connects study materials, grounded tutoring with page-level citations, adaptive assessments, concept mastery tracking, and growth recommendations into a continuous learning loop.

Built for the **AI Prof Second-Round Engineering Challenge**.

---

## 🌟 Key Product Capabilities

- **Strictly Grounded AI Tutor**: Answers are strictly backed by retrieved project materials with verified citations (`[Document Name, Page X]`).
- **Unsupported Question Refusal**: If materials do not contain sufficient evidence, the assistant explicitly states insufficient evidence instead of hallucinating.
- **Page-Preserving Ingestion**: Ingests PDFs page-by-page, generates 768-dim embeddings (`text-embedding-004`), and extracts 4–6 core concepts automatically.
- **Adaptive Diagnostic Quizzes**: Generates targeted 3-question assessments (2 MCQs + 1 Open-Ended) tailored to weak concepts (< 70% mastery).
- **AI Open-Ended Grading**: Evaluates student written responses against an educational rubric, providing qualitative feedback and identifying missing concepts.
- **Dynamic Concept Mastery**: Concept scores update dynamically after assessments, categorizing skills into `Needs Attention`, `Developing`, and `Mastered`.
- **Actionable Next Steps**: Generates tailored 1-sentence learning recommendations to guide the student's next session.
- **Admin & AI Observability**: Request-level telemetry tracking latency, prompt/completion tokens, and cost estimation, plus a **1-Click AI Benchmark Suite**.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24 LTS)
- **npm**

### 2. Installation
```bash
# Clone or navigate to the repository
cd ai-study-companion

# Install dependencies
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Google Gemini API Key from [Google AI Studio](https://aistudio.google.com):
```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your-gemini-api-key-here"
```
*(Note: If no API key is provided, the application automatically runs in demo fallback mode with deterministic mock data, so all flows remain interactive and testable offline!)*

### 4. Seed Demo Data
```bash
npm run db:seed
```
This populates the database with:
- Demo Student: `alex@demo.edu`
- Demo Admin: `admin@demo.edu`
- Learning Space: `Distributed Systems`
- Learning Project: `Raft Consensus Protocol` with 4 tracked concepts and sample telemetry.

### 5. Start the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing & Verification

Run the comprehensive end-to-end verification script:
```bash
npx tsx test/verify-mvp.ts
```
This tests:
1. Database schema and seeded entities
2. Page-preserving PDF chunking
3. Grounded Tutor citations and out-of-scope question refusal
4. Adaptive quiz generation
5. Open-ended AI grading & mastery calculations
6. AI telemetry logging

---

## 🎬 3-Minute Demo Walkthrough Script

Follow these steps for the evaluation video or live test:

1. **Dashboard Overview**:
   - Open [http://localhost:3000](http://localhost:3000).
   - Notice the "Recommended Next Action" banner and the "Concept Mastery Map" showing areas needing attention.
2. **Explore Spaces & Projects**:
   - Click **Spaces** in the navbar $\rightarrow$ open **Distributed Systems** $\rightarrow$ open **Raft Consensus Protocol**.
3. **Upload Material (PDF Ingestion)**:
   - In the right sidebar, click **Choose a PDF file** (you can use any standard PDF).
   - Observe the real-time processing pipeline (`Queued` $\rightarrow$ `Reading Content` $\rightarrow$ `Extracting Concepts` $\rightarrow$ `Knowledge Ready`).
4. **Grounded AI Tutor**:
   - Click **Ask Grounded Tutor**.
   - Click the prompt chip: *"How does the leader election process work?"*
   - Verify the answer contains verified citation badges (`[Document, Page X]`). Click the badge to expand the exact source excerpt!
   - Click the chip: *"Test Refusal (Out of scope)"*.
   - Verify the assistant refuses: *"Based on the uploaded materials in this project, there is insufficient evidence to answer this question."*
5. **Adaptive Quiz & AI Grading**:
   - Click **Take Quiz** $\rightarrow$ Click **Generate Adaptive Quiz**.
   - Answer the 2 MCQs and type a 1-sentence answer for the open-ended question.
   - Click **Submit for AI Grading**.
   - Review the scorecard, qualitative feedback, updated concept mastery percentages, and new recommendation.
6. **Admin & AI Observability**:
   - Click **Admin & Ops** in the top navbar (or switch persona to Admin).
   - Inspect the **AI Observability Telemetry** table showing latency, token counts, and cost.
   - Click **Run 1-Click AI Benchmark** to execute the regression test suite and verify Groundedness, Refusal, and Rubric consistency.

---

## 🏛️ Architecture & Documentation

- [System Architecture Document](docs/ARCHITECTURE.md)
- [AI Documentation & Prompts](docs/AI_DOCUMENTATION.md)

---

## 🌐 Production Deployment (Vercel + Supabase)

To deploy to a public URL:
1. Create a free PostgreSQL database on [Supabase](https://supabase.com) or [Neon](https://neon.tech).
2. In `prisma/schema.prisma`, update `datasource db`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Run `npx prisma db push && npm run db:seed`.
4. Deploy the repository to [Vercel](https://vercel.com) and add the environment variables:
   - `DATABASE_URL`
   - `GEMINI_API_KEY`
