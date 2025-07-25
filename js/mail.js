/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadMailLogic(){
    let emails = [], selectedTab = 0, searchInput = "";
    let nextPageToken = [undefined], pageIndex = 0, maxPageIndex = -1;
    let tabs = ["inbox", "starred", "important", "sent"];

    const mailSideTab = document.querySelectorAll(".mail-side-tab");
    for(let i = 0; i < mailSideTab.length; i++){
        mailSideTab[i].onclick = ()=>{
            if(i !== selectedTab){
                mailSideTab[selectedTab].classList.remove("mail-side-selected-tab");
                mailSideTab[i].classList.add("mail-side-selected-tab");
                selectedTab = i;

                pageIndex = 0;
                maxPageIndex = -1;
                nextPageToken = [undefined]
                loadInbox(tabs[selectedTab], nextPageToken[pageIndex]);
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

    loadSendMessage();
    loadInbox("inbox", nextPageToken[pageIndex]);
    window.addEventListener("reload-emails", ()=>{
        loadInbox(tabs[selectedTab], nextPageToken[pageIndex]);
    });
    window.addEventListener("received-emails", (e)=>{
        let tokenFound = false;
        for(let i = 0; i < nextPageToken.length; i++){
            if(nextPageToken[i] === e.detail.nextPageToken){
                tokenFound = true;
                break;
            }
        }
        if(!tokenFound) nextPageToken.push(e.detail.nextPageToken);
        emails = e.detail.messages;
        
        if(e.detail.nextPageToken === null || e.detail.nextPageToken === undefined) maxPageIndex = nextPageToken.length-2;
        displayMailPageNum(pageIndex, e.detail.nextPageToken, emails.length, maxPageIndex);
        generateMailElements(emails, tabs[selectedTab], searchInput);
        canClickPrev = true;
        canClickNext = true;
        hideMailLoader();
    });

    let canClickPrev = true, canClickNext = true;
    const prevPage = document.querySelector("#prev-mail-page");
    const nextPage = document.querySelector("#next-mail-page");
    prevPage.onclick = ()=>{
        if(!canClickPrev) return;
        pageIndex--;
        if(pageIndex < 0){
            pageIndex = 0;
            return;
        }
        canClickPrev = false;
        loadInbox(tabs[selectedTab], nextPageToken[pageIndex]);
    }
    nextPage.onclick = ()=>{
        if(!canClickNext) return;
        pageIndex++;
        if(pageIndex > maxPageIndex && maxPageIndex !== -1){
            pageIndex = maxPageIndex;
            return;
        }
        canClickNext = false;
        loadInbox(tabs[selectedTab], nextPageToken[pageIndex]);
    }

    let mailSideShow = false;
    const mailSide = document.querySelector(".mail-side");
    const mailSideButton = document.querySelector("#mail-side-menu");
    mailSideButton.onclick = ()=>{
        if(mailSideShow){
            mailSide.style.animation = "none";
            mailSide.style.animation = "mail-side-out ease-in-out 0.1s forwards";
            mailSide.onanimationend = ()=>{
                mailSide.onanimationend = null;
                mailSideShow = false;
            }
        }
        else{
            mailSide.style.animation = "none";
            mailSide.style.animation = "mail-side-in ease-in-out 0.1s forwards";
            mailSide.onanimationend = ()=>{
                mailSide.onanimationend = null;
                mailSideShow = true;
            }
        }
    }

    window.addEventListener("resize", ()=>{portraitSideDisplay(mailSideShow)});
    portraitSideDisplay(mailSideShow);
}
function displayMailPageNum(pageIndex, nextPage, lastPageNum, maxPageIndex){
    const mailPageNumber = document.querySelector(".mail-page-number");
    let currNum = pageIndex * 50 + 1;
    let nextNum = (pageIndex + 1) * 50;
    if(nextPage === null) nextNum = currNum + lastPageNum - 1;
    mailPageNumber.innerText = currNum + "-" + nextNum;

    const prevPageButton = document.querySelector("#prev-mail-page");
    if(pageIndex === 0) prevPageButton.classList.add("mail-page-arrow-disabled");
    else prevPageButton.classList.remove("mail-page-arrow-disabled");

    const nextPageButton = document.querySelector("#next-mail-page");
    if(pageIndex === maxPageIndex) nextPageButton.classList.add("mail-page-arrow-disabled");
    else nextPageButton.classList.remove("mail-page-arrow-disabled");
}
function portraitSideDisplay(mailSideShow){
    const mailSide = document.querySelector(".mail-side");
    if(window.innerWidth <= 700 && window.innerWidth <= window.innerHeight){
        if(mailSideShow) mailSide.style.width = "10rem";
        else mailSide.style.width = "0rem";
    }
    else{
        mailSide.style.animation = "none";
        mailSide.style.width = "10rem";
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
            let searchCondition = true;
            if(searchInput !== ""){
                const searchParam = searchInput.toLowerCase();
                const emailFrom = emails[i].from.toLowerCase();
                const emailSubject = emails[i].subject.toLowerCase();
                const emailSnippet = emails[i].snippet.toLowerCase();
                searchCondition = (emailFrom.indexOf(searchParam) !== -1) || (emailSubject.indexOf(searchParam) !== -1) || (emailSnippet.indexOf(searchParam) !== -1)
            }

            if(searchCondition){
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
                if(!emails[i].isUnread) mail.classList.add("mail-read");
        
                if(tab === "sent") mailAddress.innerText = emails[i].to;
                else mailAddress.innerText = emails[i].from;
                mailSubject.innerText = emails[i].subject;
                mailSnippet.innerText = emails[i].snippet;
                mail.id = "mail-"+emails[i].id;
        
                mail.appendChild(mailMarks);
                mail.appendChild(mailAddress);
                mail.appendChild(mailContent);
                mail.appendChild(mailOptions);
                mailContent.appendChild(mailSubject);
                mailContent.appendChild(mailSnippet);
                mailList.appendChild(mail);
                anyDisplayed = true;

                mail.onclick = ()=>{getEmailContent(emails[i])}
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
    mailDelete.onclick = (e)=>{
        e.stopPropagation();
        deleteEmail(email.id);
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

    mailRect.onclick = (e)=>{
        e.stopPropagation();
        console.log(email);
    }
    mailStar.onclick = async (e)=>{
        e.stopPropagation();
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
            }
        }
        catch(error){
            console.error("Toggle error:", error);
        }
    }
    mailImportant.onclick = async (e)=>{
        e.stopPropagation();
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
            }
        }
        catch(error){
            console.error("Toggle error:", error);
        }
    }

    return mailMarks;
}
function generateMailDisplay(email){
    const mailMessageDisplay = document.querySelector(".mail-message-display");
    const mailList = document.querySelector(".mail-list");
    mailMessageDisplay.style.display = "block";
    mailList.style.display = "none";

    const mailSubject = document.querySelector(".mail-message-body-subject");
    const mailValue = document.querySelector(".mail-message-body-value");
    mailSubject.innerText = email.subject;

    const mailDelete = document.querySelector(".mail-message-head-delete");
    const mailBack = document.querySelector(".mail-message-head-back");
    mailDelete.onclick = ()=>{
        deleteEmail(email.id);
        mailBack.click();
    }
    mailBack.onclick = ()=>{
        mailMessageDisplay.style.display = "none";
        mailList.style.display = "block";
        mailSubject.innerText = "";
        mailDelete.onclick = null;
        mailValue.innerHTML = "";
    }

    if(email.isUnread) markEmailRead(email.id);
}
function loadSendMessage(){
    const sendMailRecipients = document.querySelector("#send-mail-recipients");
    const sendMailSubject = document.querySelector("#send-mail-subject");
    const sendMailMessage = document.querySelector("#send-mail-message");

    const sendMailWindow = document.querySelector(".send-mail-window");
    const sendMailClose = document.querySelector(".send-mail-close");
    const sendMailButton = document.querySelector("#send-mail");
    const newEmail = document.querySelector("#new-email");
    sendMailWindow.style.display = "none";
    
    const attachmentFileInput = document.querySelector("#attachment-file-input");
    const attachmentDisplay = document.querySelector(".attachment-display");
    const mailAttachment = document.querySelector("#mail-attachment");
    attachmentDisplay.innerHTML = "";
    attachmentFileInput.value = null;

    newEmail.onclick = ()=>{
        if(sendMailWindow.style.display === "none"){
            attachmentFileInput.value = null;
            attachmentDisplay.innerHTML = "";
            sendMailRecipients.value = "";
            sendMailSubject.value = "";
            sendMailMessage.value = "";

            sendMailWindow.style.animation = "new-mail-in ease-in-out 0.2s forwards";
            sendMailWindow.style.display = "block";
            sendMailWindow.onanimationend = ()=>{
                sendMailWindow.style.animation = "none";
                sendMailWindow.onanimationend = null;
            }
        }
    }
    sendMailClose.onclick = ()=>{
        sendMailWindow.style.animation = "new-mail-out ease-in-out 0.2s forwards";
        sendMailWindow.onanimationend = ()=>{
            sendMailWindow.style.animation = "none";
            sendMailWindow.style.display = "none";
            sendMailWindow.onanimationend = null;

            sendMailRecipients.value = "";
            sendMailSubject.value = "";
            sendMailMessage.value = "";
        }
    }
    sendMailButton.onclick = ()=>{
        sendMail(sendMailRecipients.value, sendMailSubject.value, sendMailMessage.value, attachmentFileInput.files, "mail");
    }

    mailAttachment.onclick = ()=>{
        attachmentFileInput.click();
    }
    attachmentFileInput.oninput = ()=>{
        attachmentDisplay.innerText = attachmentFileInput.files.length + " files selected";
    }
}
function showMailLoader(){
    document.querySelector(".mail-list-holder").style.overflowY = "hidden";
    fadeIn(".mail-mask", 0.1, "block", null);
}
function hideMailLoader(){
    document.querySelector(".mail-list-holder").style.overflowY = "auto";
    fadeOut(".mail-mask", 0.1, null);
}

/*--Mail Manipulation--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
async function loadInbox(inbox, nextPageToken){
    showMailLoader();
    try{
        let url = "/api/emails/"+inbox;
        if(nextPageToken) url = "/api/emails/"+inbox+"?pageToken="+nextPageToken;
        const response = await fetch(url, {method:"GET"});
        const emails = await response.json();

        const receivedEmailsEvent = new CustomEvent("received-emails", {
            detail:{
                nextPageToken:emails.nextPageToken,
                messages:emails.messages
            }
        });
        window.dispatchEvent(receivedEmailsEvent);
    }
    catch(error){
        console.log("Load inbox error: ", inbox);
        hideMailLoader();
    }
}
async function deleteEmail(emailID){
    if(!confirm("Move this email to Trash?")) return;
    try{
        const response = await fetch("/api/emails/"+emailID, {method:"DELETE"});
        const result = await response.json();
        if(result.success){
            const reloadEmails = new Event("reload-emails");
            window.dispatchEvent(reloadEmails);
        }
        else{
            console.log(result.message);
            notification("Deletion Error");
        }
    }
    catch(error){
        console.log(error);
        notification("Deletion Error");
    }
}
async function getEmailContent(email){
    try{
        const response = await fetch("/api/email-content/"+email.id);
        const emailResponse = await response.json();

        const mailValue = document.querySelector(".mail-message-body-value");
        const cleanHTML = DOMPurify.sanitize(emailResponse.parsedBody, {
            USE_PROFILES:{html:true},
            FORBID_TAGS:["style", "script", "img"]
        });
        mailValue.innerHTML = cleanHTML;
        generateMailDisplay(email);
    }
    catch(error){
        console.log(error);
        notification("Fetching email error");
    }
}
async function markEmailRead(emailID){
    const response = await fetch("/api/emails/"+emailID+"/read", {method:"POST"});
    const result = await response.json();
    if(result.success){
        const reloadEmails = new Event("reload-emails");
        window.dispatchEvent(reloadEmails);
    }
}
async function sendMail(recipients, subject, message, attachments, appPart){
    try{
        const formData = new FormData();
        formData.append("recipients", recipients);
        formData.append("subject", subject);
        formData.append("message", message);
        for(let i = 0; i < attachments.length; i++){
            formData.append("file", attachments[i]);
        }

        const response = await fetch("/api/send-mail", {
            method:"POST",
            body:formData
        });
        if(!response.ok) notification("Failed to send email");
        else{
            switch(appPart){
                default:break;
                case "mail":
                    notification("Email sent successfully");
                    document.querySelector(".send-mail-close").click();
                    break;
                case "invite":
                    const inviteEmailSent = new CustomEvent("invite-email-sent", {detail:{email:recipients}});
                    window.dispatchEvent(inviteEmailSent);
                    break;
            }
        }
    }
    catch(error){
        console.log("Sending email error:", error);
        notification("Sending email error");
    }
}
