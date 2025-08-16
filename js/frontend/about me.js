/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadAboutMeLogic(client, userData){
    let cvFileTemp = null, iconFileTemp = null;
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

    document.querySelector(".about-me-share").onclick = ()=>{copyURL("userID", userData.userID)}
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

    const editIcon = document.querySelector(".edit-window-icon");
    const inputN = document.querySelector("#edit-input-name");
    const inputJ = document.querySelector("#edit-input-job");
    const inputL = document.querySelector("#edit-input-location");
    const inputE = document.querySelector("#edit-input-education");
    const inputH = document.querySelector("#edit-input-history");
    const inputD = document.querySelector("#edit-input-desc");
    const inputC = document.querySelector("#input-cv");
    const inputI = document.querySelector("#input-icon");
   
    document.querySelector("#edit-info").onclick = ()=>{
        const editData = {
            description:userData.description || "Description not provided",
            education:userData.education || "Not provided",
            location:userData.location || "Not provided",
            name:userData.username || "Not provided",
            history:userData.history || "Not provided",
            jobTitle:userData.jobTitle || "Not provided"
        };

        inputN.value = editData.name;
        inputJ.value = editData.jobTitle;
        inputL.value = editData.location;
        inputE.value = editData.education;
        inputH.value = editData.history;
        inputD.value = editData.description;
        inputC.value = "";

        console.log(iconFile)
        if(iconFile === null) editIcon.style.backgroundImage = "url('../assets/icons/default user.png')";
        else{
            const url = URL.createObjectURL(iconFile);
            document.querySelector(".edit-window-icon").style.backgroundImage = `url(${url})`;
        }

        fadeIn("#about-me-edit-screen", 0.1, "block");
    }
    document.querySelector("#about-me-edit-save").onclick = ()=>{
        userData.description = inputD.value || "Description not provided";
        userData.username = inputN.value || userData.username;
        userData.location = inputL.value || "Not provided";
        userData.education = inputE.value || "Not provided";
        userData.history = inputH.value || "Not provided";
        userData.jobTitle = inputJ.value || "Not provided";
        
        document.querySelector("#about-me-education").innerText = userData.education;
        document.querySelector(".about-me-name").innerText = userData.username;
        document.querySelector("#about-me-location").innerText = userData.location;
        document.querySelector("#about-me-history").innerText = userData.history;
        document.querySelector("#about-me-desc").innerText = userData.description;
        document.querySelector("#about-me-job").innerText = userData.jobTitle;
        closeEditProfileWindow(false);

        const dataToSend = {
            email:userData.email,
            username:userData.username,
            jobTitle:userData.jobTitle,
            location:userData.location,
            education:userData.education,
            history:userData.history,
            description:userData.description
        }
        client.emit("update-user-data", dataToSend);

        uploadIcon(userData.userID);
        uploadCV(userData.userID);
        if(iconFileTemp !== null) iconFile = iconFileTemp;
        if(cvFileTemp !== null) cvFile = cvFileTemp;
        iconFileTemp = null;
        cvFileTemp = null;
    }
    document.querySelector("#about-me-edit-cancel").onclick = ()=>{
        closeEditProfileWindow(true);
    }
    editIcon.onclick = ()=>{
        inputI.click();
    }
    inputI.onchange = (e)=>{
        iconFileTemp = e.target.files[0];
        if(!iconFileTemp) return;
        if(inputI.files && inputI.files[0]){
            let reader = new FileReader();
            reader.onload = (e)=>{
                userImage = e.target.result;
                editIcon.style.backgroundImage = "url('"+e.target.result+"')";
            }
            reader.readAsDataURL(inputI.files[0]);
        }
    }
    inputC.onchange = (e)=>{
        cvFileTemp = e.target.files[0];
        if(!cvFileTemp) return;
    }
    window.addEventListener("update-profile-image", ()=>{
        if(iconFile){
            const url = URL.createObjectURL(iconFile);
            const userIcons = document.querySelectorAll(".user-icon");
            for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = `url(${url})`;
        }
    });

    client.on("upload-file-error", (type)=>{
        const errorTexts = [
            "Failed to upload user CV file",
            "Failed to upload user image file"
        ];
        notification(errorTexts[type]);
    });

    function closeEditProfileWindow(resetFiles){
        if(resetFiles){
            iconFileTemp = null;
            cvFileTemp = null;
        }
        fadeOut("#about-me-edit-screen", 0.1, ()=>{
            inputN.value = "";
            inputJ.value = "";
            inputL.value = "";
            inputE.value = "";
            inputH.value = "";
            inputD.value = "";
            inputC.value = "";
        });
    }
}
function loadProfileViewDisplay(userData){
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
    document.querySelector(".about-me-share").onclick = ()=>{copyURL("userID", userData.userID)}
    overwriteTitleMedia();

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

/*--Upload About Me Files----------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
async function uploadCV(userID){
    const inputC = document.querySelector("#input-cv");
    if(inputC.files.length > 0){
        const file = inputC.files[0];
        const formData = new FormData();
        formData.append("cvFile", file);

        try{
            const res = await fetch(`/upload-cv/${userID}`, {
                method:"POST",
                body:formData
            });
            const text = await res.text();
            console.log(text);
            if(res.status !== 200){
                notification("CV upload error");
                return;
            }
        }
        catch(error){
            notification("CV upload failed");
            console.error(error);
        }
    }
}
async function uploadIcon(userID){
    const inputI = document.querySelector("#input-icon");
    if(inputI.files.length > 0){
        const file = inputI.files[0];
        const formData = new FormData();
        formData.append("iconFile", file);

        try{
            const res = await fetch(`/upload-icon/${userID}`, {
                method:"POST",
                body:formData
            });
            const text = await res.text();
            console.log(text);
            if(res.status !== 200){
                notification("Image upload error");
                return;
            }
            const updateProfileImage = new Event("update-profile-image");
            window.dispatchEvent(updateProfileImage);
        }
        catch(error){
            notification("Profile image upload failed");
            console.error(error);
        }
    }
}
