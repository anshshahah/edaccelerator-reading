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
