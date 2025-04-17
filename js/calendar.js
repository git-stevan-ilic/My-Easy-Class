/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadCalendar(){
    let date = getCurrDate();
    generateCalendarElements(date);
    loadCalendarEvents();

    document.querySelector(".calendar-event-window").style.display = "none";
    const calendarDateDisplay = document.querySelector(".calendar-date-display");
    const calendarDate = document.querySelector("#calendar-date");
    calendarDate.value = date;
    displayCurrDate(date);

    calendarDateDisplay.onclick = ()=>{calendarDate.showPicker()}
    calendarDate.oninput = ()=>{
        date = calendarDate.value;
        displayCurrDate(date);
        generateCalendarElements(date);
        loadCalendarEvents();
        closeEventWindow();
    }

    document.querySelector("#calendar-event-close").onclick = closeEventWindow;
    document.querySelector("#calendar-month-b").onclick = ()=>{incrementMonth(date, -1)}
    document.querySelector("#calendar-month-f").onclick = ()=>{incrementMonth(date,  1)}
    document.querySelector("#calendar-today").onclick = ()=>{
        date = getCurrDate();
        calendarDate.value = date;
        displayCurrDate(date);
        generateCalendarElements(date);
        loadCalendarEvents();
        closeEventWindow();
    }

    window.addEventListener("resize", closeEventWindow);
    window.addEventListener("update-date", (e)=>{
        date = e.detail.date;
        calendarDate.value = date;
        displayCurrDate(date);
        generateCalendarElements(date);
        loadCalendarEvents();
        closeEventWindow();
    });
}
function incrementMonth(date, inc){
    const currDate = new Date(date);
    const d = JSON.stringify(currDate.getDate()).padStart(2, "0");

    let y = currDate.getFullYear();
    let m = currDate.getMonth()+1;
    m = m + inc;
    if(m <  1){ m = 12; y--; }
    if(m > 12){ m = 1; y++; }
    const newDate = JSON.stringify(y)+"-"+JSON.stringify(m).padStart(2, "0")+"-"+d;
    const updateDate = new CustomEvent("update-date", {detail:{date:newDate}});
    window.dispatchEvent(updateDate);
}
function getCurrDate(){
    const date = new Date();
    const d = JSON.stringify(date.getDate()).padStart(2, "0");
    const m = JSON.stringify(date.getMonth()+1).padStart(2, "0");
    const y = JSON.stringify(date.getFullYear());
    return y+"-"+m+"-"+d;
}
function displayCurrDate(date){
    let indexes = [];
    for(let i = 0; i < date.length; i++){
        if(date[i] === "-") indexes.push(i);
    }
    
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const year = date.slice(0, indexes[0]);
    const monthIndex = parseInt(date.slice(indexes[0]+1, indexes[1]))-1;
    document.querySelector(".calendar-date-display").innerHTML = months[monthIndex] + " "+ year + " &#x23F7;";
}

/*--Generate Calendar Elements-----------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function generateCalendarElements(date){
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const calendar = document.querySelector(".calendar");
    while(calendar.children.length > 0) calendar.removeChild(calendar.lastChild);

    for(let i = 0; i < 6; i++){
        const row = document.createElement("div");
        row.className = "calendar-row";
        if(i === 0) row.classList.add("calendar-day-row");
        calendar.appendChild(row)

        for(let j = 0; j < 7; j++){
            const day = document.createElement("div");
            day.className = "calendar-day";
            if(j === 0) day.style.borderLeft = "none";
            if(i === 0) day.innerHTML = "<div class='calendar-day-title'>"+days[j]+"</div>";
            row.appendChild(day);
        }
    }
    generateCalendarDates(date);
}
function generateCalendarDates(date){
    let indexes = [];
    for(let i = 0; i < date.length; i++){
        if(date[i] === "-") indexes.push(i);
    }
    const y = date.slice(0, indexes[0]);
    const m = date.slice(indexes[0]+1, indexes[1]);
    const d = date.slice(indexes[1]+1);
    const mIndex = parseInt(m)-1;

    let leapYear = 0;
    if(parseInt(y) % 4 === 0) leapYear = 1;
    const numDaysMonth = [31, 28+leapYear, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

    const firstDay = new Date(y+"-"+m+"-"+"01").getDay();
    const days = document.querySelectorAll(".calendar-day");
    for(let i = 0; i < 35; i++){
        let currY = parseInt(y);
        let currM = parseInt(m);

        const dayDisplay = document.createElement("div");
        dayDisplay.className = "day-display";
        let currD = i - firstDay + 1;

        const conditionR = currD > numDaysMonth[mIndex];
        const conditionL = i < firstDay;
        if(conditionL || conditionR){
            dayDisplay.classList.add("day-display-unfocus");
            if(conditionR){
                currD -= numDaysMonth[mIndex];
                currM = mIndex + 2;
                if(currM > 12){
                    currM = 1;
                    currY++;
                }
            }
            if(conditionL){
                let prevMIndex = mIndex-1;
                if(prevMIndex < 0){
                    prevMIndex = 11;
                    currY--;
                }
                currD += numDaysMonth[prevMIndex];
                currM = prevMIndex+1;
            }
        }

        const dateToday = new Date();
        const condition = (currD === dateToday.getDate()) && (currM === (dateToday.getMonth()+1)) && (currY === dateToday.getFullYear());
        if(condition) dayDisplay.innerHTML = "<div class='calendar-today'>"+currD+"</div>";
        else dayDisplay.innerText = currD;
        days[i+7].appendChild(dayDisplay);

        const eventDisplay = document.createElement("div");
        eventDisplay.className = "event-display";
        days[i+7].appendChild(eventDisplay);

        const currDstring = JSON.stringify(currD).padStart(2, "0");
        const currMstring = JSON.stringify(currM).padStart(2, "0");
        const currYstring = JSON.stringify(currY);
        const currDate = currYstring + "-" + currMstring + "-" + currDstring;
        days[i+7].id = "calendar-"+currDate;

        days[i+7].onclick = ()=>{createEvent(date, currDate)};
    }
}
function generateCalendarEvents(events){
    for(let i = 0; i < events.length; i++){
        try{
            const newEvent = document.createElement("div");
            newEvent.className = "calendar-event";
            newEvent.style.backgroundColor = events[i].color;
            newEvent.innerText = events[i].title;
            
            let startDate = events[i].start;
            let timeIndex = startDate.indexOf("T");
            if(timeIndex !== -1) startDate = startDate.slice(0, timeIndex);
            const day = document.getElementById("calendar-"+startDate);
            day.children[1].appendChild(newEvent);

            newEvent.onclick = (e)=>{openEventWindow(e, events[i], newEvent.getBoundingClientRect())}
            newEvent.id = "event-"+events[i].id;
        }
        catch{
            console.log("Event not in scope", events[i])
        }
    }
}

/*--Calendar Event Elements--------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function openEventWindow(e, event, coords){
    e.stopPropagation();
    document.querySelector(".calendar-event-color").style.backgroundColor = event.color;
    document.querySelector(".calendar-event-data-title").innerText = event.title;
    document.querySelector(".calendar-event-data-date").innerText = generateEventTime(event.start);
    fadeIn(".calendar-event-window", 0.1, "block");

    const eventWindow = document.querySelector(".calendar-event-window");
    const windowCoords = eventWindow.getBoundingClientRect();

    let eventX = coords.x + coords.width/2, eventY = coords.y + coords.height/2, diffX = 0, diffY = 0;
    if(eventX + windowCoords.width/2 > window.innerWidth){
        diffX = -(eventX + windowCoords.width/2 - window.innerWidth) - window.innerWidth/100*2
    }
    if(eventX - windowCoords.width/2 < 0){
        diffX = windowCoords.width/5 + window.innerWidth/100*2
    }
    if(eventY + windowCoords.height/2 > window.innerHeight*0.9){
        diffY = -(windowCoords.height*2)
    }
    eventWindow.style.left = (eventX+diffX)+"px";
    eventWindow.style.top  = (eventY+diffY)+"px";

    document.querySelector("#calendar-event-delete").onclick = ()=>{deleteEvent(event.id)}
}
function closeEventWindow(){
    if(document.querySelector(".calendar-event-window").style.display !== "none"){
        fadeOut(".calendar-event-window", 0.1, ()=>{
            document.querySelector(".calendar-event-color").style.backgroundColor = "rgba(0,0,0,0)";
            document.querySelector(".calendar-event-data-title").innerText = "";
            document.querySelector(".calendar-event-data-date").innerText = "";
            document.querySelector("#calendar-event-delete").onclick = null;
        });
    }
}
function generateEventTime(date){
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const currDate = new Date(date);

    let dayIndex = currDate.getDay();
    let monthIndex = currDate.getMonth();
    let day = currDate.getDate();
    let time = "";

    let timeIndex = date.indexOf("T");
    if(timeIndex !== -1){
        let plusIndex = date.indexOf("+");
        time = " - "+date.slice(timeIndex+1, plusIndex);
    }

    return days[dayIndex]+", "+months[monthIndex]+" "+day+time;
}

/*--Calendar Events----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
async function loadCalendarEvents(){
    try{
        const response = await fetch("/api/calendar");
        const events = await response.json();
        generateCalendarEvents(events);
    }
    catch(error){
        console.log("Load calendar events error:", error);
        alert("Error loading calendar events");
    }
}
async function createEvent(date, currDate){
    const title = prompt("Event title");
    if(title !== ""){
        const eventData = {
            title:title,
            description:"",
            start:new Date(currDate),
            end:new Date(currDate)
        };
    
        try {
            const response = await fetch("/api/calendar/add", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify(eventData)
            });
    
            if(!response.ok) alert("Failed to create event");
            else{
                const updateDate = new CustomEvent("update-date", {detail:{date:date}});
                window.dispatchEvent(updateDate);
            }
        }
        catch(error){
            console.error("Create event error", error);
            alert("Error creating event");
        }
    }
}
async function deleteEvent(eventID){
    if(!confirm("Are you sure you want to delete this event?")) return;
    try{
        const response = await fetch("/api/calendar-delete/"+eventID, {
            method:"DELETE", headers:{"Content-Type":"application/json"}
        });
        if(!response.ok) alert("Event deletion error");
        else{
            document.getElementById("event-"+eventID).remove();
            closeEventWindow();
        }
    }   
    catch(error){
        console.error("Delete event error ", error);
        alert("Event deletion error");
    }
}