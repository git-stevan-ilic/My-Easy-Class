/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadLogInLogic(client){
    switchLoginSignin();
    googleLogin(client);

    let rememberMe = false;
    const rememberMeCheck = document.querySelector("#remember-me-check");
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
}
function switchLoginSignin(){
    const loginHolder = document.querySelector("#login-holder");
    const signUpHolder = document.querySelector("#sign-up-holder");
    const signinScreen = document.querySelector("#signin-screen");
    const signinWindow = document.querySelector(".signin-window");
    const loginScreen = document.querySelector("#login-screen");
    const loginWindow = document.querySelector(".login-window");

    document.querySelector("#open-sign-up").onclick = ()=>{
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
    }
    document.querySelector("#open-login").onclick = ()=>{
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
    }
}

/*--Google Login Logic-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function googleLogin(client){
    const accountLogOff = document.querySelector("#account-log-off");
    const signinGoogle = document.querySelector(".signin-google");
    const icon = document.querySelector(".account-icon");

    signinGoogle.onclick = ()=>{client.emit("google-log-in")}
    client.on("google-redirect", (url)=>{window.location.href = url});
    client.on("google-status", (user)=>{
        if(user){
            document.querySelector("#dahsboard-screen").style.display = "block";
            if(user.photos.length > 0){
                document.querySelector(".dashboard-account-image").style.backgroundImage = "url('"+user.photos[0].value+"')";
                document.querySelector(".about-me-image").style.backgroundImage = "url('"+user.photos[0].value+"')";
                icon.style.backgroundImage = "url('"+user.photos[0].value+"')";
            }
            fadeOut(".pre-main-head", 0.1, ()=>{fadeIn(".main-head", 0.1, "flex")});
            fadeOut("#pre-main", 0.1, ()=>{fadeIn("#main", 0.1, "block")});
            accountLogOff.onclick = ()=>{client.emit("google-log-out")}
            loadAboutMeLogic(user);
            loadDriveLogic(client);
            loadMailLogic();
            loadCalendar();

            document.querySelector(".about-me-name").innerText = user.displayName;
            document.querySelector(".about-me-email").innerText = user.emails[0].value;
            document.querySelector(".dashboard-account-name").innerText = user.displayName;
            document.querySelector(".dashboard-account-email").innerText = user.emails[0].value;
            document.querySelector(".dashboard-account-desc").innerText = "No description provided";
            console.log(user);
        }
        else{
            icon.style.backgroundImage = "url('../assets/icons/default user.png')";
            fadeOut(".main-head", 0.1, ()=>{fadeIn(".pre-main-head", 0.1, "flex")});
            fadeOut("#main", 0.1, ()=>{fadeIn("#pre-main", 0.1, "block")});
            accountLogOff.onclick = null;
        }
    });
}