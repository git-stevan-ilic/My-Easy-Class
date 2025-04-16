/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadMailLogic(){
    let emails = [], selectedTab = 0, searchInput = "";
    let tabs = ["inbox", "starred", "important", "sent"];

    const mailSideTab = document.querySelectorAll(".mail-side-tab");
    for(let i = 0; i < mailSideTab.length; i++){
        mailSideTab[i].onclick = ()=>{
            if(i !== selectedTab){
                mailSideTab[selectedTab].classList.remove("mail-side-selected-tab");
                mailSideTab[i].classList.add("mail-side-selected-tab");
                selectedTab = i;
                generateMailElements(emails, tabs[selectedTab], searchInput);
            } 
        }
    }

    const mailSearch = document.querySelector("#mail-search");
    const mailSearchIcon = document.querySelector("#mail-search-icon");
    mailSearch.value = "";
    mailSearch.oninput = ()=>{
        searchInput = mailSearch.value;
        generateMailElements(emails, tabs[selectedTab], searchInput);
    }
    mailSearchIcon.onclick = ()=>{
        searchInput = mailSearch.value;
        generateMailElements(emails, tabs[selectedTab], searchInput);
    }

    loadInbox();
    window.addEventListener("received-emails", (e)=>{
        emails = e.detail.newEmails;
        generateMailElements(emails, tabs[selectedTab], searchInput);
    });
    window.addEventListener("update-important", (e)=>{
        const emailId = e.detail.emailId;
        const isImportant = e.detail.isImportant;
        for(let i = 0; i < emails.length; i++){
            if(emails[i].id === emailId){
                emails[i].isImportant = isImportant;
                generateMailElements(emails, tabs[selectedTab], searchInput);
                break;
            }
        }
    });
    window.addEventListener("update-starred", (e)=>{
        const emailId = e.detail.emailId;
        const isStarred = e.detail.isStarred;
        for(let i = 0; i < emails.length; i++){
            if(emails[i].id === emailId){
                emails[i].isStarred = isStarred;
                generateMailElements(emails, tabs[selectedTab], searchInput);
                break;
            }
        }
    });
}
async function loadInbox(){
    try{
        const response = await fetch("/api/emails");
        const emails = await response.json();

        const receivedEmailsEvent = new CustomEvent("received-emails", {detail:{newEmails:emails}});
        window.dispatchEvent(receivedEmailsEvent);
    }
    catch(error){
        console.log("Load inbox error: ", inbox);
    }
}

/*--Generate Mail Elements---------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateMailElements(emails, tab, searchInput){
    const mailList = document.querySelector(".mail-list");
    while(mailList.children.length > 0) mailList.removeChild(mailList.lastChild);

    function emptyInbox(){
        const noEmail = document.createElement("div");
        noEmail.className = "no-email";
        noEmail.innerText = "Inbox empty";
        mailList.appendChild(noEmail);
    }
    if(emails.length === 0) emptyInbox();
    else{
        let anyDisplayed = false;
        for(let i = 0; i < emails.length; i++){
            let tabCondition = false;
            switch(tab){
                default: tabCondition = false; break;
                case "inbox": tabCondition = true; break;
                case "starred": tabCondition = emails[i].isStarred; break;
                case "important": tabCondition = emails[i].isImportant; break;
            }

            let searchCondition = true;
            if(searchInput !== ""){
                const searchParam = searchInput.toLowerCase();
                const emailFrom = emails[i].from.toLowerCase();
                const emailSubject = emails[i].subject.toLowerCase();
                const emailSnippet = emails[i].snippet.toLowerCase();
                searchCondition = (emailFrom.indexOf(searchParam) !== -1) || (emailSubject.indexOf(searchParam) !== -1) || (emailSnippet.indexOf(searchParam) !== -1)
            }

            if(tabCondition && searchCondition){
                const mailOptions = genetateMailOptions(emails[i]);
                const mailMarks = generateMailMarks(emails[i]);
                const mail = document.createElement("div");
                const mailAddress = document.createElement("div");
                const mailContent = document.createElement("div");
                const mailSubject = document.createElement("div");
                const mailSnippet = document.createElement("div");
        
                mail.className = "mail";
                mailAddress.className = "mail-address";
                mailContent.className = "mail-content";
                mailSubject.className = "mail-subject";
                mailSnippet.className = "mail-snippet";
        
                mailAddress.innerText = emails[i].from;
                mailSubject.innerText = emails[i].subject;
                mailSnippet.innerText = emails[i].snippet;
        
                mail.appendChild(mailMarks);
                mail.appendChild(mailAddress);
                mail.appendChild(mailContent);
                mail.appendChild(mailOptions);
                mailContent.appendChild(mailSubject);
                mailContent.appendChild(mailSnippet);
                mailList.appendChild(mail);
                anyDisplayed = true;
            }
        }
        if(!anyDisplayed) emptyInbox();
    }
}
function genetateMailOptions(email){
    const mailOptions = document.createElement("div");
    const mailDelete = document.createElement("div");

    mailOptions.className = "mail-options";
    mailDelete.className = "mail-delete";

    mailOptions.appendChild(mailDelete);
    mailDelete.onclick = ()=>{
        console.log(email);
    }

    return mailOptions;
}
function generateMailMarks(email){
    const mailMarks = document.createElement("div");
    const mailRect = document.createElement("div");
    const mailStar = document.createElement("div");
    const mailImportant = document.createElement("div");

    mailMarks.className = "mail-marks";
    mailRect.className = "mail-rect";
    mailStar.className = "mail-star";
    mailImportant.className = "mail-important";
    if(email.isStarred) mailStar.classList.add("mail-star-marked");
    if(email.isImportant) mailImportant.classList.add("mail-important-marked");

    mailMarks.appendChild(mailRect);
    mailMarks.appendChild(mailStar);
    mailMarks.appendChild(mailImportant);

    mailRect.onclick = ()=>{
        console.log(email);
    }
    mailStar.onclick = async ()=>{
        const isMarked = mailStar.classList.contains("mail-star-marked");
        try{
            const response = await fetch("/api/emails/"+email.id+"/star", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({markAsStarred:!isMarked})
            });
            if(response.ok){
                let isStarred;
                if(!isMarked){
                    mailStar.classList.add("mail-star-marked");
                    isStarred = true;
                }
                else{
                    mailStar.classList.remove("mail-star-marked");
                    isStarred = false;
                }

                const updateStarred = new CustomEvent("update-starred", {
                    detail:{
                        isStarred:isStarred,
                        emailId:email.id
                    }
                });
                window.dispatchEvent(updateStarred);
            }
        }
        catch(error){
            console.error("Toggle error:", error);
        }
    }
    mailImportant.onclick = async ()=>{
        const isMarked = mailImportant.classList.contains("mail-important-marked");
        try{
            const response = await fetch("/api/emails/"+email.id+"/importance", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({markAsImportant:!isMarked})
            });
            if(response.ok){
                let isImportant;
                if(!isMarked){
                    mailImportant.classList.add("mail-important-marked");
                    isImportant = true;
                }
                else{
                    mailImportant.classList.remove("mail-important-marked");
                    isImportant = false;
                }

                const updateImportant = new CustomEvent("update-important", {
                    detail:{
                        isImportant:isImportant,
                        emailId:email.id
                    }
                });
                window.dispatchEvent(updateImportant);
            }
        }
        catch(error){
            console.error("Toggle error:", error);
        }
    }

    return mailMarks;
}