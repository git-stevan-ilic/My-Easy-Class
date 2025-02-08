/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
window.onload = initLoad;

function initLoad(){
    loadLogInLogic();
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