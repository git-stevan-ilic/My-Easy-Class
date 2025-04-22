/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadStudentsLogic(user){
    let lessons = [
        [
            {lessonName:"lesson name", content:"lesson content", students:["student1", "student2", "student3"], className:"class a"}
        ],
        [
            
        ],
        [
            
        ]
    ]
    let currlesson = 0;
    let classes = [
        {name:"All Students", students:[
            {id:"0", name:"test 1"}, {id:"1", name:"test 2"}, {id:"2", name:"test 3"}
        ]},
        {name:"Ungrouped", students:[
            {id:"0", name:"test 1"}, {id:"1", name:"test 2"}, {id:"2", name:"test 3"}
        ]}
    ], currClass = 0;




    //let classes = [], lessons = [[], [], []], currClass = 0, currlesson = 0;
    let classNameSearch = "", studentListSearch = "", inviteStudendSearch = "";
    generateClasses(classNameSearch, classes);
    generateNewClassLogic();
    addStudentEvents(user);
    displayCurrClass(classes[currClass], studentListSearch);
    generateLessons(lessons[currlesson], currlesson);

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

    const studentSearchIcon = document.querySelector("#student-search-icon");
    const studentSearch = document.querySelector("#student-search");
    studentSearch.value = "";
    studentSearchIcon.onclick = ()=>{
        studentListSearch = studentSearch.value;
        displayCurrClass(classes[currClass], studentListSearch);
    }
    studentSearch.oninput = ()=>{
        studentListSearch = studentSearch.value;
        displayCurrClass(classes[currClass], studentListSearch);
    }

    const inviteListSearchIcon = document.querySelector("#invite-list-search-icon");
    const inviteListSearch = document.querySelector("#invite-list-search");
    inviteListSearchIcon.onclick = ()=>{
        inviteStudendSearch = inviteListSearch.value;
        let currClassIDs = new Set(classes[currClass].students.map(item => item.id)); 
        let availableStudents = classes[0].students.filter(item => !currClassIDs.has(item.id)); 
        inviteListSearchApply(availableStudents, inviteStudendSearch);
    }
    inviteListSearch.oninput = ()=>{
        inviteStudendSearch = inviteListSearch.value;
        let currClassIDs = new Set(classes[currClass].students.map(item => item.id)); 
        let availableStudents = classes[0].students.filter(item => !currClassIDs.has(item.id)); 
        inviteListSearchApply(availableStudents, inviteStudendSearch);
    }

    const lessonTabs = document.querySelectorAll(".lesson-tab");
    for(let i = 0; i < lessonTabs.length; i++){
        lessonTabs[i].onclick = ()=>{
            if(!lessonTabs[i].classList.contains("lesson-selected-tab")){
                document.querySelector(".lesson-selected-tab").classList.remove("lesson-selected-tab");
                lessonTabs[i].classList.add("lesson-selected-tab");
                currlesson = i;
                generateLessons(lessons[currlesson], currlesson);
            }
        }
    }

    const newLessonName = document.querySelector("#new-lesson-input-name");
    const newLessonContent = document.querySelector("#new-lesson-input-content");
    const newLessonDate = document.querySelector("#new-lesson-input-date");
    const newLessonTime = document.querySelector("#new-lesson-input-time");
    document.querySelector("#new-lesson").onclick = ()=>{
        newLessonName.value = "";
        newLessonContent.value = "";
        newLessonDate.value = "";
        newLessonTime.value = "";
        fadeIn("#new-lesson-screen", 0.1, "block");
    }
    document.querySelector("#new-button-cancel").onclick = ()=>{
        fadeOut("#new-lesson-screen", 0.1, ()=>{
            newLessonName.value = "";
            newLessonContent.value = "";
            newLessonDate.value = "";
            newLessonTime.value = "";
        });
    }
    document.querySelector("#new-button-confirm").onclick = ()=>{
        if(newLessonName.value === "" || newLessonContent.value === "" || newLessonDate.value === "" || newLessonTime.value === ""){
            alert("Input all values");
            return;
        }
        let studentNames = [];
        for(let i = 0; i < classes[currClass].students.length; i++){
            studentNames.push(classes[currClass].students[i].name);
        }
        lessons[0].push({
            lessonName:newLessonName.value,
            content:newLessonContent.value,
            students:studentNames,
            className:classes[currClass].name,
            date:newLessonDate.value,
            time:newLessonTime.value
        });
        document.querySelector("#new-button-cancel").click();
        generateLessons(lessons[currlesson], currlesson);
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
            currClass = classes.length - 1;
            displayCurrClass(classes[currClass], studentListSearch);
        }
    });
    window.addEventListener("request-student-list", ()=>{
        let currClassIDs = new Set(classes[currClass].students.map(item => item.id)); 
        let availableStudents = classes[0].students.filter(item => !currClassIDs.has(item.id)); 
        generateInviteStudentList(availableStudents, inviteStudendSearch);
    });
    window.addEventListener("add-students-list", (e)=>{
        let addedStudentIDs = e.detail.students;
        let addedStudents = [];
        for(let i = 0; i < classes[0].students.length; i++){
            for(let j = 0; j < addedStudentIDs.length; j++){
                if(classes[0].students[i].id === addedStudentIDs[j]){
                    addedStudents.push(classes[0].students[i]);
                }
            }
        }
        if(currClass !== 0){
            for(let i = 0; i < classes[1].students.length; i++){
                for(let j = 0; j < addedStudentIDs.length; j++){
                    if(classes[1].students[i].id === addedStudentIDs[j]){
                        classes[1].students.splice(i, 1);
                    }
                }
            }
        }
        document.querySelector("#invite-list-window-close").click();
        classes[currClass].students = classes[currClass].students.concat(addedStudents);
        generateClasses(classNameSearch, classes);
        displayCurrClass(classes[currClass], studentListSearch);
    });
    window.addEventListener("display-curr-class", ()=>{
        displayCurrClass(classes[currClass], studentListSearch);
    });
    window.addEventListener("change-curr-class", (e)=>{
        currClass = e.detail.newCurrClass;
        studentListSearch = "";
        studentSearch.value = studentListSearch;
        displayCurrClass(classes[currClass], studentListSearch);
    });
    window.addEventListener("delete-student", (e)=>{
        for(let i = 0; i < classes.length; i++){
            for(let j = 0; j < classes[i].students.length; j++){
                if(classes[i].students[j].id === e.detail.id){
                    classes[i].students.splice(j, 1);
                    break;
                }
            }
        }
        generateClasses(classNameSearch, classes);
        displayCurrClass(classes[currClass], studentListSearch);
    });
    window.addEventListener("remove-student", (e)=>{
        for(let i = 0; i < classes.length; i++){
            if(classes[i].name === e.detail.currClass.name){
                for(let j = 0; j < classes[i].students.length; j++){
                    if(classes[i].students[j].id === e.detail.id){
                        let removedStudent = classes[i].students.splice(j, 1);
                        classes[1].students = classes[1].students.concat(removedStudent);
                        break;
                    }
                }
                break;
            }
        }
        generateClasses(classNameSearch, classes);
        displayCurrClass(classes[currClass], studentListSearch);
    });
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
    
          
            num.innerText = classes[i].students.length;
            text.innerText = classes[i].name;
            if(i === 1) icon.classList.add("class-list-window-icon-user");
    
            row.appendChild(icon);
            row.appendChild(text);
            row.appendChild(num);
            classList.appendChild(row);

            row.onclick = ()=>{
                const changeCurrClassData = {detail:{newCurrClass:i}}
                const changeCurrClass = new CustomEvent("change-curr-class", changeCurrClassData);
                window.dispatchEvent(changeCurrClass);
            }
        }
    }
    
    const displayCurrClass = new Event("display-curr-class");
    window.dispatchEvent(displayCurrClass);
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
function displayCurrClass(currClass, studentListSearch){
    document.querySelector(".class-title").innerText = currClass.name;
    const studentList = document.querySelector(".class-window-student-list");
    while(studentList.children.length > 0) studentList.removeChild(studentList.lastChild);
    if(currClass.students.length === 0) studentList.innerHTML = "No students in classroom";
    else{
        let displayedStudents = [];
        for(let i = 0; i < currClass.students.length; i++){
            let conditionName = currClass.students[i].name.toLowerCase();
            let containCondition = conditionName.indexOf(studentListSearch.toLowerCase()) !== -1; 
            if(studentListSearch === "" || containCondition){
                displayedStudents.push(currClass.students[i]);
            }
        }
        if(displayedStudents.length === 0) studentList.innerHTML = "No students in classroom";
        else{
            studentList.innerHTML = "";
            for(let i = 0; i <displayedStudents.length; i++){
                const student = document.createElement("div");
                const studentIcon = document.createElement("div");
                const studentName = document.createElement("div");
            
                student.className = "class-window-student";
                studentIcon.className = "class-window-student-icon";
                studentName.className = "class-window-student-name";
                studentName.innerText = displayedStudents[i].name;
    
                student.appendChild(studentIcon);
                student.appendChild(studentName);
                studentList.appendChild(student);


                const studentDelete = document.createElement("div");
                studentDelete.className = "class-window-student-delete";
                student.appendChild(studentDelete);
                if(currClass.name === "All Students" || currClass.name === "Ungrouped"){
                    studentDelete.onclick = ()=>{
                        if(confirm("Are you sure you want to remove this student from all classes?")){
                            const data = {detail:{id:displayedStudents[i].id}}
                            const deleteStudentEvent = new CustomEvent("delete-student", data);
                            window.dispatchEvent(deleteStudentEvent);
                        }
                    }
                }
                else{
                    studentDelete.classList.add("class-window-student-remove");
                    studentDelete.onclick = ()=>{
                        if(confirm("Are you sure you want to remove this student from this class?")){
                            const data = {detail:{id:displayedStudents[i].id, currClass:currClass}}
                            const deleteStudentEvent = new CustomEvent("remove-student", data);
                            window.dispatchEvent(deleteStudentEvent);
                        }
                    }
                }
            }
        }
    }
}

/*--Add Students-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function addStudentEvents(user){
    const dropMenu = document.querySelector(".add-student-drop-down");
    const inviteList = document.querySelector(".invite-list");
    let addStudentDropDown = false;

    document.querySelector("#invite-email-window-close").onclick = ()=>{
        fadeOut("#invite-email-screen", 0.1, ()=>{
            document.querySelector("#invite-email-input").value = "";
            inviteList.innerText = "";
            while(inviteList.children.length > 0) inviteList.removeChild(inviteList.lastChild);
        });
    }
    document.querySelector("#invite-qr-window-close").onclick = ()=>{
        document.querySelector(".invite-qr").innerHTML = "";
        fadeOut("#invite-qr-screen", 0.1);
    }
    document.querySelector("#invite-list-window-close").onclick = ()=>{
        fadeOut("#invite-list-screen", 0.1, ()=>{
            const list = document.querySelector(".student-list");
            while(list.children.length > 0) list.removeChild(list.lastChild);
        });
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
        while(inviteList.children.length > 0) inviteList.removeChild(inviteList.lastChild);
        inviteList.innerHTML = "No invites sent";
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
        const requestStudentList = new Event("request-student-list");
        document.querySelector("#invite-list-search").value = "";
        window.dispatchEvent(requestStudentList);
        fadeIn("#invite-list-screen", 0.1);
        closeDropDown();
    }

    const inviteEmailInput = document.querySelector("#invite-email-input");
    document.querySelector("#invite-email-button").onclick = ()=>{
        if(!isValidEmail(inviteEmailInput.value)) alert("Invalid email");
        else{
            let style = "background-color:rgb(087, 160, 211);color:var(255,255,255);height:50px;width:150px;font:20px Arial bold;";
            let emailContent = "<!DOCTYPE html><html><body>";
            emailContent += "<h2>My Easy Class</h2>"
            emailContent += "You're being invited to join My Easy Class by "+user.displayName;
            emailContent += "<br>Click the button below to join<br><br>";
            emailContent += "<button style='"+style+"' onclick='()=>{window.open('http:localhost:5000')}'>Join My Easy</button>";
            emailContent += "</body></html>";
            sendMail(inviteEmailInput.value, "My Easy Class Invite", emailContent, "invite");
        }
    }
    window.addEventListener("invite-email-sent", (e)=>{
        inviteEmailInput.value = "";
        if(inviteList.children.length === 0) inviteList.innerText = "";
        const invited = document.createElement("div");
        invited.className = "invited";
        invited.innerText =  e.detail.email;
        inviteList.appendChild(invited);
    });
    document.querySelector("#move-to-class").onclick = ()=>{
        let addedStudents = [];
        const list = document.querySelector(".student-list");
        for(let i = 0; i < list.children.length; i++){
            if(list.children[i].dataset.checked === "true"){
                addedStudents.push(list.children[i].dataset.id);
            }
        }
        const addStudentsData = {detail:{students:addedStudents}}
        const addStudents = new CustomEvent("add-students-list", addStudentsData);
        window.dispatchEvent(addStudents);
    }
    
    function closeDropDown(){
        dropMenu.style.animation = "add-student-up ease-in-out 0.1s forwards";
        addStudentDropDown = false;
    }
}
function generateInviteStudentList(students, inviteStudendSearch){
    let displayedStudents = []
    for(let i = 0; i < students.length; i++){
        let searchResult = students[i].name.toLowerCase().indexOf(inviteStudendSearch)
        if(searchResult !== -1 || inviteStudendSearch === ""){
            displayedStudents.push(students[i])
        }
    }

    const list = document.querySelector(".student-list");
    for(let i = 0; i < students.length; i++){
        const studentCheckMark = document.createElement("div");
        const studentCheck = document.createElement("div");
        const studentIcon = document.createElement("div");
        const studentName = document.createElement("div");
        const student = document.createElement("div");
      
        studentCheckMark.className = "student-check-mark";
        studentCheck.className = "student-check";
        studentIcon.className = "student-icon";
        studentName.className = "student-name";
        student.className = "student";
        student.style.display = "none";

        studentName.innerText = students[i].name;
        student.dataset.id = students[i].id;
        student.dataset.checked = false;

        studentCheck.appendChild(studentCheckMark);
        student.appendChild(studentCheck);
        student.appendChild(studentIcon);
        student.appendChild(studentName);
        list.appendChild(student);

        studentCheck.onclick = ()=>{
            if(student.dataset.checked === "true"){
                studentCheckMark.style.display = "none";
                student.dataset.checked = false;
            }
            else{
                studentCheckMark.style.display = "block";
                student.dataset.checked = true;
            }
        }

        for(let j = 0; j < displayedStudents.length; j++){
            if(displayedStudents[j].id === students[i].id){
                student.style.display = "flex";
            }
        }
    }

    const noIniteList = document.querySelector(".no-inite-list");
    if(displayedStudents.length === 0) noIniteList.style.display = "flex";
    else noIniteList.style.display = "none";
}
function inviteListSearchApply(students, inviteStudendSearch){
    let displayedStudents = []
    for(let i = 0; i < students.length; i++){
        let searchResult = students[i].name.toLowerCase().indexOf(inviteStudendSearch)
        if(searchResult !== -1 || inviteStudendSearch === ""){
            displayedStudents.push(students[i])
        }
    }

    const list = document.querySelector(".student-list");
    for(let i = 0; i < list.children.length; i++){
        let matched = false;
        for(let j = 0; j < displayedStudents.length; j++){
            if(displayedStudents[j].id === list.children[i].dataset.id){
                matched = true;
                break;
            }
        }
        if(matched) list.children[i].style.display = "flex";
        else list.children[i].style.display = "none";
    }

    const noIniteList = document.querySelector(".no-inite-list");
    if(displayedStudents.length === 0) noIniteList.style.display = "flex";
    else noIniteList.style.display = "none";
}

/*--lessons-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateLessons(lessons, currlesson){
    const listHolder = document.querySelector(".lesson-list-holder");
    while(listHolder.children.length > 0) listHolder.removeChild(listHolder.lastChild);
    for(let i = 0; i < lessons.length; i++){
        const  lesson = document.createElement("div"); 
        const lessonN = document.createElement("div"); 
        const lessonC = document.createElement("div"); 
        const lessonS = document.createElement("div"); 
        const lessonA = document.createElement("div"); 

        lesson.className  = "lesson";
        lessonN.className = "lesson-list-element lesson-name";
        lessonC.className = "lesson-list-element lesson-content";
        lessonS.className = "lesson-list-element lesson-students";
        lessonA.className = "lesson-list-element lesson-action";

        let studentText = "Class: "+lessons[i].className+"<br>";
        for(let j = 0; j < lessons[i].students.length; j++){
            let comma = ", ";
            if(j === lessons[i].students.length - 1) comma = "";
            studentText += lessons[i].students[j]+comma;
        }

        lessonN.innerHTML = lessons[i].lessonName;
        lessonC.innerHTML = lessons[i].content;
        lessonS.innerHTML = studentText;

        lesson.appendChild(lessonN);
        lesson.appendChild(lessonC);
        lesson.appendChild(lessonS);
        lesson.appendChild(lessonA);
        listHolder.appendChild(lesson);

        switch(currlesson){
            default:break;
            case 0:
                const startButton = document.createElement("button");
                startButton.className = "action-button";
                startButton.innerHTML = "Start lesson";
                lessonA.appendChild(startButton);
                startButton.onclick = async ()=>{
                   
                }

                const cancelButton = document.createElement("button");
                cancelButton.className = "action-button";
                cancelButton.innerHTML = "Cancel lesson";
                lessonA.appendChild(cancelButton);
                cancelButton.onclick = ()=>{
                    /*if(confirm("Are you sure you want to cancel this lesson?")){
                        const cancellesson = new CustomEvent("cancel-lesson", {detail:{index:i}});
                        window.dispatchEvent(cancellesson);
                    }*/
                    alert("database error");
                }
                break;
            case 1:
                const commentButton = document.createElement("button");
                commentButton.className = "action-button";
                commentButton.innerHTML = "Comment Students";
                lessonA.appendChild(commentButton);
                commentButton.onclick = ()=>{
                    alert("database error");
                }
                break;
            case 2:
                const rescheduleButton = document.createElement("button");
                rescheduleButton.className = "action-button";
                rescheduleButton.innerHTML = "Reschedule lesson";
                lessonA.appendChild(rescheduleButton);
                rescheduleButton.onclick = ()=>{
                    //const reschedulelesson = new CustomEvent("reschedule-lesson", {detail:{index:i}});
                    //window.dispatchEvent(reschedulelesson);
                    alert("database error");
                }
                break;
        }
    }
}




async function startMeeting(){
    const zoomClient = ZoomMtgEmbedded.createClient();
    const response = await fetch("/api/zoom/create-meeting");
    const meetingData = await response.json();

    ZoomMtgEmbedded.init({
        debug:true,
        zoomAppRoot:document.body,
        language:"en-US",
        customize: {
            meetingInfo:["topic", "host", "mn", "pwd", "telPwd", "invite", "participant", "dc", "enctype"],
            toolbar:{buttons:[{text:"Leave", onClick:()=>{zoomClient.leaveMeeting()}}]}
        }
    });

    zoomClient.join({
        sdkKey:meetingData.clientID,
        signature:generateSignature(), // Generate on backend if using SDK
        meetingNumber:meetingData.meetingID,
        password:meetingData.password,
        userName: 'Your Name',
        userEmail: 'your@email.com'
    });
}