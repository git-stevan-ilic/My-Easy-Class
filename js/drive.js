/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadDriveLogic(client){
    const filter = document.querySelector(".filter");
    const filterWindow = document.querySelector(".filter-window-holder");
    filter.onclick = ()=>{
        filterWindow.style.animation = "filter-window-fade-in ease-in-out 0.1s";
        filterWindow.style.display = "block";
    }

    const driveUpload = document.querySelector("#drive-upload");
    const driveFileUpload = document.querySelector("#drive-file-upload");
    driveUpload.onclick = ()=>{driveFileUpload.click()}
    driveFileUpload.oninput = ()=>{uploadFile()}

    let driveFiles = [], currFilter = "none", currSearch = "";
    const filterSelect = document.querySelector(".filter-select");
    const filterCancel = document.querySelector("#filter-cancel");
    const filterSave = document.querySelector("#filter-save");
    filterSelect.value = "none";

    function closeFilterWindow(callback){
        filterWindow.style.animation = "filter-window-fade-out ease-in-out 0.1s";
        filterWindow.onanimationend = ()=>{
            filterWindow.style.animation = "none";
            filterWindow.style.display = "none";
            filterWindow.onanimationend = null;
            if(callback) callback();
        }
    }
    filterCancel.onclick = ()=>{
        closeFilterWindow(()=>{
            filterSelect.value = currFilter;
        });
    }
    filterSave.onclick = ()=>{
        closeFilterWindow(()=>{
            let filterDisplay = "";
            switch(filterSelect.value){
                default:      filterDisplay = "None"; break;
                case "none":  filterDisplay = "None"; break;
                case "pdf":   filterDisplay = "PDF"; break;
                case "doc":   filterDisplay = "Document"; break;
                case "image": filterDisplay = "Image"; break;
                case "video": filterDisplay = "Video"; break;
            }

            currFilter = filterSelect.value;
            filter.innerText = "Filter: "+filterDisplay;
            generateDriveData(driveFiles, currFilter, currSearch);
        });
    }

    const driveSearch = document.querySelector("#drive-search");
    const searchIcon = document.querySelector("#drive-search-icon");
    driveSearch.value = "";
    driveSearch.oninput = ()=>{
        currSearch = driveSearch.value;
        generateDriveData(driveFiles, currFilter, currSearch);
    }
    searchIcon.onclick = ()=>{
        currSearch = driveSearch.value;
        generateDriveData(driveFiles, currFilter, currSearch);
    }

    getDriveFiles().then((files)=>{
        generateDriveData(files, currFilter, currSearch);
        driveFiles = files;
    });
    document.addEventListener("reload-drive-files", ()=>{
        getDriveFiles().then((files)=>{
            generateDriveData(files, currFilter, currSearch);
            driveFiles = files;
        });
    });
    client.on("google-drive-error", error => console.log(error));
}
async function getDriveFiles(){
    const response = await fetch("/api/drive-list");
    const files = await response.json();
    return files;
}

/*--Generate Drive Data------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateDriveData(files, filter, fileName){
    let allDates = [];
    for(let i = 0; i < files.length; i++){
        let fileFormat = "";
        if(files[i].mimeType.indexOf(".document") !== -1) fileFormat = "document";
        if(files[i].mimeType.indexOf("image") !== -1) fileFormat = "image";
        if(files[i].mimeType.indexOf("video") !== -1) fileFormat = "video";
        if(files[i].mimeType.indexOf("pdf") !== -1) fileFormat = "pdf";

        let filterCondition;
        switch(filter){
            default:      filterCondition = fileFormat !== "";         break;
            case "none":  filterCondition = fileFormat !== "";         break;
            case "pdf":   filterCondition = fileFormat === "pdf";      break;
            case "doc":   filterCondition = fileFormat === "document"; break;
            case "image": filterCondition = fileFormat === "image";    break;
            case "video": filterCondition = fileFormat === "video";    break;
        }

        let searchCondition = true;
        if(fileName !== ""){
            const searchParam = fileName.toLowerCase();
            const fileTitle = files[i].name.toLowerCase();
            searchCondition = fileTitle.indexOf(searchParam) !== -1;
        }
        
        if(filterCondition && searchCondition){
            files[i].convertedSize = convertByteSize(files[i].size);
            files[i].fileFormat = fileFormat;

            const date = new Date(files[i].modifiedTime);
            const d = JSON.stringify(date.getDate());
            const m = JSON.stringify(date.getMonth()+1);
            const y = JSON.stringify(date.getFullYear());
            const dateText = d + "/" + m + "/" + y;
    
            let dateFound = false;
            for(let j = 0; j < allDates.length; j++){
                if(allDates[j].date === dateText){
                    allDates[j].files.push(files[i]);
                    dateFound = true;
                    break;
                }
            }
            if(!dateFound){
                allDates.push({
                    date:dateText,
                    files:[files[i]]
                });
            }
        }
    }
    generateDriveElements(allDates);
}
function convertByteSize(bytes){
    const units = ["bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let l = 0, n = parseInt(bytes, 10) || 0;
    while(n >= 1024 && ++l) n = n / 1024;
    return(n.toFixed(n < 10 && l > 0 ? 1 : 0) + ' ' + units[l]);
}

/*--Generate Drive Elements--------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateDriveElements(dates){
    const driveBody = document.querySelector(".drive-body");
    while(driveBody.children.length > 0) driveBody.removeChild(driveBody.lastChild);

    if(dates.length === 0){
        const noFiles = document.createElement("div");
        noFiles.className = "no-files";
        noFiles.innerText = "No files";
        driveBody.appendChild(noFiles);
    }
    else{
        for(let i = 0; i < dates.length; i++){
            const divider = generateDriveDivider(dates[i].date);
            const holder = generateDriveHolder(dates[i].files);
            driveBody.appendChild(divider);
            driveBody.appendChild(holder);
        }
    }
}
function generateDriveDivider(date){
    const divivderLineSmall = document.createElement("div"); 
    const divivderLineBig = document.createElement("div"); 
    const dividerDate = document.createElement("div");
    const divider = document.createElement("div"); 

    divivderLineSmall.className = "drive-divider-line-small";
    divivderLineBig.className = "drive-divider-line-big";
    dividerDate.className = "drive-divider-date";
    divider.className = "drive-divider";

    dividerDate.innerText = date;
    divider.appendChild(divivderLineSmall);
    divider.appendChild(dividerDate);
    divider.appendChild(divivderLineBig);
    return divider;
}
function generateDriveHolder(files){
    const holder = document.createElement("div");
    holder.className = "drive-holder";

    for(let i = 0; i < files.length; i++){
        const driveItemImage = document.createElement("div");
        const driveItemTitle = document.createElement("div");
        const driveItemInfo = document.createElement("div");
        const driveItem = document.createElement("div");

        driveItemImage.className = "drive-item-image";
        driveItemTitle.className = "drive-item-title";
        driveItemInfo.className = "drive-item-info";
        driveItem.className = "drive-item";
       
        driveItem.id = "file-"+files[i].id;
        driveItemTitle.innerText = files[i].name;
        driveItemInfo.innerText = files[i].convertedSize;
        if(files[i].thumbnailLink){
            driveItemImage.style.backgroundImage = "url('"+files[i].thumbnailLink+"')";
            driveItemImage.style.backgroundSize = "contain";
        }

        driveItem.appendChild(driveItemImage);
        driveItem.appendChild(driveItemTitle);
        driveItem.appendChild(driveItemInfo);
        holder.appendChild(driveItem);

        driveItem.onclick = ()=>{displayFile(files[i].id, files[i].name, files[i].mimeType)}
    }
    return holder;
}

/*--File Manipulation--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
async function displayFile(fileId, fileName, mimeType){
    try{
        const fileDisplayBody = document.querySelector(".file-display-body");
        const downloadButton = document.querySelector("#file-display-download");
        const deleteButton = document.querySelector("#file-display-delete");
        document.querySelector(".file-display-title").innerText = fileName;
        document.querySelector(".file-display-close").onclick = ()=>{
            fadeOut(".file-display", 0.1, ()=>{
                while(fileDisplayBody.children.length > 0){
                    fileDisplayBody.removeChild(fileDisplayBody.lastChild);
                }
            });
            downloadButton.onclick = null;
            deleteButton.onclick = null;
        }
        downloadButton.onclick = ()=>{downloadFile(fileId, fileName)}
        deleteButton.onclick = ()=>{deleteFile(fileId)}
       
        while(fileDisplayBody.children.length > 0) fileDisplayBody.removeChild(fileDisplayBody.lastChild);
        const url = "/api/drive-file-content/"+fileId;
        if(mimeType === "application/vnd.google-apps.document"){
            const response = await fetch(url);
            const html = await response.text();

            const displayText = document.createElement("div");
            displayText.className = "file-display-text";
            fileDisplayBody.appendChild(displayText);
            displayText.innerHTML = DOMPurify.sanitize(html);
        }
        else if(mimeType === "application/pdf"){
            fileDisplayBody.innerHTML = `
            <iframe 
                src="/api/drive-file-content/${fileId}"
                class="content-pdf"
            ></iframe>`;
        }
        else if(mimeType.startsWith("image/")){
            fileDisplayBody.innerHTML = "<img src="+url+" class='content-image'>";
        }
        else if(mimeType.startsWith("video/")){
            fileDisplayBody.innerHTML = `
            <video controls class="content-video">
              <source src="${url}" type="${mimeType}">
            </video>`;
        }
        fadeIn(".file-display", 0.1);
    }
    catch(error){
        console.log(error);
        const fileDisplayBody = document.querySelector(".file-display-body");
        fileDisplayBody.innerHTML = "<div class='file-display-error'>Failed to load content</div>";
    }
}
async function downloadFile(fileId, fileName){
    const downloadNotification = document.querySelector(".download-notification");
    let downloadAnim, dotNum = 1;
    fadeIn(".download-notification", 0.1, "flex", ()=>{
        clearInterval(downloadAnim);
        downloadAnim = setInterval(()=>{
            downloadNotification.innerText = "Downloading";
            for(let i = 0; i < dotNum; i++) downloadNotification.innerText += ".";
            dotNum++;
            if(dotNum > 3) dotNum = 1;
        }, 150);
    });

    fetch(`/api/drive-download/${fileId}`)
    .then(response => {
        if(!response.ok) throw new Error("Network error\nFailed file download");
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        fadeOut(".download-notification", 0.1, ()=>{
            clearInterval(downloadAnim);
        });
    })
    .catch(error => {
        console.error("Download failed:", error);
    });
}
async function deleteFile(fileId){
    if(!confirm("Are you sure you want to delete this file?")) return;
    try{
        const response = await fetch(`/api/drive-delete/${fileId}`, {method:"DELETE"});
        const result = await response.json();
        if(!result.success) alert("Failed to delete file");
        else{
            const deletedElement = document.getElementById("file-"+fileId);
            const holder = deletedElement.parentElement;
            deletedElement.remove();
            if(holder.children.length === 0){
                holder.previousElementSibling.remove();
                holder.remove();
            }
            fadeOut(".file-display", 0.1);
        }
    }
    catch(error){
        console.log("Deletion failed", error);
    }
}
async function uploadFile(){
    const driveFileUpload = document.querySelector("#drive-file-upload");
    const file = driveFileUpload.files[0];
    if(!file){
        alert("File invalid");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);
    try{
        const response = await fetch("/api/drive-upload", {method:"POST", body:formData});
        const result = await response.json();
        if(!result.success)  alert("Upload file error");
        else{
            alert("File uploaded");
            const reloadDriveFiles = new Event("reload-drive-files");
            document.dispatchEvent(reloadDriveFiles);
        }
    }
    catch(error){
        alert("Upload file error");
        console.error("Upload error:", error);
    }
}