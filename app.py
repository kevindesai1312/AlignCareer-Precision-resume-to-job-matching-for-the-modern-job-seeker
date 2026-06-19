import os
import re
from flask import Flask, render_template, request, jsonify, Response
from google import genai
from google.genai import types
from dotenv import load_dotenv
import requests
from bs4 import BeautifulSoup

load_dotenv()

app = Flask(__name__)

# Configure Gemini API
API_KEY = os.getenv("GEMINI_API_KEY")
if not API_KEY:
    print("Warning: GEMINI_API_KEY not found in environment variables.")

def format_error(e):
    error_str = str(e).lower()
    if "quota" in error_str or "429" in error_str:
        return "[ERROR] Quota Exceeded or Rate Limited: Please try again later."
    elif "api_key" in error_str or "invalid" in error_str or "400" in error_str:
        return "[ERROR] Invalid API Key: Please check the key in your Settings."
    elif "503" in error_str or "unavailable" in error_str:
        return "[ERROR] API is currently overloaded (503). We attempted to retry automatically, but it is still busy. Please try again in a few minutes."
    return f"[ERROR] Something went wrong: {str(e)}"

import time

def stream_with_retry(client, model, contents, max_retries=3):
    retries = 0
    while retries <= max_retries:
        try:
            response = client.models.generate_content_stream(
                model=model,
                contents=contents
            )
            
            iterator = iter(response)
            try:
                first_chunk = next(iterator)
            except StopIteration:
                return

            if first_chunk.text:
                yield first_chunk.text
            
            for chunk in iterator:
                if chunk.text:
                    yield chunk.text
                    
            return
            
        except Exception as e:
            error_str = str(e).lower()
            if "503" in error_str or "unavailable" in error_str or "429" in error_str:
                if retries == max_retries:
                    yield format_error(e)
                    return
                retries += 1
                time.sleep(2 ** retries)
            else:
                yield format_error(e)
                return



def extract_text_from_url(url):
    try:
        # Some sites block default user agents, adding a standard one
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style"]):
            script.extract()
            
        text = soup.get_text(separator=' ')
        # Collapse whitespace
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        return text
    except Exception as e:
        raise Exception(f"Error fetching URL: {str(e)}")

def is_valid_url(text):
    # Basic URL validation
    regex = re.compile(
        r'^(?:http|ftp)s?://' # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+(?:[A-Z]{2,6}\.?|[A-Z0-9-]{2,}\.?)|' #domain...
        r'localhost|' #localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})' # ...or ip
        r'(?::\d+)?' # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)
    return re.match(regex, text.strip()) is not None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/generate', methods=['POST'])
def generate():
    resume_text = ""
    job_description_text = ""
    tone = "Professional"
    output_type = "Standard Cold Email"
    cta = "Default"
    
    if request.form:
        resume_text = request.form.get('resume', '').strip()
        job_description_input = request.form.get('job_description', '').strip()
        tone = request.form.get('tone', 'Professional')
        output_type = request.form.get('output_type', 'Standard Cold Email')
        cta = request.form.get('cta', 'Default')
        custom_api_key = request.form.get('custom_api_key', '').strip()
        
        if custom_api_key:
            client = genai.Client(api_key=custom_api_key)
        elif API_KEY:
            client = genai.Client(api_key=API_KEY)
        else:
            return jsonify({'error': 'No API key provided. Please set one in Settings.'}), 400
        
        # Check for file upload
        resume_part = None
        if 'resume_file' in request.files:
            file = request.files['resume_file']
            if file.filename != '':
                if file.filename.endswith('.pdf'):
                    mime_type = 'application/pdf'
                elif file.filename.endswith('.docx'):
                    mime_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                else:
                    return jsonify({'error': 'Unsupported file format. Please upload a PDF or DOCX file.'}), 400
                
                file_bytes = file.read()
                resume_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
                resume_text = "See attached document."
    else:
        return jsonify({'error': 'Invalid request format.'}), 400

    # Process Job Description (check if URL)
    if job_description_input:
        if is_valid_url(job_description_input):
            try:
                job_description_text = extract_text_from_url(job_description_input)
            except Exception as e:
                return jsonify({'error': str(e)}), 400
        else:
            job_description_text = job_description_input

    if not resume_text or not job_description_text:
        return jsonify({'error': 'Resume and Job Description are required.'}), 400
        
    try:
        # Adjust prompt based on output_type
        length_instruction = ""
        if "LinkedIn" in output_type:
            length_instruction = "This should be a short LinkedIn connection request (strictly around 300 characters). Keep it very brief and impactful."
        elif "Cover Letter" in output_type:
            length_instruction = "This should be a traditional, formal cover letter (about a full page). Follow standard letter formatting."
        else:
            length_instruction = "This should be a standard cold email (around 150-200 words). Make it punchy and readable."

        # Adjust CTA
        cta_instruction = ""
        if cta != "Default":
            cta_instruction = f"At the end of the message, include this specific Call-to-Action: '{cta}'."

        prompt = f"""
You are an expert career coach and copywriter. Your task is to write a highly personalized, compelling outreach message.
Using the provided resume and job description, create an outreach message that matches the specified tone and format.

FORMAT: {output_type}
TONE: {tone}

{length_instruction}
{cta_instruction}

JOB DESCRIPTION:
{job_description_text}

CANDIDATE'S RESUME:
(See attached document or pasted text below)
{resume_text}

CRITICAL SYSTEM INSTRUCTIONS:
1. NEVER hallucinate or invent skills, experiences, degrees, or technologies. You must ONLY mention skills explicitly listed in the CANDIDATE'S RESUME.
2. If there is a missing piece of information (e.g., you don't know the Hiring Manager's Name or the Company Name), you MUST use a placeholder in brackets, exactly like [Company Name] or [Hiring Manager]. Do not guess or invent names.
3. SUBJECT LINES: You MUST provide 3 distinct subject lines using different psychological hooks BEFORE the email body. Use EXACTLY this format:
[SUBJECT_DIRECT] Your direct match subject line here
[SUBJECT_CURIOSITY] Your curiosity hook subject line here
[SUBJECT_VALUE] Your value-first open subject line here
[BODY]
4. VERACITY CHECK: Whenever you mention a specific technical skill, tool, or methodology in the [BODY], you MUST wrap it in `<verified>skill name</verified>` if it is explicitly listed on the resume, or `<unverified>skill name</unverified>` if you inferred it or it is NOT explicitly on the resume.
5. The message should directly address how the candidate's actual skills solve the problems outlined in the job description.
6. Format the output clearly without conversational filler.
"""
        contents_list = []
        if resume_part:
            contents_list.append(resume_part)
        contents_list.append(prompt)

        return Response(stream_with_retry(client, 'gemini-2.5-flash', contents_list), mimetype='text/plain')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/tweak', methods=['POST'])
def tweak():
    data = request.json
    original_text = data.get('original_text')
    instruction = data.get('instruction')
    custom_api_key = data.get('custom_api_key', '').strip()
    
    if custom_api_key:
        client = genai.Client(api_key=custom_api_key)
    elif API_KEY:
        client = genai.Client(api_key=API_KEY)
    else:
        return jsonify({'error': 'No API key provided. Please set one in Settings.'}), 400
    
    if not original_text or not instruction:
        return jsonify({'error': 'Original text and instruction are required.'}), 400
        
    try:
        prompt = f"""
You are an expert editor. Your task is to rewrite the following outreach message according to the specific instruction below.

INSTRUCTION: {instruction}

CRITICAL SYSTEM INSTRUCTIONS:
1. NEVER hallucinate or invent skills, experiences, degrees, or technologies not present in the original message.
2. Retain any existing bracketed placeholders like [Company Name] or use them if information is missing.

ORIGINAL MESSAGE:
{original_text}
"""
        return Response(stream_with_retry(client, 'gemini-2.5-flash', prompt), mimetype='text/plain')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/micro_tweak', methods=['POST'])
def micro_tweak():
    data = request.json
    snippet = data.get('snippet')
    instruction = data.get('instruction')
    custom_api_key = data.get('custom_api_key', '').strip()
    
    if custom_api_key:
        client = genai.Client(api_key=custom_api_key)
    elif API_KEY:
        client = genai.Client(api_key=API_KEY)
    else:
        return jsonify({'error': 'No API key provided. Please set one in Settings.'}), 400
    
    if not snippet or not instruction:
        return jsonify({'error': 'Snippet and instruction are required.'}), 400
        
    try:
        prompt = f"""
Rewrite this sentence/snippet according to the instruction while preserving the core facts.

INSTRUCTION: {instruction}

CRITICAL SYSTEM INSTRUCTIONS:
1. ONLY return the rewritten snippet. Do not include any conversational filler, explanations, or quotes.
2. Retain any existing bracketed placeholders like [Company Name].

ORIGINAL SNIPPET:
{snippet}
"""
        return Response(stream_with_retry(client, 'gemini-2.5-flash', prompt), mimetype='text/plain')
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
