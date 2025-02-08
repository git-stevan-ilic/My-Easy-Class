/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadLogInLogic(){
    const rememberMeCheck = document.querySelector("#remember-me-check");
    let rememberMe = false;

    rememberMeCheck.onclick = ()=>{
        if(!rememberMe){
            fadeIn("#remember-me-check-mark", 0.1, "flex");
            rememberMe = true;
        }
        else{
            fadeOut("#remember-me-check-mark", 0.1);
            rememberMe = false;
        }
    }

    const loginHolder = document.querySelector("#login-holder");
    const signUpHolder = document.querySelector("#sign-up-holder");
    const signinScreen = document.querySelector("#signin-screen");
    const signinWindow = document.querySelector(".signin-window");
    const loginScreen = document.querySelector("#login-screen");
    const loginWindow = document.querySelector(".login-window");

    /*document.querySelector("#open-sign-up").onclick = ()=>{
        signUpHolder.style.display = "none";
        loginHolder.style.display = "flex";

        loginWindow.style.animation = "fade-out-scale ease-in-out 0.1s";
        loginWindow.onanimationend = ()=>{
            loginWindow.style.animation = "none";
            loginScreen.style.display = "none";
            loginWindow.onanimationend = null;

            signinScreen.style.display = "block";
            signinWindow.style.animation = "fade-in-scale ease-in-out 0.1s";
            signinWindow.onanimationend = ()=>{
                signinWindow.style.animation = "none";
                signinWindow.onanimationend = null;
            }
        }
    }*/
    /*document.querySelector("#open-login").onclick = ()=>{
        signUpHolder.style.display = "flex";
        loginHolder.style.display = "none";

        signinWindow.style.animation = "fade-out-scale ease-in-out 0.1s";
        signinWindow.onanimationend = ()=>{
            signinWindow.style.animation = "none";
            signinScreen.style.display = "none";
            signinWindow.onanimationend = null;

            loginScreen.style.display = "block";
            loginWindow.style.animation = "fade-in-scale ease-in-out 0.1s";
            loginWindow.onanimationend = ()=>{
                loginWindow.style.animation = "none";
                loginWindow.onanimationend = null;
            }
        }
    }*/
}