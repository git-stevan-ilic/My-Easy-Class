/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
window.onload = initLoad;

function initLoad(){
    const client = io();

    //loadAssistantLogic();
    loadLogInLogic(client);
    loadHeadLogic();

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
        notification("Link Error");
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
    const tabs = document.querySelectorAll(".tab");

    let currTab = 0;
    for(let i = 0; i < tabs.length; i++){
        tabs[i].onclick = ()=>{
            if(currTab !== i){
                const screensToClose = document.querySelector("#main").children;
                for(let j = 0; j < screensToClose.length; j++) screensToClose[j].style.display = "none";
                document.getElementById(screens[i]).style.display = "block";
               
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
        const screensToClose = document.querySelector("#main").children;
        for(let j = 0; j < screensToClose.length; j++) screensToClose[j].style.display = "none";
        currTab = -1;

        const currSelectedTab = document.querySelector(".selected-tab");
        currSelectedTab.classList.remove("selected-tab");
    });
}

/*--Assistant Logic----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadAssistantLogic(){
    const assistantClose  = document.querySelector(".assistant-window-close");
    const assistantButton = document.querySelector(".assistant-button");
    const assistantWindow = document.querySelector(".assistant-window");

    assistantButton.onclick = ()=>{assistantWindow.style.animation = "assistant-window-slide-in ease-in-out 0.2s forwards"}
    assistantClose.onclick = ()=>{assistantWindow.style.animation = "assistant-window-slide-out ease-in-out 0.2s forwards"}
}