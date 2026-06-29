# AI Cover Letter & Cold Email Generator

A modern, fast, and highly customizable web application that uses Google's Gemini AI to automatically generate personalized cold emails and cover letters. Built with Python, Flask, and Vanilla CSS/JS.

## Features

- **Real-Time Streaming**: Watch your cover letter type out in real-time, just like ChatGPT, providing a beautiful user experience without long loading screens.
- **Secure API Key Management**: Optionally provide your own Gemini API Key directly in the UI via the Settings gear. It's stored securely in your browser's local storage.
- **Smart Inputs**: 
  - **Native Multimodal Parsing**: Drag and drop your `.pdf` or `.docx` resume directly into the app. It passes files directly to Gemini as a multimodal payload, avoiding text distortion from traditional parsers.
  - **Web Scraping**: Paste a URL to a job listing, and the app will automatically scrape and extract the requirements for you.
- **Multi-Agent Review Loop**: Employs a two-agent verification system behind the scenes. A "Writer Agent" drafts the initial email, and a "Critic Agent" acts as an editor, rigorously reviewing the draft against your resume to eliminate hallucinations and refine the tone before the final polished version is streamed to you.
- **Deliverability & Spam Warning Engine**: A real-time validation panel that scans the generated outreach for common cold email spam trigger words (e.g., "100% free", "act now"). Red flags are highlighted inline and explained in a warning panel to ensure your emails actually reach the inbox, not the promotions folder.
- **One-Click Chrome Extension Companion**: Remove the friction of copying and pasting job descriptions. Included is a lightweight Chrome extension that extracts the job requirements from any webpage and automatically sends it to your local generator.
- **"AI Honesty & Veracity" Check (Anti-Hallucination Highlight)**: The AI is strictly instructed to *never* invent skills you don't possess. When it generates your letter, it cross-references keywords with your uploaded resume. Verified skills glow soft green. Unverified buzzwords glow amber with a warning tooltip so you always send honest applications.
- **Subject Line A/B Tester & Open-Rate Predictor**: For cold emails, the subject line is critical. The AI outputs 3 distinct options (Direct Match, Curiosity Hook, Value-First Open) before the body. A "Click to Apply" button instantly injects your favorite into the final document.
- **"Icebreaker" Alternative Carousel (Hook Selector)**: The hardest part of a cold email is the first line. A dedicated "Hook Selector" widget automatically generates 3 distinct opening lines (Mutual Connection, Recent Company News, Direct Pain-Point). Click to instantly swap the opening line without affecting the rest of the generated letter.
- **Visual Placeholder Highlighting & Smart Editing**: Whenever the AI leaves a bracketed placeholder (like `[Company Name]`), it is transformed into an interactive, clickable text input directly within the generated email. You can treat the result like a form wizard, filling out the missing details before exporting or copying.
- **Dynamic Form Wizard (Two-Way Binding)**: When you type into one placeholder block, all other instances of that exact placeholder instantly update across the entire letter in real-time. No more copy-pasting the same company name four times.
- **Ghost-Writer Inline Auto-Complete**: Start typing your own custom sentence anywhere in the generated output and hit `Tab`. A quick micro-LLM stream will automatically complete your thought right at your cursor, contextually aware of the surrounding text and the target job description.
- **Inline "Sentence Rephrasing" (Micro-Tweak)**: Highlight any clunky sentence or phrase in your generated letter to trigger a floating toolbar. You can instantly rewrite just that specific snippet to be Shorter, more Formal, or Punchier using a micro-LLM call seamlessly, without regenerating the whole letter.
- **One-Click Document Tweak Variations**: Use the built-in toolbar to instantly rewrite the entire email ("Make it Shorter", "Make it Punchier", "More Professional") without typing new prompts.
- **Adjustable Tone**: Choose between Professional, Enthusiastic, Casual, and Direct tones.
- **Format Constraints**: Toggle between a Short LinkedIn Connection Request (~300 chars), a Standard Cold Email (~150 words), or a Traditional Cover Letter (full page).
- **Magic Bullet CTA**: Select exactly how you want to end your email (e.g., asking for a 10-minute chat, requesting a portfolio review).
- **One-Click Copy**: Instantly copy your generated outreach to your clipboard with a single click.
- **History Log**: Your last 5 generated letters are automatically saved in your browser's local storage so you never lose your work.
- **Beautiful UI**: Features a modern, responsive design with glassmorphism, dynamic background elements, smooth interactions, and a split-screen desktop layout.

## Prerequisites

- Python 3.10+
- A Google Gemini API Key

## Setup & Installation

1. **Clone or Download the Project**
   Navigate to the project directory:
   ```bash
   cd ai-cover-letter-generator
   ```

2. **Create a Virtual Environment** (Recommended)
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Environment Variables**
   Create a `.env` file in the root directory and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_api_key_here
   ```

## Running the Application

Start the Flask server:
```bash
python app.py
```

Open your browser and navigate to `http://127.0.0.1:5000` to use the application.

## Tech Stack

- **Backend**: Python, Flask, BeautifulSoup4
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript, Server-Sent Chunking
- **AI Integration**: Google GenAI SDK (`google-genai` package) with Gemini 2.5 Flash natively handling PDF and DOCX documents as multimodal input.
