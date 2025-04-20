/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadStudentsLogic(){
    let classes = [{name:"All Students", students:[]}, {name:"Ungrouped", students:[]}];
    let classNameSearch = "", currClass = 0;
    generateClasses(classNameSearch, classes);
    generateNewClassLogic();
    addStudentEvents();

    const classSearchIcon = document.querySelector("#class-search-icon");
    const classSearch = document.querySelector("#class-search");
    classSearch.value = "";
    classSearchIcon.onclick = ()=>{
        classNameSearch = classSearch.value;
        generateClasses(classNameSearch, classes);
    }
    classSearch.oninput = ()=>{
        classNameSearch = classSearch.value;
        generateClasses(classNameSearch, classes);
    }   

    window.addEventListener("new-class", (e)=>{
        const eventName = e.detail.name;
        
        let nameMatch = false;
        for(let i = 0; i < classes.length; i++){
            if(classes[i].name === eventName){
                nameMatch = true;
                alert("There is already a class with that name");
                break;
            }
        }
        if(!nameMatch){
            classes.push({name:eventName, students:[]});
            generateClasses(classNameSearch, classes);
        }
    });
}
function addStudentEvents(){
    const dropMenu = document.querySelector(".add-student-drop-down");
    let addStudentDropDown = false;

    document.querySelector("#invite-email-window-close").onclick = ()=>{
        fadeOut("#invite-email-screen", 0.1, ()=>{
            document.querySelector("#invite-email-input").value = "";
            const inviteList = document.querySelector(".invite-list");
            inviteList.innerText = "";
            while(inviteList.children.length > 0) inviteList.removeChild(inviteList.lastChild);
        });
    }
    document.querySelector("#invite-qr-window-close").onclick = ()=>{
        document.querySelector(".invite-qr").innerHTML = "";
        fadeOut("#invite-qr-screen", 0.1);
    }

    document.querySelector("#add-students").onclick = ()=>{
        if(addStudentDropDown) closeDropDown();
        else{
            dropMenu.style.animation = "add-student-down ease-in-out 0.1s forwards";
            addStudentDropDown = true;
        }
    }
    document.querySelector("#invite-email").onclick = ()=>{
        dropMenu.style.animation = "add-student-up ease-in-out 0.1s forwards";
        document.querySelector("#invite-email-input").value = "";
        const inviteList = document.querySelector(".invite-list");
        while(inviteList.children.length > 0) inviteList.removeChild(inviteList.lastChild);
        document.querySelector(".invite-list").innerHTML = "No invites sent";
        fadeIn("#invite-email-screen", 0.1);
        addStudentDropDown = false;
    }
    document.querySelector("#invite-link").onclick = ()=>{
        notification("Link Error");
        closeDropDown();
    }
    document.querySelector("#invite-qr").onclick = ()=>{
        new QRCode(document.querySelector(".invite-qr"),{
            text:"Link Error",
            width:512,
            height:512,
            colorDark:"#000000",
            colorLight:"#ffffff",
            correctLevel:QRCode.CorrectLevel.H
        });
        dropMenu.style.animation = "add-student-up ease-in-out 0.1s forwards";
        addStudentDropDown = false;
        fadeIn("#invite-qr-screen", 0.1);
    }
    document.querySelector("#invite-list").onclick = ()=>{

    }
    
    function closeDropDown(){
        dropMenu.style.animation = "add-student-up ease-in-out 0.1s forwards";
        addStudentDropDown = false;
    }
}

/*--Classes List-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateClasses(classNameSearch, classes){
    const classList = document.querySelector(".class-list");
    while(classList.children.length > 0) classList.removeChild(classList.lastChild);
    classList.innerHTML = "";

    let filteredClasses = [];
    for(let i = 0; i < classes.length; i++){
        let containsName = (classes[i].name).toLowerCase().indexOf(classNameSearch.toLowerCase()) !== -1;
        if(classNameSearch === "" || containsName) filteredClasses.push(classes[i]);
    }

    if(filteredClasses.length === 0){
        classList.innerHTML = "No classes present";
        return;
    }
    for(let i = 0; i < classes.length; i++){
        let containsName = (classes[i].name).toLowerCase().indexOf(classNameSearch.toLowerCase()) !== -1;
        if(classNameSearch === "" || containsName){
            const row  = document.createElement("div");  row.className = "class-list-window-row";
            const icon = document.createElement("div"); icon.className = "class-list-window-icon";
            const text = document.createElement("div"); text.className = "class-list-window-text";
            const num  = document.createElement("div");  num.className = "class-list-window-num";
    
            if(i === 1) icon.classList.add("class-list-window-icon-user");
            num.innerText = classes[i].students.length;
            text.innerText = classes[i].name;
    
            row.appendChild(icon);
            row.appendChild(text);
            row.appendChild(num);
            classList.appendChild(row);
        }
    }
}
function generateNewClassLogic(){
    const createClassHolder = document.querySelector(".class-list-window-button-holder");
    const newClassHolder = document.querySelector(".class-list-window-input-holder");
    const newClassConfirm = document.querySelector("#new-class-confirm");
    const newClassCancel = document.querySelector("#new-class-cancel");
    const newClassInput = document.querySelector("#new-class-input");
    const createClass = document.querySelector("#create-class");
    
    createClass.onclick = ()=>{
        newClassInput.value = "";
        createClassHolder.style.display = "none";
        newClassHolder.style.display = "block";
    }
    newClassCancel.onclick = ()=>{
        newClassInput.value = "";
        newClassHolder.style.display = "none";
        createClassHolder.style.display = "flex";
    }
    newClassConfirm.onclick = ()=>{
        if(!newClassInput.value){
            alert("Input a class name");
            return;
        }
        const eventData = {detail:{name:newClassInput.value}}
        const newClassData = new CustomEvent("new-class", eventData);
        window.dispatchEvent(newClassData);
        newClassCancel.click();
    }
}