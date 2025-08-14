document.getElementById("summarize").addEventListener("click",async() =>{
      const resultDiv= document.getElementById("result");
      const summaryType = document.getElementById("summary-type").value;
      resultDiv.innerHTML ='<div class="loader"></div>';
      //1.Get the users API key
        const { geminiApiKey } = await chrome.storage.sync.get(['geminiApiKey']);
        if(!geminiApiKey){
            resultDiv.innerHTML = "No API key is set. Click the gear icon to add one.";
            return;
        }
    

       // 2. Ask Content.js for the page text
       const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(
            tab.id,
             {type: "GET_ARTICLE_TEXT"},
           async  ({ text })=>{
              if(!text){
                resultDiv.innerText ="couldn't extract text from this page.";
                return;
              }  
              try {
                const summary = await getGeminiSummary(text,summaryType,geminiApiKey);
                resultDiv.innerText = summary;
              } catch (error) {
                     resultDiv.innerText = `Error: ${error.message || "Failed to generate summary."}`;
              }
             }      

        );

       }); 
      
     

    document.getElementById("copy-btn").addEventListener("click", () => {
  const summaryText = document.getElementById("result").innerText;

  if (summaryText && summaryText.trim() !== "") {
    navigator.clipboard
      .writeText(summaryText)
      .then(() => {
        const copyBtn = document.getElementById("copy-btn");
        const originalText = copyBtn.innerText;

        copyBtn.innerText = "Copied!";
        setTimeout(() => {
          copyBtn.innerText = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
      });
  }
});


       //3. Send text to gemini


       async function getGeminiSummary(rawText,type,apiKey){
        const max = 20000;
        const text = rawText.length >max ? rawText.slice(0,max) +"...":rawText;
        const promptMap={
            brief: 'Summarize in 2-3 sentences:\n\n${text}',
            detailed:'Give a detailed summary:\n\n${text}',
            bullets:'Summarize in 5-7 bullet points (start each line with "...."):\n\n${text}',

        };
        const prompt = promptMap[type] || promptMap.brief;
        try{
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,{
            method:"POST",
            headers: {"Content-Type":"application/json"},
            body: JSON.stringify({
                contents: [{parts:[{text:prompt}]}],
                generationConfig: {temperature : 0.2},

            }),
        }
    );
    if(!res.ok){
        const {error} = await res.json();
        throw new Error(error?.message||"Request failed");
    }
    const data = await res.json();
    return(
         data.candidates?.[0]?.content?.parts?.[0]?.text??"No Summary."
    );

} catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
}



     