# EdAccelerator Reading Comprehension Demo (Next.js + AI)

## What it does

- Shows a passage (initially as one full block of text)
- **Chunk with AI**: splits the passage into paragraphs, labels the main idea of each paragraph, groups them into thematic sections (left panel), and **caches chunk results** per passage to reduce OpenAI calls (cost-effective)
- **Generate questions (5–7)** with AI (mix of multiple choice + short answer)
- **Grade questions**
  - MCQ graded deterministically
  - Short answers graded by AI using **evidence paragraphs + rubric + model answer**
- Shows **score summary**, **feedback**, **model answers**, and **evidence references** (paragraph indices + section labels)
- **Hints** button per question reveals evidence location (e.g., “Paragraph 2”, “Section: …”)

## Interpretation of the feedback

The main feedback themes were: make passages easier to re-read, support different reading speeds, and make mistakes more educational instead of “click next”.

How this implementation responds:

- **Chunking + sections**: the passage can be broken into thematic sections and paragraphs with “main idea” labels, making it much easier to re-read specific parts quickly.
- **Typed answers supported**: question sets include short-answer questions with model answers and rubrics.
- **Evidence-based learning**: each question is tied to evidence paragraph indices (and section labels after chunking), so learners can see _where_ the answer comes from.
- **Hints**: users can reveal targeted evidence references without immediately seeing the full solution.
- **Feedback + model answers**: grading shows correct answers, model answers, and written feedback to support learning from mistakes.

## AI question generation approach

Questions are generated from the **AI-produced paragraph list** (not raw text), so the model can reliably attach `evidenceParagraphs` indices.

The question generator produces:

- **5–7 questions per set**
- A **mix** of:
  - **MCQ** (4 options + `correctOptionIndex`)
  - **Short answer** (`modelAnswer` + `rubric` points)
- `evidenceParagraphs`: 0-based indices pointing to the paragraph(s) that support the answer
- `explanation`: short justification grounded in the passage evidence

To reduce repeated sets:

- The API supports `avoidPrompts` (previous prompts are passed back in) so the model aims to create different questions on “Generate new questions”.

## Key decisions

- **Store passages as raw text**: passages are not pre-paragraphized; the “Chunk with AI” step is responsible for converting raw text into paragraphs + ideas + thematic sections.
- **AI-only pipeline (no fallback)**: chunking, question generation, and short-answer grading all rely on AI. If the API fails/quota is exceeded, the UI shows an error.
- **Evidence-grounded grading**: short answers are graded using rubric + model answer + the actual evidence paragraph text (to avoid grading “in a vacuum”).
- **Deterministic MCQ grading**: MCQs are graded locally via the known correct option index (fast and reliable).
- **Chunk caching**: chunking results are cached per passage (keyed by `passageId + hash(passage.text)`) to reduce repeated OpenAI calls and improve cost effectiveness.
- **User flow control**: “Generate new questions” is locked until the current set is graded to keep the learning loop consistent.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- OpenAI API (Responses API + Structured Outputs)

## Quick start (local)

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

### 3. Run the development server

```bash
npm run dev
```

### 4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

src/
├─ app/ # Next.js App Router
│ ├─ layout.tsx # Global HTML layout + metadata
│ ├─ globals.css # Global styles + Tailwind base import
│ ├─ page.tsx # Home page: lists available passages + Start links
│ ├─ passages/
│ │ └─ [id]/
│ │ └─ page.tsx # Passage page: renders PassageWorkspace
│ │
│ └─ api/ # Server Route Handlers (OpenAI calls happen here)
│ ├─ chunk/
│ │ └─ route.ts # POST: AI splits raw passage -> paragraphs+ideas+sections (uses chunk cache)
│ ├─ questions/
│ │ └─ route.ts # POST: generate 5–7 questions from AI paragraphs (uses avoidPrompts for variety)
│ └─ grade-questions/
│ └─ route.ts # POST: grade answers; MCQ deterministic, short answers graded by AI using evidence text
│
├─ components/ # Client-side React components
│ ├─ passage/
│ │ └─ PassageWorkspace.tsx # Split view layout: left passage panel + right QuestionsPanel
│ │ # - shows raw text
│ │ # - Chunk with AI button switches to themed sections + paragraph ideas
│ │ # - also provides ensureChunked() so QuestionsPanel can auto-chunk before generating
│ │
│ └─ questions/
│ └─ QuestionsPanel.tsx # Questions UI
│ # - Generate questions (auto-chunks first if needed)
│ # - Answer MCQ + short answers
│ # - Grade button (prominent)
│ # - Shows score + feedback + model answer
│ # - Hint toggle shows evidence (Paragraph X + Section label)
│ # - “Generate new questions” locked until grading
│
├─ data/
│ └─ passages/
│ ├─ sample.json # Passage content
│ └─ index.ts # Registry of passages (exports `passages` map used by routes/pages)
│
└─ lib/ # Shared logic + types + OpenAI helpers
├─ types.ts # TypeScript types for:
│ # - PassageData (raw text)
│ # - ChunkedPassageResult (paragraphs+ideas+sections)
│ # - Questions, answers, and grading report shapes
│
└─ ai/
├─ openai.ts # OpenAI client initialization
├─ thematicChunking.ts # AI chunking function
├─ questionGeneration.ts # AI question generation
└─ chunkCache.ts # In-memory chunk cache # - keyed by passageId + hash(passage.text) # - avoids repeated OpenAI chunk calls

## Improvements

- AI passage generation (generate passages by topic + difficulty)
- Attempts/scores tracker or leaderboard with a DB
- Click evidence chips to preview the exact paragraph or reference to answers inline
- Rate limiting to protect OpenAI usage/cost
