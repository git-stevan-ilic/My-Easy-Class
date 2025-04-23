/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadAboutMeLogic(user){
    let cvFile = undefined, newImage = undefined;
    document.querySelector("#about-me-send-email").onclick = ()=>{
        const tabHolder = document.querySelector(".tab-holder");
        const newEmail = document.querySelector("#new-email");
        tabHolder.children[1].click();
        newEmail.click();

        const emailValue = user.emails[0].value;
        document.querySelector("#send-mail-recipients").value = emailValue;
    }
    document.querySelector(".about-me-share").onclick = ()=>{
        notification("Link copied");
    }
    document.querySelector("#about-me-cv").onclick = ()=>{
        if(!cvFile) alert("No CV present");
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
        editIcon.style.backgroundImage = "url('"+user.photos[0].value+"')";
        const editData = {
            description:user.description || "Description not provided",
            education:user.education || "Not provided",
            location:user.location || "Not provided",
            name:user.displayName || "Not provided",
            history:user.history || "Not provided",
            job:user.job || "Not provided",
        };

        inputN.value = editData.name;
        inputJ.value = editData.job;
        inputL.value = editData.location;
        inputE.value = editData.education;
        inputH.value = editData.history;
        inputD.value = editData.description;

        fadeIn("#about-me-edit-screen", 0.1, "block");
    }
    document.querySelector("#about-me-edit-save").onclick = ()=>{
        user.desc = inputD.value || "Description not provided";
        user.displayName = inputN.value || user.displayName;
        user.location = inputL.value || "Not provided";
        user.education = inputE.value || "Not provided";
        user.history = inputH.value || "Not provided";
        user.job = inputJ.value || "Not provided";
        if(inputC.files.length > 0) cvFile = inputC.files[0];
        if(newImage){
            user.photos[0].value = newImage;
            const userIcons = document.querySelectorAll(".user-icon");
            for(let i = 0; i < userIcons.length; i++) userIcons[i].style.backgroundImage = "url('"+user.photos[0].value+"')";
        }
      
        document.querySelector("#about-me-education").innerText = user.education;
        document.querySelector(".about-me-name").innerText = user.displayName;
        document.querySelector("#about-me-location").innerText = user.location;
        document.querySelector("#about-me-history").innerText = user.history;
        document.querySelector("#about-me-desc").innerText = user.desc;
        document.querySelector("#about-me-job").innerText = user.job;
        document.querySelector("#about-me-edit-cancel").click();
    }
    document.querySelector("#about-me-edit-cancel").onclick = ()=>{
        fadeOut("#about-me-edit-screen", 0.1, ()=>{
            newImage = undefined;
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
                newImage = e.target.result;
                editIcon.style.backgroundImage = "url('"+e.target.result+"')";
            }
            reader.readAsDataURL(inputI.files[0]);
        }
    }
}