/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadDriveLogic(){
    const filter = document.querySelector(".filter");
    const filterWindow = document.querySelector(".filter-window-holder");
    filter.onclick = ()=>{
        filterWindow.style.animation = "filter-window-fade-in ease-in-out 0.1s";
        filterWindow.style.display = "block";
    }

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
    const searchIcon = document.querySelector(".search-icon");
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
       
        driveItemTitle.innerText = files[i].name;
        driveItemInfo.innerText = files[i].convertedSize;
        /*if(files[i].thumbnailLink){
            driveItemImage.style.backgroundImage = "url('"+files[i].thumbnailLink+"')";
        }*/

        driveItem.appendChild(driveItemImage);
        driveItem.appendChild(driveItemTitle);
        driveItem.appendChild(driveItemInfo);
        holder.appendChild(driveItem);

        driveItem.onclick = ()=>{
            console.log(files[i])
        }
    }

    return holder;
}