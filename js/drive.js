function loadDriveLogic(){
    const filterSelect = document.querySelector(".filter-select");
    filterSelect.value = "none"

    const filter = document.querySelector(".filter");
    const filterWindow = document.querySelector(".filter-window-holder");
    filter.onclick = ()=>{
        filterWindow.style.animation = "filter-window-fade-in ease-in-out 0.1s";
        filterWindow.style.display = "block";
    }

    const filterCancel = document.querySelector("#filter-cancel");
    filterCancel.onclick = ()=>{
        filterWindow.style.animation = "filter-window-fade-out ease-in-out 0.1s";
        filterWindow.onanimationend = ()=>{
            filterWindow.style.animation = "none";
            filterWindow.style.display = "none";
            filterWindow.onanimationend = null;
        }
    }
}