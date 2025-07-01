/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadAboutMeLogic(client, userData){
    let cvFile = null, fileData = null;
    document.querySelector(".about-me-share").onclick = ()=>{accountURL(userData.userID)}
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
        document.querySelector("#about-me-edit-cancel").click();


        if(inputC.files.length === 0) client.emit("update-user-data", userData, null);
        //else sendFileInChunks(client, cvFile);
       
        /*if(userImage){
            userData.photos[0].value = userImage;
            const userIcons = document.querySelectorAll(".user-icon");
            for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = "url('"+user.photos[0].value+"')";
        }*/    
    }
    document.querySelector("#about-me-edit-cancel").onclick = ()=>{
        fadeOut("#about-me-edit-screen", 0.1, ()=>{
            //userImage = undefined;
            inputN.value = "";
            inputJ.value = "";
            inputL.value = "";
            inputE.value = "";
            inputH.value = "";
            inputD.value = "";
            inputC.value = "";
        });
    }
    editIcon.onclick = ()=>{
        inputI.click();
    }
    inputI.onchange = (e)=>{
        if(inputI.files && inputI.files[0]){
            var reader = new FileReader();
            reader.onload = (e)=>{
                userImage = e.target.result;
                editIcon.style.backgroundImage = "url('"+e.target.result+"')";
            }
            reader.readAsDataURL(inputI.files[0]);
        }
    }
    inputC.onchange = (e)=>{
        cvFile = e.target.files[0];
        if(!cvFile) return;

        const reader = new FileReader();
        reader.onerror = ()=>{console.error("Error reading file")};
        reader.onload = ()=>{
            fileData = {
                fileName:cvFile.name,
                mimeType:cvFile.type,
                data:reader.result
            };
        };
        reader.readAsArrayBuffer(cvFile);
    }

    client.on("upload-file-error", (type)=>{
        const errorTexts = [
            "Failed to upload user CV file",
            "Failed to upload user image file"
        ];
        notification(errorTexts[type]);
    })
}
