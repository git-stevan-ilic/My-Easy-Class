/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadAboutMeLogic(user){
    document.querySelector("#about-me-send-email").onclick = ()=>{
        const tabHolder = document.querySelector(".tab-holder");
        const newEmail = document.querySelector("#new-email");
        tabHolder.children[1].click();
        newEmail.click();

        const emailValue = user.emails[0].value;
        document.querySelector("#send-mail-recipients").value = emailValue;
    }
}