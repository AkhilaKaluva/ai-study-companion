# AI Documentation & Prompt Management

In accordance with Sections 86, 87, and 88 of the Product Requirements Document, this document details the AI tools used during development, actual prompts used, and the AI models integrated into the final application.

---

## 1. AI Tools Used During Development (Section 86)

| Tool / Model | Role / Usage | Contribution | Scope |
| :--- | :--- | :--- | :--- |
| **Antigravity AI (Gemini 3.8 Flash High)** | Senior Software Engineering & Architecture Pair | Full-stack scaffolding, schema design, RAG pipeline architecture, TypeScript validation, and automated test creation. | Development |
| **Google Gemini 2.5 Flash** | Core Reasoning & Evaluation Engine | Powers grounded tutor responses, concept extraction, quiz generation, and open-ended grading. | In-Product |
| **Google text-embedding-004** | Semantic Vector Representation | Generates 768-dimensional embeddings for project document chunks and user queries. | In-Product |

---

## 2. Actual Development Prompts Used (Section 87)

### 2.1 Architecture & Schema Design
```text
Design a minimal, highly maintainable PostgreSQL/SQLite Prisma schema representing:
Users -> Spaces -> Projects -> Materials -> MaterialChunks (with pageNumber and embeddings) -> Concepts (with masteryScore and status) -> Conversations -> ChatMessages (with citations JSON) -> Quizzes -> QuizQuestions (MCQ and Open-Ended) -> QuizAttempts -> Recommendations -> AiLogs.
Prioritize project-level isolation and zero compilation friction.
```

### 2.2 PDF Ingestion & Preservation
```text
Write a Node.js TypeScript parser using pdf-parse that intercepts individual page render events to preserve exact 1-indexed page numbers. Split each page into ~250 word chunks with a 40-word overlap so citations can point directly to source pages.
```

### 2.3 RAG Grounded Tutor & Refusal Design
```text
Create a grounded RAG tutor service where responses are strictly anchored in retrieved project material chunks. Require exact citation tags: [Document Name, Page X]. If cosine similarity falls below the relevance threshold, force the assistant to refuse politely: "Based on the uploaded materials in this project, there is insufficient evidence to answer this question."
```

### 2.4 Adaptive Quiz & AI Grading
```text
Implement an assessment pipeline that identifies concepts with the lowest mastery score (< 70%), generates 2 MCQs and 1 Open-Ended question using Gemini structured JSON, and evaluates student written answers with an educational rubric returning score (0-100), key concepts covered, and missing elements.
```

---

## 3. AI Usage Inside the Final Product (Section 88)

```
                       ┌─────────────────────────┐
                       │   Development AI        │
                       │  (Antigravity Agent)    │
                       └────────────┬────────────┘
                                    │ Built code, schemas & tests
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Product AI Capabilities                         │
│                                                                        │
│  1. Grounded Tutor Chat      ──> Gemini 2.5 Flash                      │
│     (Strict citations [Doc, Page X] + Refusal on unsupported queries)  │
│                                                                        │
│  2. Semantic Search & RAG    ──> Google text-embedding-004             │
│     (768-dim embeddings with project-scoped cosine similarity)         │
│                                                                        │
│  3. Concept Extraction       ──> Gemini 2.5 Flash (Structured JSON)     │
│     (4-6 key concepts extracted upon PDF upload)                       │
│                                                                        │
│  4. Adaptive Assessment Gen  ──> Gemini 2.5 Flash (Structured JSON)     │
│     (Targeting weak concepts: 2 MCQs + 1 Open-Ended question)          │
│                                                                        │
│  5. Open-Ended AI Grading    ──> Gemini 2.5 Flash (Structured Rubric)   │
│     (Scores accuracy, feedback, covered/missing concepts)              │
│                                                                        │
│  6. Learning Recommendations ──> Gemini 2.5 Flash                      │
│     (Actionable 1-2 sentence next steps for weakest concept)           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Known Limitations & Future Roadmap (Sections 89 & 90)

### Known Prototype Limitations:
1. **Document Formats**: Primary support is optimized for text-layer PDFs. Scanned image-only PDFs require pre-OCR processing.
2. **Chunk Context**: Chunks are split at page boundaries. Cross-page sentence continuations may experience minor semantic truncation.
3. **Mastery Heuristic**: Concept mastery uses a weighted exponential moving average (60% new evidence, 40% historical) rather than full multi-parameter Item Response Theory (IRT).

### Future Improvements:
1. **Streaming Responses**: Add Server-Sent Events (SSE) for word-by-word streaming in the tutor chat.
2. **Visual Knowledge Graphs**: Render an interactive SVG/canvas concept graph linking related ideas.
3. **Voice Tutor Mode**: Integrate WebRTC / Gemini Live API for bidirectional speech-based tutoring.
