/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
window.onload = initLoad;

function initLoad(){
    const client = io();
    loadPreLoginPaymentLogic();

    let notificationTimeout;
    window.addEventListener("notification", (e)=>{
        clearTimeout(notificationTimeout);
        document.querySelector(".notification").innerText = e.detail.text;
        fadeIn(".notification", 0.1, "block", ()=>{
            notificationTimeout = setTimeout(()=>{
                fadeOut(".notification", 0.1);
            }, 2000);
        });
    });
    document.querySelector(".dashboard-account-share").onclick = ()=>{
        notification("Link copied");
    }

    const head = document.getElementsByTagName("head")[0];
    const link = document.createElement("link");
    link.rel   = "stylesheet";
    link.type  = "text/css";
    link.href  = "../css/overwrite.css";
    head.appendChild(link);
    setTimeout(()=>{fadeOut(".loading-screen", 0.1)}, 200);

    const mode = loadUrlParamLogic(client);
    if(mode === "user"){
        loadLogInLogic(client);
        //ZoomMeetingAPI();
        loadHeadLogic();
    }
}

function fadeIn(query, durration, type, callabck){
    const element = document.querySelector(query);
    element.style.animation = "fade-in ease-in-out "+durration+"s";
    if(!type) element.style.display = "block";
    else element.style.display = type;
    element.onanimationend = ()=>{
        element.style.animation = "none";
        element.onanimationend = null;
        if(callabck) callabck();
    }
}
function fadeOut(query, durration, callabck){
    const element = document.querySelector(query);
    element.style.animation = "fade-out ease-in-out "+durration+"s";
    element.onanimationend = ()=>{
        element.style.animation = "none";
        element.style.display = "none";
        element.onanimationend = null;
        if(callabck) callabck();
    }
}
function notification(text){
    const data = {detail:{text:text}};
    const notification = new CustomEvent("notification", data);
    window.dispatchEvent(notification);
}
function isValidEmail(email){
    let re = /\S+@\S+\.\S+/;
    return re.test(email);
}
function stripUrlParams(url){
    try{
        const parsedUrl = new URL(url);
        return `${parsedUrl.origin}${parsedUrl.pathname}`;
    }
    catch(e){
        console.error("Invalid URL:", url);
        return url;
    }
}

/*--URL Parameters Logic-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadUrlParamLogic(client){
    const urlParams = getUrlParams();
    let mode = "user";
    if(urlParams.id){
        client.emit("get-user-display-data", urlParams.id);
        mode = "user-view";
    }

    client.on("get-user-display-data-fail", ()=>{notification("Profile not found")});
    client.on("receive-user-display-data", (userData)=>{loadProfileViewDIsplay(userData)});
    return mode;
}
function getUrlParams(){
    const result = {};
    const params = new URLSearchParams(window.location.search);
    for(const [key, value] of params.entries()) result[key] = value;
    return result;
}
function loadProfileViewDIsplay(userData){
    document.querySelector(".about-me-name").innerText = userData.username || "";
    document.querySelector(".about-me-email").innerText = userData.email;
    document.querySelector("#about-me-job").innerText = userData.jobTitle || "Not provided";
    document.querySelector("#about-me-location").innerText = userData.location || "Not provided";
    document.querySelector("#about-me-education").innerText = userData.education || "Not provided";
    document.querySelector("#about-me-history").innerText = userData.history || "Not provided";
    document.querySelector("#about-me-desc").innerText = userData.description || "Not provided";

    const mainScreen = document.querySelector("#main");
    while(mainScreen.children.length > 2) mainScreen.removeChild(mainScreen.firstChild);
    document.querySelector("#about-me-screen").style.display = "block";
    document.querySelector("#pre-main").style.display = "none";
    document.querySelector(".pre-main-head").remove();
    document.querySelector(".main-head").remove();
    document.querySelector("#edit-info").remove();
    mainScreen.style.display = "block";
    document.querySelector(".about-me-share").onclick = ()=>{accountURL(userData.userID)}

    let cvFile = null, iconFile = null;
    if(userData.cv.filename && userData.cv.mimeType && userData.cv.data){
        cvFile = new Blob([userData.cv.data], {type:userData.cv.mimeType});
        cvFile.name = userData.cv.filename;
    }
    if(userData.icon.filename && userData.icon.mimeType && userData.icon.data){
        const byteArray = new Uint8Array(userData.icon.data);
        iconFile = new Blob([byteArray], {type:userData.icon.mimeType});
        const url = URL.createObjectURL(iconFile);
        const userIcons = document.querySelectorAll(".user-icon");
        for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = `url(${url})`;
    }

    document.querySelector("#about-me-cv").onclick = ()=>{
        if(!cvFile) notification("No CV present");
        else{
            const url = URL.createObjectURL(cvFile);
            const a = document.createElement('a');
            a.href = url;
            a.download = cvFile.name;
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
    }
}

/*--Head Logic---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadHeadLogic(){
    headAccountLogic();
    headTabLogic();
}
function headAccountLogic(){
    const accountDropDown = document.querySelector(".account-drop-down");
    const accountAboutMe = document.querySelector("#account-about-me");
    const accountLogOff = document.querySelector("#account-log-off");
    const accountIcon = document.querySelector(".account-icon");
    
    let eventInterupted = false;
    let accountOptionsShow = false;
    accountIcon.onclick = ()=>{
        if(accountOptionsShow) closeAccountOptions();
        else{
            accountOptionsShow = true;
            accountDropDown.style.animation = "show-account-options ease-in-out 0.2s";
            accountDropDown.style.display = "block";
            accountDropDown.onanimationend = ()=>{
                accountDropDown.style.animation = "none";
                accountDropDown.onanimationend = null;
                window.addEventListener("click", closeAccountOptions);
            }
        }
    }
    accountAboutMe.onclick = ()=>{
        sendInteruptEvent();
        const closeTabsEvent = new Event("close-all-tabs");
        window.dispatchEvent(closeTabsEvent);
        closeAccountOptions();
        document.querySelector("#about-me-screen").style.display = "block";
    }
    accountLogOff.onclick = ()=>{
        sendInteruptEvent();
        console.log("log off");
    }

    window.addEventListener("interupt-close-account", ()=>{
        eventInterupted = true;
    });
    function closeAccountOptions(){
        setTimeout(()=>{
            if(eventInterupted) eventInterupted = false;
            else{
                window.removeEventListener("click", closeAccountOptions);
                accountOptionsShow = false;
                accountDropDown.style.animation = "hide-account-options ease-in-out 0.2s";
                accountDropDown.onanimationend = ()=>{
                    accountDropDown.style.animation = "none";
                    accountDropDown.style.display = "none";
                    accountDropDown.onanimationend = null;
                }
            }
        }, 100);
    }
    function sendInteruptEvent(){
        const interuptEvent = new Event("interupt-close-account");
        window.dispatchEvent(interuptEvent);
    }
}
function headTabLogic(){
    const screens = ["dahsboard-screen", "mail-screen", "calendar-screen", "drive-screen", "students-screen", "homework-screen"];
    const displayTypes = ["flex", "block", "block", "block", "block", "block"];
    const tabs = document.querySelectorAll(".tab");

    let currTab = 0;
    for(let i = 0; i < tabs.length; i++){
        tabs[i].onclick = ()=>{
            if(currTab !== i){
                const screensToClose = document.querySelector("#main").children;
                for(let j = 0; j < screensToClose.length; j++) screensToClose[j].style.display = "none";
                document.getElementById(screens[i]).style.display = displayTypes[i];
               
                if(currTab !== -1){
                    const currSelectedTab = document.querySelector(".selected-tab");
                    currSelectedTab.classList.remove("selected-tab");
                }
                tabs[i].classList.add("selected-tab");
                currTab = i;
            }
        }
    }
    window.addEventListener("close-all-tabs", ()=>{
        if(currTab !== -1){
            const currSelectedTab = document.querySelector(".selected-tab");
            currSelectedTab.classList.remove("selected-tab");
        }
        const screensToClose = document.querySelector("#main").children;
        for(let j = 0; j < screensToClose.length; j++) screensToClose[j].style.display = "none";
        currTab = -1;
    });
}

/*--Assistant Logic----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadAssistantLogic(client){
    const assistantClose  = document.querySelector(".assistant-window-close");
    const assistantButton = document.querySelector(".assistant-button");
    const assistantWindow = document.querySelector(".assistant-window");
    const assistantInput  = document.querySelector(".assistant-input");
    const assistantSend   = document.querySelector(".assistant-send");
    assistantInput.value = "";
    clearAsisstantChat();

    assistantButton.onclick = ()=>{
        assistantWindow.style.animation = "assistant-window-slide-in ease-in-out 0.2s forwards";
        assistantInput.value = "";
    }
    assistantClose.onclick = ()=>{
        assistantWindow.style.animation = "assistant-window-slide-out ease-in-out 0.2s forwards";
        assistantInput.value = "";
    }
    assistantSend.onclick = ()=>{
        if(assistantInput.value !== ""){
            client.emit("new-chatgpt-message", assistantInput.value);
            addMessage(false, false, assistantInput.value);
            assistantInput.value = "";
            startThinking();
        }
    }

    client.on("chatgpt-message-error", (error)=>{
        console.log(error);
        stopThinking("AI Error");
    });
    client.on("chatgpt-message", (message)=>{
        stopThinking(message);
    });
}
function clearAsisstantChat(){
    const messageList = document.querySelector(".assistant-messages-list");
    while(messageList.children.length > 0) messageList.removeChild(messageList.lastChild);
    addMessage(true, false, "Hi. I'm your personal AI assistant. How can I help you today?");
}
function startThinking(){
    const assistantInput  = document.querySelector(".assistant-input");
    const assistantSend   = document.querySelector(".assistant-send");
    assistantInput.disabled = true;
    assistantSend.disabled = true;
    addMessage(true, true, "");
}
function stopThinking(message){
    const assistantInput  = document.querySelector(".assistant-input");
    const assistantSend   = document.querySelector(".assistant-send");
    assistantInput.disabled = false;
    assistantSend.disabled = false;
    
    const thinkingBubble = document.querySelector("#thinking-bubble");
    thinkingBubble.style.animation = "fade-out ease-in-out 0.2s forwards";
    thinkingBubble.onanimationend = ()=>{
        addMessage(true, false, message);
        thinkingBubble.remove();
    }
}
function addMessage(bot, thinkingBubble, message){
    const messageWindow = document.querySelector(".assistant-window-body");
    const messageList = document.querySelector(".assistant-messages-list");
    const newMessage = document.createElement("div");
    const newMessageBody = document.createElement("div");

    newMessage.className = "assistant-message";
    newMessageBody.className = "assistant-message-body";
    newMessageBody.innerText = message;

    if(bot){
        newMessage.classList.add("bot-message");
        newMessageBody.classList.add("bot-message-body");
    }
    if(thinkingBubble){
        newMessage.id = "thinking-bubble";
        newMessageBody.innerText = "";
        const thinkingDotHolder = document.createElement("div");
        thinkingDotHolder.className = "assistant-message-thinking-dot-holder";
        newMessageBody.appendChild(thinkingDotHolder);

        for(let i = 0; i < 3; i++){
            const thinkingDot = document.createElement("div");
            thinkingDot.className = "assistant-message-thinking-dot";
            thinkingDot.style.animationDelay = (i*0.25)+"s";
            thinkingDotHolder.appendChild(thinkingDot);
        }
    }

    newMessage.appendChild(newMessageBody);
    messageList.insertBefore(newMessage, messageList.firstChild);
    messageWindow.scrollTop = messageWindow.scrollHeight;
}
