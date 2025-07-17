/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadPaymentLogic(client, userID, subscription){
    document.querySelector("#buy-advanced").onclick = async ()=>{requestPayment(userID, "advanced")}
    document.querySelector("#buy-basic").onclick = async ()=>{requestPayment(userID, "basic")}
    document.querySelector(".plan-info").onclick = ()=>{
        fadeIn(".plan-info-window", 0.1, "block", ()=>{
            window.addEventListener("click", closePaymentMoreInfo);
        });
    }
    switch(subscription){
        default:break;
        case 1: subscriptionBasicEditDOM(client, userID); break;
        case 2: subscriptionAdvancedEditDOM(client, userID); break;
    }
   
    client.on("payment-fail", (type)=>{
        const errorTexts = [
            "User not found",
            "User doesn't exist",
            "User payID update error",
            "Invalid payID",
            "Cancel subscription error",
            "Cancel old subscription error"
        ];
        console.error(errorTexts[type]);
        notification(errorTexts[type]);
    });
    client.on("cancel-subscription-success", ()=>{
        notification("Subscription Caneled");
        setTimeout(()=>{window.location.reload()}, 2000);
    });
}
function closePaymentMoreInfo(){
    window.removeEventListener("click", closePaymentMoreInfo);
    fadeOut(".plan-info-window", 0.1, null);
}
async function requestPayment(userID, type){
    const response = await fetch("/subscription", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({userID:userID, subscription:type})
    });
    const data = await response.json();
    window.location.href = data.url;
}

/*--Subscription DOM Manipulation--------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function subscriptionBasicEditDOM(client, userID){
    document.querySelector("#buy-basic").remove();
    addCancelSubscription(client, userID);

    const planDivider = document.querySelectorAll(".plan-divider")[0];
    const plan = document.querySelectorAll(".plan")[0];
    const owned = document.createElement("div");
    owned.className = "plan-owned";
    owned.innerText = "Active";
    plan.insertBefore(owned, planDivider);
}
function subscriptionAdvancedEditDOM(client, userID){
    document.querySelector("#buy-advanced").remove();
    document.querySelector("#buy-basic").remove();
    addCancelSubscription(client, userID);

    const planDividers = document.querySelectorAll(".plan-divider");
    const plans = document.querySelectorAll(".plan");

    const pad = document.createElement("div");
    pad.className = "plan-pad";
    plans[0].insertBefore(pad, planDividers[0]);

    const owned = document.createElement("div");
    owned.className = "plan-owned";
    owned.innerText = "Active";
    plans[1].insertBefore(owned, planDividers[1]);
}
function addCancelSubscription(client, userID){
    const accountDropDownWindow = document.querySelector(".account-drop-down-window");
    const lastChild = accountDropDownWindow.children[accountDropDownWindow.children.length-1];
    const cancelSub = document.createElement("div");
    cancelSub.className = "account-drop-down-row";
    cancelSub.innerText = "Cancel Subscription";
    accountDropDownWindow.insertBefore(cancelSub, lastChild);

    const allDropRows = document.querySelectorAll(".account-drop-down-row");
    for(let i = 0; i < allDropRows.length; i++ ) allDropRows[i].style.width = "11rem";

    cancelSub.onclick = ()=>{
        if(confirm("Are you sure you want to cancel the subscription?\nThis will restrict the access to the website and its features"))
            client.emit("cancel-subscription", userID);
    }
}

/*--Verify Payment-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function initVerifyPayment(success){
    document.querySelector(".payment-return").onclick = ()=>{window.location.href = "/"}

    const params = new URLSearchParams(window.location.search);
    const subscription = params.get("subscription");
    const sessionID = params.get("session_id");
    const userID = params.get("userID");
    const payID = params.get("payID");

    if(!subscription || !userID || !payID){
        if(success) switchToFail();
        alert("Invalid URL");
        return;
    }
    let currSubscription;
    const subscriptionTypes = ["basic", "advanced"];
    for(let i = 0; i < subscriptionTypes.length; i++){
        if(subscriptionTypes[i] === subscription){
            currSubscription = i + 1;
            break;
        }
    }
    if(!currSubscription){
       switchToFail();
       alert("Invalid URL");
       return;
    }

    fetch("/verify-subscription", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({userID:userID, payID:payID, success:success, subscription:currSubscription, sessionID:sessionID})
    })
    .then((result)=>{
        if(result.ok) setTimeout(()=>{window.location.href = "/"}, 5000);
    })
    .catch(error => console.log(error))
}
function switchToFail(){
    const currURL = window.location.href;
    const index = currURL.indexOf("/pages");
    if(index !== -1) window.location.href = currURL.slice(0, index + 6) + "/payment_fail.html";
}
