/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadStudentsLogic(client, userID, username){
    let studentListSearch = "", assignmentSearch = "", homeworkSearch = "";
    let classNameSearch = "", inviteStudendSearch = "";
    let currLesson = 0, lessons = [[], [], []];
    let currClass = 0, classes = [];
    let firstEventLoaded = false;

    classesExist(classes.length);
    generateNewClassLogic();
    generateClasses(classNameSearch, classes);

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
            notification("Input all values");
            return;
        }

        notification("Zoom connection not secure");
        return;


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
        generateLessons(lessons[currLesson], currLesson);
    }
    document.querySelector("#assignment-close").onclick = ()=>{
        fadeOut("#display-assignment-screen", 0.1, null);
    }

    window.addEventListener("new-class", (e)=>{
        const eventName = e.detail.name;
        let nameMatch = false;
        for(let i = 0; i < classes.length; i++){
            if(classes[i].name === eventName){
                nameMatch = true;
                notification("There is already a class with that name");
                break;
            }
        }
        if(!nameMatch) client.emit("new-class", eventName, userID);
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
        displayCurrClass(classes[currClass], studentListSearch, false);
    });
    window.addEventListener("display-curr-class", ()=>{
        displayCurrClass(classes[currClass], studentListSearch, false);
        displayAssignmentsList(classes[currClass], assignmentSearch, false, false);
        displayAssignmentsList(classes[currClass], homeworkSearch, true, false);
    });
    window.addEventListener("change-curr-class", (e)=>{
        const studentSearch = document.querySelector("#student-search");
        currClass = e.detail.newCurrClass;
        studentListSearch = "";
        studentSearch.value = studentListSearch;
        displayCurrClass(classes[currClass], studentListSearch, false);
        displayAssignmentsList(classes[currClass], assignmentSearch, false, false);
        displayAssignmentsList(classes[currClass], homeworkSearch, true, false);
        addStudentEvents(username, classes[currClass].classID, !firstEventLoaded);
        if(!firstEventLoaded) firstEventLoaded = true;
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
        displayCurrClass(classes[currClass], studentListSearch, false);
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
        displayCurrClass(classes[currClass], studentListSearch, false);
    });
    window.addEventListener("delete-assignment", (e)=>{
        client.emit("delete-assignment", classes[currClass].classID, e.detail.id, e.detail.isHomework);
        /*for(let i = 0; i < classes[currClass].assignments.length; i++){
            if(classes[currClass].assignments[i].id === e.detail.id){
                classes[currClass].assignments.splice(i, 1);
            }
        }
        let searchQuery = assignmentSearch;
        if(e.detail.isHomework) searchQuery = homeworkSearch;
        displayAssignmentsList(classes[currClass], searchQuery, e.detail.isHomework, false);*/
    });

    client.emit("class-data-request", userID);
    client.on("new-class-error", ()=>{
        console.error("Failed creating a new Class");
        notification("Class Create Error");
    });
    client.on("class-data-request-fail", ()=>{
        console.error("Failed getting class data");
        notification("Class Data Error");
    })
    client.on("class-data-received", (classData, newCurrClass)=>{
        if(newCurrClass > -1 && newCurrClass < classData.length) currClass = newCurrClass;
        lessons = [
            classData[currClass].lessons.upcoming,
            classData[currClass].lessons.completed,
            classData[currClass].lessons.canceled
        ];
        classes = classData;

        loadGenerateLogic(client, userID, classes[currClass].classID);
        addStudentEvents(username, classes[currClass].classID);
        classesExist(classes.length);
        studentPageSearch(classNameSearch, studentListSearch, assignmentSearch, homeworkSearch, inviteStudendSearch, classes, currClass, false);
        studentPageTabLogic(lessons, currLesson);
        generateClasses(classNameSearch, classes);
        generateLessons(lessons[currLesson], currLesson);
        displayCurrClass(classes[currClass], studentListSearch, false);
        displayAssignmentsList(classes[currClass], assignmentSearch, false, false);
        displayAssignmentsList(classes[currClass], homeworkSearch, true, false);
    });
    client.on("drive-read-error", (type)=>{
        document.querySelector("#file-display-cefr").disabled = false;
        const errorTexts = [
            "Reading Drive file error",
            "Unsupported file typ",
            "No readable text found",
            "Drive file reading failed"
        ];
        console.error(errorTexts[type]);
        notification(errorTexts[type]);
    });
    client.on("assignment-delete-fail", (type)=>{
        const errorTexts = [
            "Class delete error",
            "Class delete error: Class doesn't exist",
            "Class delete error: New state save fail"
        ];
        console.error(errorTexts[type]);
        notification(errorTexts[type]);
    });
    client.on("assignment-delete-success", ()=>{
        notification("Assignment deleted");
        client.emit("class-data-request", userID);
    });
}
function loadClassViewDisplay(receivedClass){
    const mainScreen = document.querySelector("#main");
    while(mainScreen.children.length > 4) mainScreen.removeChild(mainScreen.firstChild);
    mainScreen.removeChild(mainScreen.children[2]);
    mainScreen.removeChild(mainScreen.children[1]);

    document.querySelector(".students-main-holder").style.justifyContent = "center";
    document.querySelector(".lesson-action").innerText = "Student Action";
    document.querySelector("#students-screen").style.display = "block";
    document.querySelector(".students-main").style.marginTop = "1rem";
    document.querySelector("#pre-main").style.display = "none";
    mainScreen.style.display = "block";
    
    document.querySelector(".students-top-buttons-elements").remove();
    document.querySelector(".class-list-window").remove();
    document.querySelector(".pre-main-head").remove();
    document.querySelector(".main-head").remove();
    overwriteTitleMedia();

    let studentListSearch = "", assignmentSearch = "", homeworkSearch = "";
    let currLesson = 0, lessons = [
        receivedClass.lessons.upcoming,
        receivedClass.lessons.completed,
        receivedClass.lessons.canceled
    ];

    displayCurrClass(receivedClass, studentListSearch, true);
    displayAssignmentsList(receivedClass, assignmentSearch, false, true);
    displayAssignmentsList(receivedClass, homeworkSearch, true, true);
    studentPageSearch(null, studentListSearch, assignmentSearch, homeworkSearch, null, [receivedClass], 0, true);
    generateLessons(lessons[currLesson], currLesson);
    studentPageTabLogic(lessons, currLesson);

    document.querySelector("#assignment-close").onclick = ()=>{
        fadeOut("#display-assignment-screen", 0.1, null);
    }
}
function studentPageSearch(classNameSearch, studentListSearch, assignmentListSearch, homeworkListSearch, inviteStudendSearch, classes, currClass, studentView){
    if(!studentView){
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
    }

    const studentSearchIcon = document.querySelector("#student-search-icon");
    const studentSearch = document.querySelector("#student-search");
    studentSearch.value = "";
    studentSearchIcon.onclick = ()=>{
        studentListSearch = studentSearch.value;
        displayCurrClass(classes[currClass], studentListSearch, studentView);
    }
    studentSearch.oninput = ()=>{
        studentListSearch = studentSearch.value;
        displayCurrClass(classes[currClass], studentListSearch, studentView);
    }
    
    const assignmentSearchIcon = document.querySelector("#assignment-search-icon");
    const assignmentSearch = document.querySelector("#assignment-search");
    assignmentSearch.value = "";
    assignmentSearchIcon.onclick = ()=>{
        assignmentListSearch = assignmentSearch.value;
        displayAssignmentsList(classes[currClass], assignmentListSearch, false, studentView);
    }
    assignmentSearch.oninput = ()=>{
        assignmentListSearch = assignmentSearch.value;
        displayAssignmentsList(classes[currClass], assignmentListSearch, false, studentView);
    }

    const homeworkSearchIcon = document.querySelector("#homework-search-icon");
    const homeworkSearch = document.querySelector("#homework-search");
    homeworkSearch.value = "";
    homeworkSearchIcon.onclick = ()=>{
        homeworkListSearch = homeworkSearch.value;
        displayAssignmentsList(classes[currClass], homeworkListSearch, true, studentView);
    }
    homeworkSearch.oninput = ()=>{
        homeworkListSearch = homeworkSearch.value;
        displayAssignmentsList(classes[currClass], homeworkListSearch, true, studentView);
    }
}
function studentPageTabLogic(lessons, currLesson){
    const lessonTabs = document.querySelectorAll(".lesson-tab");
    for(let i = 0; i < lessonTabs.length; i++){
        lessonTabs[i].onclick = ()=>{
            if(!lessonTabs[i].classList.contains("lesson-selected-tab")){
                document.querySelector(".lesson-selected-tab").classList.remove("lesson-selected-tab");
                lessonTabs[i].classList.add("lesson-selected-tab");
                currLesson = i;
                generateLessons(lessons[currLesson], currLesson);
            }
        }
    }

    const classWindowBodyContent = document.querySelectorAll(".class-window-body-content");
    const classWindowTabs = document.querySelectorAll(".class-window-tab");
    for(let i = 0; i < classWindowTabs.length; i++){
        classWindowTabs[i].onclick = ()=>{
            for(let j = 0; j < classWindowBodyContent.length; j++) classWindowBodyContent[j].style.display = "none";
            document.querySelector(".class-window-selected-tab").classList.remove("class-window-selected-tab");
            classWindowTabs[i].classList.add("class-window-selected-tab");
            classWindowBodyContent[i].style.display = "block";
        }
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
            notification("Input a class name");
            return;
        }
        const eventData = {detail:{name:newClassInput.value}}
        const newClassData = new CustomEvent("new-class", eventData);
        window.dispatchEvent(newClassData);
        newClassCancel.click();
    }
}

/*--Display Windows----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function classesExist(classNum){
    const classRequired = document.querySelectorAll(".class-required");
    if(classNum === 0) for(let i = 0; i < classRequired.length; i++) classRequired[i].style.display = "none";
    else for(let i = 0; i < classRequired.length; i++) classRequired[i].style.display = "block";
    
}
function displayCurrClass(currClass, studentListSearch, studentView){
    if(!currClass) return;
    document.querySelector(".class-title").innerText = currClass.name;
    const studentList = document.querySelector("#class-window-student-list");
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
        if(displayedStudents.length === 0){
            studentList.innerHTML = "No students in classroom";
            return;
        }
        studentList.innerHTML = "";
        for(let i = 0; i <displayedStudents.length; i++){
            const student = document.createElement("div");
            const studentIcon = document.createElement("div");
            const studentName = document.createElement("div");
            
            student.className = "class-window-list-item";
            studentIcon.className = "class-window-list-item-icon";
            studentName.className = "class-window-list-item-name";
            studentName.innerText = displayedStudents[i].name;
    
            student.appendChild(studentIcon);
            student.appendChild(studentName);
            studentList.appendChild(student);

            if(!studentView){
                const studentDelete = document.createElement("div");
                studentDelete.className = "class-window-list-item-delete";
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
function displayAssignmentsList(currClass, searchParam, isHomework, studentView){
    if(!currClass) return;
    let domSearchParam = "#class-window-assignment-list";
    if(isHomework) domSearchParam = "#class-window-homework-list";
    const assignmentList = document.querySelector(domSearchParam);
    while(assignmentList.children.length > 0) assignmentList.removeChild(assignmentList.lastChild);
    
    let length = currClass.assignments.lenght;
    let list = currClass.assignments;
    let displayText = "assignment";
    if(isHomework){
        length = currClass.homework.length;
        list = currClass.homework;
        displayText = "homework";
    }
    if(length === 0){
        assignmentList.innerHTML = "No "+displayText+"s in classroom";
        return;
    }

    let displayedAssignments = [];
    for(let i = 0; i < list.length; i++){
        let conditionName = list[i].name.toLowerCase();
        let containCondition = conditionName.indexOf(searchParam.toLowerCase()) !== -1; 
        if(searchParam === "" || containCondition) displayedAssignments.push(list[i]);
    }
    if(displayedAssignments.length === 0){
        assignmentList.innerHTML = "No "+displayText+"s in classroom";
        return;
    }

    assignmentList.innerHTML = "";
    for(let i = 0; i < displayedAssignments.length; i++){
        const listItem = document.createElement("div");
        const listItemName = document.createElement("div");
            
        listItem.className = "class-window-list-item";
        listItemName.className = "class-window-list-item-name";
        listItemName.innerText = displayedAssignments[i].name;
    
        listItem.appendChild(listItemName);
        assignmentList.appendChild(listItem);
        listItem.onclick = ()=>{displayAssignmentWindow(displayedAssignments[i])}

        if(!studentView){
            const listItemDelete = document.createElement("div");
            listItemDelete.className = "class-window-list-item-delete";
            listItem.appendChild(listItemDelete);
            listItemDelete.onclick = (e)=>{
                e.stopPropagation();
                if(confirm("Are you sure you want to remove this "+displayText+" from this class?")){
                    const data = {detail:{id:displayedAssignments[i].id, isHomework:isHomework}}
                    const deleteStudentEvent = new CustomEvent("delete-assignment", data);
                    window.dispatchEvent(deleteStudentEvent);
                }
            }
        }
    }   
}
function displayAssignmentWindow(assignment){
    let html = `
    <!DOCTYPE html>
    <html xmlns:o="urn:schemas-microsoft-com:office:office"
          xmlns:w="urn:schemas-microsoft-com:office:word"
          xmlns="http://www.w3.org/TR/REC-html40">
        <head>
        <meta charset="utf-8">
        <style>
            body{
                font-family:'Arial';
                color:rgb(016, 047, 068);
                padding:1rem;
            }
        </style>
    </head>
    <body>`;

    const displayAssignmentBody = document.querySelector(".display-assignment-body");
    while(displayAssignmentBody.children.length > 0) displayAssignmentBody.removeChild(displayAssignmentBody.lastChild);

    const title = document.createElement("div");
    title.className = "display-assignment-title";
    title.innerText = assignment.name;
    displayAssignmentBody.appendChild(title);
    html += "<h1>"+assignment.name+"</h1><br>";

    const letters = [
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", 
        "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
    ];

    if(assignment.format === "Question and Answer" || assignment.format === "ABC Question"){
        for(let i = 0; i < assignment.questions.length; i++){
            const question = document.createElement("div");
            question.className = "display-assignemnt-question";
            question.innerText = (i+1) + ") "+assignment.questions[i].text;
            displayAssignmentBody.appendChild(question);
            html += "<div style='font-weight:bold; margin-top:1rem;'>" + (i+1) + ") "+assignment.questions[i].text+"<br></div>";

            if(assignment.format === "Question and Answer"){
                const empty = document.createElement("div");
                empty.className = "display-assignemnt-empty";
                displayAssignmentBody.appendChild(empty);
                html += "<br>";
            }
            else{
                for(let j = 0; j < assignment.questions[i].answers.length; j++){
                    const answer = document.createElement("div");
                    answer.className = "display-assignemnt-answer";
                    answer.innerText = letters[j]+") "+ assignment.questions[i].answers[j];
                    displayAssignmentBody.appendChild(answer);
                    html += "<div style='margin-left:1rem;'>" + letters[j]+") "+ assignment.questions[i].answers[j] + "</div>";
                }
                html += "<br>";
            }
        }
    }
    else{
        const requirement = document.createElement("div");
        requirement.className = "display-assignment-requirement";
        requirement.innerText = assignment.content;
        displayAssignmentBody.appendChild(requirement);
        html += "<div style='margin-bottom:5rem;'>"+assignment.content+"<br></div>";
    }
    
    html += "</body></html>";
    fadeIn("#display-assignment-screen", 0.1, "block", null);

    const docButton = document.querySelector("#assignment-doc");
    const pdfButton = document.querySelector("#assignment-pdf");
    docButton.onclick = ()=>{
        requestDownloadAssignment("doc", assignment.name, html);
        docButton.disabled = true;
    }
    pdfButton.onclick = ()=>{
        requestDownloadAssignment("pdf", assignment.name, html);
        pdfButton.disabled = true;
    }
}
async function requestDownloadAssignment(type, name, html){
    const docButton = document.querySelector("#assignment-doc");
    const pdfButton = document.querySelector("#assignment-pdf");

    const response = await fetch("/generate-"+type, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({htmlContent:html})
    });
    if(type === "doc") docButton.disabled = false;
    else pdfButton.disabled = false; 
    if(!response.ok){
        alert("Failed to generate ."+type+" file");
        return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name + "." + type; 
    a.click();
    window.URL.revokeObjectURL(url);
}

/*--Add Students-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function addStudentEvents(username, classID, first){
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
        copyURL("classID", classID)
        notification("Link copied");
        closeDropDown();
    }
    document.querySelector("#invite-qr").onclick = ()=>{
        const currBaseURL = stripUrlParams(window.location.href);
        new QRCode(document.querySelector(".invite-qr"),{
            text:currBaseURL+"?classID="+classID,
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
        if(!isValidEmail(inviteEmailInput.value)) notification("Invalid email");
        else{
            notification("Email Server Error");
            return;

            let style = "background-color:rgb(087, 160, 211);color:var(255,255,255);height:50px;width:150px;font:20px Arial bold;";
            let emailContent = "<!DOCTYPE html><html><body>";
            emailContent += "<h2>My Easy Class</h2>"
            emailContent += "You're being invited to join My Easy Class by "+username;
            emailContent += "<br>Click the button below to join<br><br>";
            emailContent += "<button style='"+style+"' onclick='()=>{window.open('http:localhost:5000')}'>Join My Easy</button>";
            emailContent += "</body></html>";
            sendMail(inviteEmailInput.value, "My Easy Class Invite", emailContent, [], "invite");
        }
    }
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
    if(first){
        window.addEventListener("invite-email-sent", (e)=>{
            inviteEmailInput.value = "";
            if(inviteList.children.length === 0) inviteList.innerText = "";
            const invited = document.createElement("div");
            invited.className = "invited";
            invited.innerText =  e.detail.email;
            inviteList.appendChild(invited);
        });
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

/*--Lessons------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateLessons(lessons, currLesson){
    const listHolder = document.querySelector(".lesson-list-holder");
    while(listHolder.children.length > 0) listHolder.removeChild(listHolder.lastChild);
    if(lessons.length === 0){
        const noLesson = document.createElement("div");
        noLesson.className = "no-lesson";
        noLesson.innerHTML = "No lessons present";
        listHolder.appendChild(noLesson);
        return;
    }
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

        switch(currLesson){
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
                    notification("database error");
                }
                break;
            case 1:
                const commentButton = document.createElement("button");
                commentButton.className = "action-button";
                commentButton.innerHTML = "Comment Students";
                lessonA.appendChild(commentButton);
                commentButton.onclick = ()=>{
                    notification("database error");
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
                    notification("database error");
                }
                break;
        }
    }
}

/*--Generate Assignment Logic------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadGenerateLogic(client, userID, classID){
    let assignmentType = 0, format = 0;
    displayEssayGeneration();

    const generateType = document.querySelector("#generate-type");
    for(let i = 0; i < generateType.children.length; i++){
        generateType.children[i].children[0].onclick = ()=>{
            for(let j = 0; j < generateType.children.length; j++){
                const currCheck = generateType.children[j].children[0].children[0];
                currCheck.style.display = "none";
            }
            const check = generateType.children[i].children[0].children[0];
            check.style.display = "flex";
            assignmentType = i;
        }
    }

    const formatFunctions = [displayEssayGeneration, displayABCGeneration, displayQnAGeneration];
    const generateFormat = document.querySelector("#generate-format");
    for(let i = 0; i < generateFormat.children.length; i++){
        generateFormat.children[i].children[0].onclick = ()=>{
            for(let j = 0; j < generateFormat.children.length; j++){
                const currCheck = generateFormat.children[j].children[0].children[0];
                currCheck.style.display = "none";
            }
            const check = generateFormat.children[i].children[0].children[0];
            check.style.display = "flex";
            format = i;
            formatFunctions[i]();
        }
    }

    const generateInputDriveText = document.querySelector("#generate-input-drive-text");
    const urlHolder = document.querySelector(".generate-assignment-url-holder");
    const generateFileInput = document.querySelector("#generate-file-input");
    const generateCEFR = document.querySelector("#generate-cefr");
    const generateSave = document.querySelector("#generate-save");
    const generateButton = document.querySelector("#generate");
    generateFileInput.value = "";

    document.querySelector("#generate-add-url").onclick = ()=>{
        const urlInput = document.createElement("input");
        urlInput.className = "generate-input";
        urlInput.type = "url";
        urlHolder.appendChild(urlInput);
    }
    document.querySelector("#generate-back").onclick = ()=>{
        fadeOut("#generate-assignment-screen", 0.1, ()=>{
            fadeIn("#students-screen", 0.1, "block", null);
        });
    }
    document.querySelector("#new-assignment").onclick = ()=>{
        openGenerateAssignment();
    }
    document.querySelector("#generate-input-file").onclick = ()=>{
        generateFileInput.click();
    }
    document.querySelector("#generate-input-drive").onclick = async ()=>{
        document.querySelector("#generate-input-drive").disabled = true;
        const generateAssignmentDrive = new Event("generate-assignment-drive");
        window.dispatchEvent(generateAssignmentDrive);
        selectedIDs = [];
    }
    document.querySelector("#display-assignment-drive-close").onclick = ()=>{
        document.querySelector("#display-assignment-drive-close").disabled = true;
        document.querySelector("#generate-assignment-drive-confirm").disabled = true;
        const generateAssignmentDrive = new Event("generate-assignment-drive");
        window.dispatchEvent(generateAssignmentDrive);
        generateInputDriveText.innerText = "";
        selectedIDs = [];
    }
    document.querySelector("#generate-assignment-drive-confirm").onclick = ()=>{
        document.querySelector("#display-assignment-drive-close").disabled = true;
        document.querySelector("#generate-assignment-drive-confirm").disabled = true;
        const generateAssignmentDrive = new Event("generate-assignment-drive");
        window.dispatchEvent(generateAssignmentDrive);

        let s = "";
        if(selectedIDs.length > 1) s = "s"
        generateInputDriveText.innerText = selectedIDs.length + " file"+s+" selected";
    }

    generateButton.onclick = async ()=>{
        const assignment = await generateAssignmentObject(assignmentType, format, selectedIDs);
        if(!assignment){
            notification("Input all required fields");
            return;
        }
        assignment.userID = userID;
        generateButton.disabled = true;
        generateSave.disabled = true;
        generateCEFR.disabled = true;
        client.emit("generate-assignment", assignment);
        fadeIn(".preview-load-mask", 0.1, "block", null);
    }
    generateFileInput.oninput = ()=>{
        const generateInputFileText = document.querySelector("#generate-input-file-text");
        if(generateFileInput.files.length === 0) generateInputFileText.innerText = "";
        else{
            let s = "";
            if(generateFileInput.files.length !== 1) s = "s";
            generateInputFileText.innerText = generateFileInput.files.length+" file"+s+" selected";
        }
    }

    let selectedIDs = [];
    window.addEventListener("reset-generate-assignment-settings", (e)=>{
        assignmentType = 0;
        format = 0;
    });
    window.addEventListener("generate-drive-click", (e)=>{
        const element = e.detail.element;
        const id = e.detail.id;

        let selected = false, index;
        for(let i = 0; i < selectedIDs.length; i++){
            if(selectedIDs[i] === id){
                selected = true;
                index = i;
                break;
            }
        }
        if(!selected){
            element.classList.add("generate-drive-selected");
            selectedIDs.push(id);
        }
        else{
            element.classList.remove("generate-drive-selected");
            selectedIDs.splice(index, 1);
        }
    });

    client.on("generate-assignment-fail", (error)=>{
        generateButton.disabled = false;
        notification("Failed generating assignment");
        fadeOut(".preview-load-mask", 0.1, null);
        console.error(error);
    });
    client.on("generate-assignment-success", (result)=>{
        generateButton.disabled = false;
        generateSave.disabled = false;
        generateCEFR.disabled = false;
        const assignment = extractJSON(result);
        if(!assignment){
            generateButton.disabled = false;
            notification("Failed generating assignment");
            fadeOut(".preview-load-mask", 0.1, null);
        }
        generateAssignmentPreview(assignment);
        fadeOut(".preview-load-mask", 0.1, null);

        generateCEFR.onclick = ()=>{
            const text = assignmentToText(assignment);
            client.emit("generate-assignment-cefr", text);
            generateCEFR.disabled = true;
        }
        generateSave.onclick = ()=>{
            client.emit("save-assignment", assignment, classID);
            generateSave.disabled = true;
        }
    });
    client.on("save-assignment-fail", (type)=>{
        const errorTexts = [
            "Class not found",
            "Invalid assignment format",
            "Error saving class"
        ];
        console.error("Assignment save fail: "+errorTexts[type]);
        notification("Assignment save fail: "+errorTexts[type])
        generateSave.disabled = false;
    });
    client.on("save-assignment-success", ()=>{
        generateSave.disabled = false;
        notification("Assignment saved");
        client.emit("class-data-request", userID);
        document.querySelector("#generate-back").click();
    });
}
async function generateAssignmentObject(assignmentType, format, selectedIDs){
    const assignmentTypes = ["Assignment", "Homework"];
    const assignmentFormats = ["Essay", "ABC Question", "Question and Answer"];
    const assignment = {
        type:assignmentTypes[assignmentType],
        format:assignmentFormats[format],
        selectedIDs:selectedIDs,
    }

    const generateFileInput = document.querySelector("#generate-file-input");
    const urlHolder = document.querySelector(".generate-assignment-url-holder");
    const theme =  document.querySelector("#generate-theme").value;
    const notes = document.querySelector("#generate-notes").value;
    const name = document.querySelector("#generate-name").value;
    if(!name || !theme) return null;
    assignment.theme = theme;
    assignment.notes = notes;
    assignment.name = name;
    assignment.urls = [];
    for(let i = 0; i < urlHolder.children.length; i++){
        if(isValidURL(urlHolder.children[i].value)) assignment.urls.push(urlHolder.children[i].value);
    }

    assignment.files = [];
    const inputFiles = Array.from(generateFileInput.files);
    for (const file of inputFiles){
        const arrayBuffer = await file.arrayBuffer();
        assignment.files.push({
            name: file.name,
            type: file.type,
            buffer: arrayBuffer
        });
    }

    if(format > 0){
        const questionLevel = document.querySelector("#genrate-level-select").value;
        assignment.questionLevel = questionLevel;

        const questionNum = document.querySelector("#generate-question-number").value;
        if(!questionNum) return null;
        assignment.questionNum = parseInt(questionNum);

        if(format === 1){
            const answerNum = document.querySelector("#generate-answer-number").value;
            if(!answerNum) return null;
            assignment.answerNum = parseInt(answerNum);
        }
    }
    return assignment;
}
function extractJSON(content){
    try{
        const start = content.indexOf("{");
        const end = content.lastIndexOf("}");
        if (start === -1 || end === -1) return null;

        const jsonString = content.substring(start, end + 1);
        return JSON.parse(jsonString);
    }
    catch(error){
        console.error("JSON parse error:", error);
        return null;
    }
}
function assignmentToText(assignment){
    let output = `Assignment: ${assignment.name}\nType: ${assignment.format}\n`;
    if(assignment.format === "Essay") output += `Essay Task:\n${assignment.content}\n`;
    else{
        output += `Questions:\n`;
        assignment.questions.forEach((q, i)=>{
            output += `Q${i + 1}: ${q.text}\n`;
            if(q.answers){
                q.answers.forEach((a, idx)=>{
                    output += `  - ${a}\n`;
                });
            }
        });
    }
    return output;
}
function isValidURL(text){
    try{
        new URL(text);
        return true;
    }
    catch{
        return false;
    }
}

/*--Generate Assignment DOM--------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function openGenerateAssignment(){
    resetGenerateAssignmentSettings();
    fadeOut("#students-screen", 0.1, ()=>{
        fadeIn("#generate-assignment-screen", 0.1, "block", null);
    });
}
function resetGenerateAssignmentSettings(){
    document.querySelector(".preview-page").innerHTML = "";
    document.querySelector("#generate-cefr").disabled = true;
    document.querySelector("#generate-save").disabled = true;
    document.querySelector("#genrate-level-select").value = "a1-a2";
    document.querySelector("#generate-question-number").value = 5;
    document.querySelector("#generate-answer-number").value = 3;
    document.querySelector("#generate-theme").value = "";
    document.querySelector("#generate-notes").value = "";
    document.querySelector("#generate-name").value = "";

    const generateType = document.querySelector("#generate-type");
    for(let i = 0; i < generateType.children.length; i++) generateType.children[i].children[0].children[0].style.display = "none";
    generateType.children[0].children[0].children[0].style.display = "flex";

    const generateFormat = document.querySelector("#generate-format");
    for(let i = 0; i < generateFormat.children.length; i++) generateFormat.children[i].children[0].children[0].style.display = "none";
    generateFormat.children[0].children[0].children[0].style.display = "flex";

    const generateAssignmentURLHolder = document.querySelector(".generate-assignment-url-holder");
    while(generateAssignmentURLHolder.children.length > 1) generateAssignmentURLHolder.removeChild(generateAssignmentURLHolder.lastChild);
    generateAssignmentURLHolder.children[0].value = "";

    const resetSettingsEvent = new Event("reset-generate-assignment-settings");
    window.dispatchEvent(resetSettingsEvent);
}
function displayEssayGeneration(){
    const generateDisplay = document.querySelectorAll(".generate-display");
    for(let i = 0; i < generateDisplay.length; i++) generateDisplay[i].style.display = "none";
    generateDisplay[0].style.display = "block";
    generateDisplay[1].style.display = "block";
}
function displayABCGeneration(){
    const generateDisplay = document.querySelectorAll(".generate-display");
    for(let i = 0; i < generateDisplay.length; i++) generateDisplay[i].style.display = "none";
    generateDisplay[0].style.display = "block";
    generateDisplay[1].style.display = "block";
    generateDisplay[2].style.display = "block";
    generateDisplay[3].style.display = "block";
    generateDisplay[4].style.display = "block";
}
function displayQnAGeneration(){
    const generateDisplay = document.querySelectorAll(".generate-display");
    for(let i = 0; i < generateDisplay.length; i++) generateDisplay[i].style.display = "none";
    generateDisplay[0].style.display = "block";
    generateDisplay[1].style.display = "block";
    generateDisplay[2].style.display = "block";
    generateDisplay[3].style.display = "block";
}
function generateAssignmentPreview(assignment){
    const previewPage = document.querySelector(".preview-page");
    previewPage.innerHTML = "";

    const title = document.createElement("div");
    title.className = "display-assignment-title";
    title.innerText = assignment.name;
    previewPage.appendChild(title);

    const letters = [
        "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", 
        "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z"
    ];

    if(assignment.format === "Question and Answer" || assignment.format === "ABC Question"){
        for(let i = 0; i < assignment.questions.length; i++){
            const question = document.createElement("div");
            question.className = "display-assignemnt-question";
            question.innerText = (i+1) + ") "+assignment.questions[i].text;
            previewPage.appendChild(question);

            if(assignment.format === "Question and Answer"){
                const empty = document.createElement("div");
                empty.className = "display-assignemnt-empty";
                previewPage.appendChild(empty);
            }
            else{
                for(let j = 0; j < assignment.questions[i].answers.length; j++){
                    const answer = document.createElement("div");
                    answer.className = "display-assignemnt-answer";
                    answer.innerText = letters[j]+") "+ assignment.questions[i].answers[j];
                    previewPage.appendChild(answer);
                }
            }
        }
    }
    else{
        const requirement = document.createElement("div");
        requirement.className = "display-assignment-requirement";
        requirement.innerText = assignment.content;
        previewPage.appendChild(requirement);
    }
}




















    
    //class-required
    /*classes = [
        {name:"All Students", 
            students:[
                {id:"1", name:"Student 1", iconURL:""}
            ],
            assignments:[
                {id:"1", name:"Assignment Essay", type:"essay", content:"This is te essay requirement"},
                {id:"2", name:"Assignment Name ABC", type:"abc", questionNum:5, answerNum:3, questionLevel:"C1-C2", questions:[
                    {text:"What is this?", answers:["Answer 1", "Answer 2", "Answer 3"]},
                    {text:"What is this?", answers:["Answer 1", "Answer 2", "Answer 3"]},
                    {text:"What is this?", answers:["Answer 1", "Answer 2", "Answer 3"]},
                    {text:"What is this?", answers:["Answer 1", "Answer 2", "Answer 3"]},
                    {text:"What is this?", answers:["Answer 1", "Answer 2", "Answer 3"]}
                ]}
            ],
            homework:[

            ]},
        {name:"Ungrouped", students:[], assignments:[
            {
                id:"1", name:"Assignment Name QnA", type:"qna", questionNum:5, questionLevel:"C1-C2", questions:[
                    {text:"What is this?"},
                    {text:"What is this?"},
                    {text:"What is this?"},
                    {text:"What is this?"},
                    {text:"What is this?"}
                ]
            }
        ], homework:[]}
    ];*/


















































/*--Zoom API-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
let meetingSDK;
async function connectZoom(){
    window.location.href = "/auth/zoom";
}
async function startMeeting() {
    const response = await fetch("/api/create-meeting");
    const meetingData = await response.json();

    console.log( meetingData)
    let signatureResponse;
    try{
        signatureResponse = await fetch("/api/generate-zoom-signature", { // Create this backend endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                meetingNumber: meetingData.id,
                role: 1
                // You might need to pass userId or email if your backend needs to fetch ZAK for a specific user
            })
        });
        if (!signatureResponse.ok) {
            const errorText = await signatureResponse.text();
            throw new Error(`Failed to get signature: ${errorText}`);
        }
    }
    catch(e){
        console.error("Error fetching signature:", e);
        notification(`Error fetching meeting signature: ${e.message}`);
        return;
    }



    const signatureData = await signatureResponse.json();
    const signature = signatureData.signature;
    const zakToken = signatureData.zak; // Your backend should provide this if role is host

    if (!signature) {
        console.error("Signature is missing from backend response.");
        notification("Error: Could not obtain meeting signature.");
        return;
    }

    if (!zakToken) {
        console.warn("Attempting to join as host without ZAK token. This might fail.");
        // Depending on your Zoom account settings and meeting type, joining as host
        // without ZAK might work for instant meetings started by the SDK user directly,
        // but for scheduled meetings or to ensure host controls, ZAK is usually needed.
    }


    ZoomMtg.setZoomJSLib("https://source.zoom.us/2.13.0/lib", "/av");
    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();

    const config = {
        meetingNumber:meetingData.id,
        userName:"Your Name", // Use the user's name from Google Login
        passWord:meetingData.password, // Only required for password-protected meetings
        leaveUrl:"http://localhost:5000",
        role:1, // 1 for host, 0 for participant
        sdkKey: "zeY5YgjkTDG0TN4WvNlPuw",
        signature: signature,
        zak: zakToken,
    };

    ZoomMtg.init({
      leaveUrl: config.leaveUrl,
      success: () => {
        const zoomElement = document.getElementById("zmmtg-root");
        zoomElement.style.position = "absolute";
        zoomElement.style.display = "block";
        ZoomMtg.join({
          ...config,
          success: (res) => console.log('Joined meeting'),
          error: (err) => console.error('Join error:', err),
        });
      },
      error: (err) => console.error('Init error:', err),
    });
  }




/*
async function connectZoom() {
    window.location.href = "/auth/zoom";
}
async function createMeeting() {
    try {
      const response = await fetch('http://localhost:5000/create-meeting', {
        method: 'POST',
        credentials: 'include', // 👈 Mandatory for cookies
        headers: {
          'Content-Type': 'application/json'
        }
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Request failed');
      }
  
      const meetingData = await response.json();
      window.open(meetingData.join_url);
    } catch (error) {
      console.error('Frontend Error:', error);
      notification(error.message);
    }
}
*/