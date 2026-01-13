# EdAccelerator Reading Comprehension Demo (Next.js + AI)

What it does:

- Shows a passage (initially as one full block of text)
- **Chunk with AI**: splits the passage into paragraphs, labels the main idea of each paragraph, groups them into thematic sections (left panel) and then caches specific passage to minimize openAI calls (good for cost effectiveness)
- **Generate questions (5–7)** with AI (mix of multiple choice + short answer)
- **Grade questions** with:
  - MCQ graded deterministically
  - Short answers graded by AI using the passage evidence + rubric + model answer
- Shows a **score summary**, **feedback**, **model answers**, and **evidence references** (paragraph indices + section labels)

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

- AI passage generation
