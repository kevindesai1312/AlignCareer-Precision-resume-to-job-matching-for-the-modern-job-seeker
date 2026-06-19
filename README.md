# AI Cover Letter & Cold Email Generator

A modern, fast, and highly customizable web application that uses Google's Gemini AI to automatically generate personalized cold emails and cover letters. Built with Python, Flask, and Vanilla CSS/JS.

## Features

- **Personalized Outreach**: Write highly contextual emails based on your skills and the job.
- **Smart Inputs**: 
  - **Resume Parsing**: Drag and drop your `.pdf` or `.docx` resume directly into the app.
  - **Web Scraping**: Paste a URL to a job listing, and the app will automatically scrape and extract the requirements for you.
- **Strict Anti-Hallucination**: The AI is strictly instructed to *never* invent skills you don't possess. It will only reference technologies explicitly listed on your resume.
- **Visual Placeholder Highlighting**: Whenever the AI leaves a bracketed placeholder (like `[Company Name]`), it is highlighted in bright yellow in the UI so you never accidentally send an unfinished email.
- **One-Click Tweak Variations**: Use the built-in toolbar to instantly rewrite the email ("Make it Shorter", "Make it Punchier", "More Professional") without typing new prompts.
- **Adjustable Tone**: Choose between Professional, Enthusiastic, Casual, and Direct tones.
- **Format Constraints**: Toggle between a Short LinkedIn Connection Request (~300 chars), a Standard Cold Email (~150 words), or a Traditional Cover Letter (full page).
- **Magic Bullet CTA**: Select exactly how you want to end your email (e.g., asking for a 10-minute chat, requesting a portfolio review).
- **Beautiful UI**: Features a modern, responsive design with glassmorphism, dynamic background elements, and smooth interactions.

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

- **Backend**: Python, Flask, PyPDF2, python-docx, BeautifulSoup4
- **Frontend**: HTML5, Vanilla CSS, Vanilla JavaScript
- **AI Integration**: Google Generative AI (`google-generativeai` package)
