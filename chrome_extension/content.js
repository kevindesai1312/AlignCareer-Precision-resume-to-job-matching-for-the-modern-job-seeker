(function() {
    // Basic text extraction: grab all text from body
    // In a real scenario, we might target specific selectors like '.job-description'
    let jobText = document.body.innerText;
    
    // We only want a reasonable chunk to avoid massive URLs (limit to ~4000 chars for safe URL length)
    // Actually, URLs can have limits. Passing via URL parameters might hit max length if the text is huge.
    // However, modern browsers support long URLs. Let's limit to 4000 characters just in case.
    jobText = jobText.substring(0, 4000); 
    
    // Open the local generator with the text in URL params
    const generatorUrl = new URL("http://127.0.0.1:5000/");
    generatorUrl.searchParams.set("job_text", jobText);
    
    window.open(generatorUrl.toString(), '_blank');
})();
