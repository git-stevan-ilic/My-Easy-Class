/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadLogInLogic(client){
    switchLoginSignin();
    googleLogin(client);

    client.on("user-login-fail", (errorType)=>{
        const errorTexts = [
            "Database Error",
            "User not found"
        ];
        console.error("User login error: "+errorTexts[errorType]);
    });
    client.on("user-login-success", (userData)=>{
        console.log(userData);

        document.querySelector(".dashboard-account-name").innerText = userData.username;
        document.querySelector(".dashboard-account-email").innerText = userData.email;
        document.querySelector(".dashboard-account-desc").innerText = userData.description || "Not provided";

        document.querySelector(".about-me-name").innerText = userData.username;
        document.querySelector(".about-me-email").innerText = userData.email;
        document.querySelector("#about-me-job").innerText = userData.jobTitle || "Not provided";
        document.querySelector("#about-me-location").innerText = userData.location || "Not provided";
        document.querySelector("#about-me-education").innerText = userData.education || "Not provided";
        document.querySelector("#about-me-history").innerText = userData.history || "Not provided";
        document.querySelector("#about-me-desc").innerText = userData.description || "Not provided";
    });
















    /*let rememberMe = false;
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
    document.querySelector(".signin-zoom").onclick = ()=>{
        connectZoom();
    }
    document.querySelector(".forgot-password").onclick = ()=>{
        notification("Databse error");
    }
    document.querySelector("#login").onclick = ()=>{
        notification("Databse error");
    }
    document.querySelector("#signin-confirm").onclick = ()=>{
        notification("Databse error");
    }
    document.querySelector("#signin-back").onclick = ()=>{
        document.querySelector("#open-login").click();
    }  */
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

    signinGoogle.onclick = ()=>{client.emit("google-log-in")}
    client.on("google-redirect", (url)=>{window.location.href = url});
    client.on("google-status", (user)=>{
        if(user){
            fadeOut(".pre-main-head", 0.1, ()=>{fadeIn(".main-head", 0.1, "flex")});
            fadeOut("#pre-main", 0.1, ()=>{fadeIn("#main", 0.1, "block")});
            accountLogOff.onclick = ()=>{client.emit("google-log-out")}
            fadeIn(".assistant-holder", 0.1);
            loadAssistantLogic(client);
            loadStudentsLogic(user);
            loadAboutMeLogic(user);
            loadDriveLogic(client);
            loadMailLogic();
            loadCalendar();

            if(user.photos.length > 0){
                const userIcons = document.querySelectorAll(".user-icon");
                for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = 'url("'+user.photos[0].value+'")';
            }
            client.emit("user-login", user.emails[0].value);
            console.log(user);
        }
        else{
            const userIcons = document.querySelectorAll(".user-icon");
            for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = "url('../assets/icons/default user.png')";
            fadeOut(".main-head", 0.1, ()=>{fadeIn(".pre-main-head", 0.1, "flex")});
            fadeOut("#main", 0.1, ()=>{fadeIn("#pre-main", 0.1, "block")});
            fadeOut(".assistant-holder", 0.1);
            accountLogOff.onclick = null;
            client.emit("user-logoff");
        }
    });
}