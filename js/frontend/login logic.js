/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadLogInLogic(client){
    editPasswordLogic(client);
    switchLoginSignin(client);
    rememberMeLogic(client);
    googleLogin(client);
    zoomLogic(client);

    client.on("user-log-in-fail", (errorType)=>{
        const errorTexts = [
            "Database Error",
            "User not found",
            "Password is incorrect",
            "Session save error",
            "No session"
        ];
        document.querySelector("#log-in").disabled = false;
        console.error("User login error: "+errorTexts[errorType]);
        if(errorType === 4) localStorage.setItem("my-easy-class-session-id", "");
        else notification("User login error: "+errorTexts[errorType]);
    });
    client.on("user-log-in-success", (userData, requestPassword)=>{
        logIn(client, userData, requestPassword);
    });
    client.on("user-register-fail", (errorType)=>{
        const errorTexts = [
            "Database Error",
            "User already exists",
            "Classes Creation Error"
        ];
        document.querySelector("#sign-in-confirm").disabled = false;
        console.error("User register error: "+errorTexts[errorType]);
        notification("User register error: "+errorTexts[errorType]);
    });
    client.on("user-register-success", (userData)=>{
        const signinScreen = document.querySelector("#sign-in-screen");
        const loginScreen  = document.querySelector("#log-in-screen");
        const signinName = document.querySelector("#sign-in-name");
        const signinEmail = document.querySelector("#sign-in-email");
        const signinPassword1 = document.querySelector("#sign-in-password-1");
        const signinPassword2 = document.querySelector("#sign-in-password-2");
        signinName.value = "";
        signinEmail.value = "";
        signinPassword1.value = "";
        signinPassword2.value = "";
        signinScreen.style.display = "none";
        loginScreen.style.display = "block";

        document.querySelector("#sign-in-confirm").disabled = false;
        notification("Account created");
        logIn(client, userData, false);
    });
}

/*--Log In Logic-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function logOff(client){
    const userIcons = document.querySelectorAll(".user-icon");
    for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = "url('../assets/icons/default user.png')";
    document.querySelector("#account-log-off").onclick = null;
    client.emit("user-log-off");

    localStorage.setItem("my-easy-class-session-id", "null");
    fadeOut(".main-head", 0.1, ()=>{fadeIn(".pre-main-head", 0.1, "flex")});
    fadeOut("#main", 0.1, ()=>{fadeIn("#pre-main", 0.1, "block")});
    fadeOut(".assistant-holder", 0.1);
}
function logIn(client, userData, requestPassword){
    document.querySelector("#log-in-password").value = "";
    document.querySelector("#log-in-email").value = "";
    document.querySelector("#log-in").disabled = false;
    console.log(userData);

    document.querySelector(".dashboard-account-name").innerText = userData.username;
    document.querySelector(".dashboard-account-email").innerText = userData.email;
    document.querySelector(".dashboard-account-desc").innerText = userData.description || "Not provided";
    document.querySelector(".dashboard-account-share").onclick = ()=>{copyURL("userID", userData.userID)}

    document.querySelector(".about-me-name").innerText = userData.username || "";
    document.querySelector(".about-me-email").innerText = userData.email;
    document.querySelector("#about-me-job").innerText = userData.jobTitle || "Not provided";
    document.querySelector("#about-me-location").innerText = userData.location || "Not provided";
    document.querySelector("#about-me-education").innerText = userData.education || "Not provided";
    document.querySelector("#about-me-history").innerText = userData.history || "Not provided";
    document.querySelector("#about-me-desc").innerText = userData.description || "Description not provided";

    document.querySelector("#account-log-off").onclick = ()=>{logOff(client)}
    fadeOut(".pre-main-head", 0.1, ()=>{fadeIn(".main-head", 0.1, "flex")});
    fadeOut("#pre-main", 0.1, ()=>{fadeIn("#main", 0.1, "block")});
    fadeIn(".assistant-holder", 0.1);

    loadPaymentLogic(client, userData.userID, userData.subscription);
    loadStudentsLogic(client, userData.userID, userData.username, userData.googleConnected, userData.zoomConnected);
    loadAboutMeLogic(client, userData);
    loadAssistantLogic(client);
    
    if(!userData.googleConnected) noGoogle(client, userData.userID);
    else{
        loadDriveLogic(client);
        loadMailLogic();
        loadCalendar();
    }

    const rememberMe = getLocalStorage("my-easy-class-remember-me", false, false);
    if(!rememberMe) localStorage.setItem("my-easy-class-session-id", "null");
    else if(userData.sessionID) localStorage.setItem("my-easy-class-session-id", userData.sessionID);

    if(requestPassword) fadeIn("#add-password-screen", 0.1);
    window.addEventListener("send-add-password", (e)=>{
        client.emit("add-password", userData.userID, e.detail.password);
    });
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
    const loginButton = document.querySelector("#log-in")
    loginButton.onclick = ()=>{
        if(loginEmail.value === "" || loginPassword.value === "") notification("Input all fields");
        else{
            loginButton.disabled = true;
            client.emit("user-log-in-attempt", loginEmail.value, loginPassword.value);
        }
    }

    const signinConfirm = document.querySelector("#sign-in-confirm");
    signinConfirm.onclick = ()=>{
        if(signinName.value === "" || signinEmail.value === "" || signinPassword1.value === "" || signinPassword2.value === ""){
            notification("Input all fields");
            return;
        }
        if(!isValidEmail(signinEmail.value)){
            notification("Input a valid email address");
            return;
        }
        if(signinPassword1.value !== signinPassword2.value){
            notification("Passwords don't match");
            return;
        }
        const newAccount = {
            username:signinName.value,
            email:signinEmail.value,
            password:signinPassword1.value
        }
        signinConfirm.disabled = true;
        client.emit("register-new-account", newAccount);
    }
}
function editPasswordLogic(client){
    const editPasswordConfirm = document.querySelector("#add-password-confirm");
    const editPasswordCancel = document.querySelector("#add-password-cancel");
    const editPassword1 = document.querySelector("#add-password-1");
    const editPassword2 = document.querySelector("#add-password-2");
    editPassword1.value = "";
    editPassword2.value = "";

    editPasswordCancel.onclick = ()=>{
        fadeOut("#add-password-screen", 0.1, ()=>{
            editPassword1.value = "";
            editPassword2.value = "";
        });
    }
    editPasswordConfirm.onclick = ()=>{
        if(editPassword1.value === "" || editPassword2.value === "") notification("Input all fields");
        else if(editPassword1.value !== editPassword2.value) notification("Passwords don't match");
        else{
            const eventData = {detail:{password:editPassword1.value}}
            const addPasswordEvent = new CustomEvent("send-add-password", eventData);
            window.dispatchEvent(addPasswordEvent);
            editPasswordConfirm.disabled = true;
        }
    }

    client.on("add-password-fail", (errorType)=>{
        editPasswordConfirm.disabled = false;
        const errorTexts = [
            "User not found",
            "Database save error"
        ];
        console.error("Add password error: "+errorTexts[errorType]);
    });
    client.on("add-password-success", ()=>{
        notification("Passoword saved");
        fadeOut("#add-password-screen", 0.1, ()=>{
            editPasswordConfirm.disabled = false;
            editPassword1.value = "";
            editPassword2.value = "";
        });
    });
}
function googleLogin(client){
    const signinGoogle = document.querySelector(".sign-in-google");
    signinGoogle.onclick = ()=>{client.emit("google-log-in", null)}

    client.on("google-redirect", (url)=>{window.location.href = url});
    client.on("google-status", (user)=>{
        if(user) client.emit("user-log-in", user.emails[0].value);
    });
}
function zoomLogic(client){
    const signinZoom = document.querySelector(".sign-in-zoom");
    signinZoom.onclick = ()=>{client.emit("zoom-log-in", null)}

    client.on("zoom-redirect", (url)=>{window.location.href = url});
    client.on("zoom-status", (user)=>{
        if(user) client.emit("user-log-in", user.email);
    });
}
function copyURL(param, userID){
    const currBaseURL = stripUrlParams(window.location.href);
    const userURL = currBaseURL + "?"+param+"="+userID;

    navigator.clipboard.writeText(userURL)
    .then(()=>{notification("URL copied to clipboard!")})
    .catch(error => {
        notification("Failed to copy URL");
        console.error("Failed to copy: ", error);
    });
}
function noGoogle(client, userID){
    const ids = ["#mail-screen", "#calendar-screen", "#drive-screen"];
    for(let i = 0; i < ids.length; i++){
        const screen = document.querySelector(ids[i]);
        while(screen.children.length > 0) screen.removeChild(screen.lastChild);

        const googleConnectWindow     = document.createElement("div");
        const googleConnectWindowHead = document.createElement("div");
        const googleConnectWindowBody = document.createElement("div");
        const googleConnectButton     = document.createElement("button");

        googleConnectWindow.className     = "google-connect-window";
        googleConnectWindowHead.className = "google-connect-window-head";
        googleConnectWindowBody.className = "google-connect-window-body";
        googleConnectButton.className     = "google-connect-button button";

        googleConnectWindowHead.innerHTML  = "Connect Google Account";
        googleConnectWindowBody.innerHTML  = "This feature requires a Google Account to work<br>";
        googleConnectWindowBody.innerHTML += "Connect your Google Account here<br>";
        googleConnectButton.innerHTML      = "Connect Google";

        googleConnectWindowBody.appendChild(googleConnectButton);
        googleConnectWindow.appendChild(googleConnectWindowHead);
        googleConnectWindow.appendChild(googleConnectWindowBody);
        screen.appendChild(googleConnectWindow);

        googleConnectButton.onclick = ()=>{
            client.emit("google-log-in", userID);
        }
    }
}

/*--Session Logic------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function getLocalStorage(query, defaultValue, string){
    let storageItem;
    try{
        if(string) storageItem = localStorage.getItem(query);
        else storageItem = JSON.parse(localStorage.getItem(query));
        if(!storageItem){
            let defaultValueSaved = defaultValue;
            if(!string) defaultValueSaved = JSON.stringify(defaultValue);
            localStorage.setItem(query, defaultValueSaved);
            storageItem = defaultValue;
        }
    }
    catch{
        let defaultValueSaved = defaultValue;
        if(!string) defaultValueSaved = JSON.stringify(defaultValue);
        localStorage.setItem(query, defaultValueSaved);
        storageItem = defaultValue;
    }
    return storageItem;
}
function rememberMeLogic(client){
    let rememberMe = getLocalStorage("my-easy-class-remember-me", false, false);
    if(rememberMe) document.querySelector("#remember-me-check-mark").style.display = "flex";

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
        localStorage.setItem("my-easy-class-remember-me", JSON.stringify(rememberMe));
    }

    const sessionID = getLocalStorage("my-easy-class-session-id", null, true);
    if(rememberMe) client.emit("session-log-in", sessionID);
}
