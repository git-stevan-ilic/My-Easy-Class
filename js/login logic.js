/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadLogInLogic(client){
    editPasswordLogic(client);
    switchLoginSignin(client);
    googleLogin(client);

    client.on("user-log-in-fail", (errorType)=>{
        const errorTexts = [
            "Database Error",
            "User not found",
            "Password is incorrect"
        ];
        document.querySelector("#log-in").disabled = false;
        console.error("User login error: "+errorTexts[errorType]);
        alert("User login error: "+errorTexts[errorType]);
    });
    client.on("user-log-in-success", (userData, requestPassword)=>{
        document.querySelector("#log-in-password").value = "";
        document.querySelector("#log-in-email").value = "";
        document.querySelector("#log-in").disabled = false;
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

        document.querySelector("#account-log-off").onclick = ()=>{logOff(client)}
        fadeOut(".pre-main-head", 0.1, ()=>{fadeIn(".main-head", 0.1, "flex")});
        fadeOut("#pre-main", 0.1, ()=>{fadeIn("#main", 0.1, "block")});
        fadeIn(".assistant-holder", 0.1);

        /*loadStudentsLogic(userData.username);
        loadAssistantLogic(client);
        loadAboutMeLogic(userData);
        loadDriveLogic(client);*/
        loadMailLogic();
        //loadCalendar();

         /*
            if(user.photos.length > 0){
                const userIcons = document.querySelectorAll(".user-icon");
                for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = 'url("'+user.photos[0].value+'")';
            }*/

        if(requestPassword) fadeIn("#edit-password-screen", 0.1);
    });
}
function logOff(client){
    const userIcons = document.querySelectorAll(".user-icon");
    for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = "url('../assets/icons/default user.png')";
    document.querySelector("#account-log-off").onclick = null;
    client.emit("user-log-off");

    fadeOut(".main-head", 0.1, ()=>{fadeIn(".pre-main-head", 0.1, "flex")});
    fadeOut("#main", 0.1, ()=>{fadeIn("#pre-main", 0.1, "block")});
    fadeOut(".assistant-holder", 0.1);
}
function switchLoginSignin(client){
    const loginHolder  = document.querySelector("#log-in-holder");
    const signUpHolder = document.querySelector("#sign-up-holder");
    const signinScreen = document.querySelector("#sign-in-screen");
    const signinWindow = document.querySelector(".sign-in-window");
    const loginScreen  = document.querySelector("#log-in-screen");
    const loginWindow  = document.querySelector(".log-in-window");

    const loginEmail = document.querySelector("#log-in-email");
    const loginPassword = document.querySelector("#log-in-password");
    loginEmail.value = "";
    loginPassword.value = "";

    const signinName = document.querySelector("#sign-in-name");
    const signinEmail = document.querySelector("#sign-in-email");
    const signinPassword1 = document.querySelector("#sign-in-password-1");
    const signinPassword2 = document.querySelector("#sign-in-password-2");
    signinName.value = "";
    signinEmail.value = "";
    signinPassword1.value = "";
    signinPassword2.value = "";

    document.querySelector("#open-log-in").onclick = exitSignin;
    document.querySelector("#sign-in-back").onclick = exitSignin;
    document.querySelector("#open-sign-up").onclick = ()=>{
        signUpHolder.style.display = "none";
        loginHolder.style.display = "flex";

        loginWindow.style.animation = "fade-out-scale ease-in-out 0.1s";
        loginWindow.onanimationend = ()=>{
            loginWindow.style.animation = "none";
            loginScreen.style.display = "none";
            loginWindow.onanimationend = null;

            loginEmail.value = "";
            loginPassword.value = "";

            signinScreen.style.display = "block";
            signinWindow.style.animation = "fade-in-scale ease-in-out 0.1s";
            signinWindow.onanimationend = ()=>{
                signinWindow.style.animation = "none";
                signinWindow.onanimationend = null;
            }
        }
    }

    function exitSignin(){
        signUpHolder.style.display = "flex";
        loginHolder.style.display = "none";

        signinWindow.style.animation = "fade-out-scale ease-in-out 0.1s";
        signinWindow.onanimationend = ()=>{
            signinWindow.style.animation = "none";
            signinScreen.style.display = "none";
            signinWindow.onanimationend = null;

            signinName.value = "";
            signinEmail.value = "";
            signinPassword1.value = "";
            signinPassword2.value = "";

            loginScreen.style.display = "block";
            loginWindow.style.animation = "fade-in-scale ease-in-out 0.1s";
            loginWindow.onanimationend = ()=>{
                loginWindow.style.animation = "none";
                loginWindow.onanimationend = null;
            }
        }
    }
    const loginButton = document.querySelector("#log-in");
    loginButton.onclick = ()=>{
        if(loginEmail.value === "" || loginPassword.value === "") alert("Input all fields");
        else{
            loginButton.disabled = true;
            client.emit("user-log-in-attempt", loginEmail.value, loginPassword.value);
        }
    }
}
function editPasswordLogic(client){
    const editPasswordConfirm = document.querySelector("#edit-password-confirm");
    const editPasswordCancel = document.querySelector("#edit-password-cancel");
    const editPassword1 = document.querySelector("#edit-password-1");
    const editPassword2 = document.querySelector("#edit-password-2");
    editPassword1.value = "";
    editPassword2.value = "";

    editPasswordCancel.onclick = ()=>{
        fadeOut("#edit-password-screen", 0.1, ()=>{
            editPassword1.value = "";
            editPassword2.value = "";
        });
    }
    editPasswordConfirm.onclick = ()=>{
        if(editPassword1.value === "" || editPassword2.value === "") alert("Input all fields");
        else if(editPassword1.value !== editPassword2.value) alert("Passwords don't match");
        else{
            client.emit("edit-password", userData.userID, editPassword1.value);
            editPasswordConfirm.disabled = true;
        }
    }

    client.on("edit-password-fail", (errorType)=>{
        editPasswordConfirm.disabled = false;
        const errorTexts = [
            "User not found",
            "Database save error"
        ];
        console.error("Add password error: "+errorTexts[errorType]);
    });
    client.on("edit-password-success", ()=>{
        alert("Passoword saved");
        fadeOut("#edit-password-screen", 0.1, ()=>{
            editPasswordConfirm.disabled = false;
            editPassword1.value = "";
            editPassword2.value = "";
        });
    });
}
function googleLogin(client){
    const signinGoogle = document.querySelector(".sign-in-google");
    signinGoogle.onclick = ()=>{client.emit("google-log-in")}

    client.on("google-redirect", (url)=>{window.location.href = url});
    client.on("google-status", (user)=>{
        if(user){
            console.log(user);
            client.emit("user-log-in", user.emails[0].value);
        }
    });
}

































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
    document.querySelector(".sign-in-zoom").onclick = ()=>{
        connectZoom();
    }
    document.querySelector(".forgot-password").onclick = ()=>{
        notification("Databse error");
    }
    document.querySelector("#log-in").onclick = ()=>{
        notification("Databse error");
    }
    document.querySelector("#sign-in-confirm").onclick = ()=>{
        notification("Databse error");
    }
    document.querySelector("#sign-in-back").onclick = ()=>{
        document.querySelector("#open-login").click();
    }  */