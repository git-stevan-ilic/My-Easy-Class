/*--Initial------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function loadCalendar(){
    let date = getCurrDate();
    generateCalendarElements(date);
    loadCalendarEvents(date);

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
        loadCalendarEvents(date);
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
        loadCalendarEvents(date);
        closeEventWindow();
    }

    window.addEventListener("resize", closeEventWindow);
    window.addEventListener("update-date", (e)=>{
        date = e.detail.date;
        calendarDate.value = date;
        displayCurrDate(date);
        generateCalendarElements(date);
        loadCalendarEvents(date);
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
function getCurrDate(customDate){
    let date = new Date();
    if(customDate) date = new Date(customDate);
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

        days[i+7].onclick = ()=>{openEditEvent(date, true, currDate)};
    }
}
function generateCalendarEvents(events, date){
    generateDashboardCalendarEvents(events);
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

            newEvent.onclick = (e)=>{openEventWindow(e, date, events[i], newEvent.getBoundingClientRect())}
            newEvent.id = "event-"+events[i].id;
        }
        catch{}
    }
}
function generateDashboardCalendarEvents(events){
    let upcoming = [];
    for(let i = 0; i < events.length; i++){
        const eventDate = new Date(events[i].start);
        const dayDiff = (eventDate - new Date())/1000/60/60/24;
        if(dayDiff < 31 && dayDiff > 0) upcoming.push(events[i]);
    }

    const upcomingEvents = document.querySelector("#upcoming-events");
    if(upcoming.length === 0) upcomingEvents.innerHTML = "No upcoming events";
    else{
        upcomingEvents.innerHTML = "";
        for(let i = 0; i < upcoming.length; i++){
            const dashboardEvent = document.createElement("div");
            const dashboardEventName = document.createElement("div");
            const dashboardEventDate = document.createElement("div");
            
            dashboardEvent.className = "dashboatd-event";
            dashboardEventName.className = "dashboatd-event-name";
            dashboardEventDate.className = "dashboatd-event-date";
            dashboardEventName.innerText = upcoming[i].title;
            dashboardEventDate.innerText = generateEventTime(upcoming[i].start);
    
            dashboardEvent.appendChild(dashboardEventName);
            dashboardEvent.appendChild(dashboardEventDate);
            upcomingEvents.appendChild(dashboardEvent);

            dashboardEvent.onclick = ()=>{
                const tabHolder = document.querySelector(".tab-holder");
                tabHolder.children[2].click();

                const calendarDate = document.querySelector("#calendar-date");
                const upcomingDate = new Date(upcoming[i].start);
                const uY = JSON.stringify(upcomingDate.getFullYear()).padStart(2, "0");
                const uM = JSON.stringify(upcomingDate.getMonth()+1).padStart(2, "0");
                const uD = JSON.stringify(upcomingDate.getDate()).padStart(2, "0");
                const u = uY+"-"+uM+"-"+uD;

                const updateCalendar = new CustomEvent("update-date", {detail:{date:u}});
                window.dispatchEvent(updateCalendar);
            }
        }
    }
}

/*--Calendar Event Elements--------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
function openEventWindow(e, date, event, coords){
    e.stopPropagation();
    document.querySelector(".calendar-event-color").style.backgroundColor = event.color;
    document.querySelector(".calendar-event-data-title").innerText = event.title;
    document.querySelector(".calendar-event-data-date").innerText = generateEventTime(new Date(event.start));
    document.querySelector(".calendar-event-data-desc").innerText = event.description;
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

    if(window.innerWidth < 768){
        eventWindow.style.top = "calc(50% - 6rem)";
        eventWindow.style.left = "50%";
    }

    document.querySelector("#calendar-event-edit").onclick = ()=>{openEditEvent(date, false, getCurrDate(event.start), event)}
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

    const dayIndex = currDate.getDay();
    const monthIndex = currDate.getMonth();
    const day = currDate.getDate();

    const hours = JSON.stringify(currDate.getHours()).padStart(2, "0")
    const minutes = JSON.stringify(currDate.getMinutes()).padStart(2, "0")
    return days[dayIndex]+", "+months[monthIndex]+" "+day+" - "+hours+":"+minutes;
}
function openEditEvent(date, isNew, currDate, event){
    const windowHead = document.querySelector(".edit-calendar-event-window-head");
    const editTimeConfirm = document.querySelector("#edit-time-confirm");
    document.querySelector("#edit-time-cancel").onclick = closeEditEvent;
    
    if(!isNew){
        const tempDate = new Date(event.start);
        const h = JSON.stringify(tempDate.getHours()).padStart(2, "0");
        const m = JSON.stringify(tempDate.getMinutes()).padStart(2, "0");

        document.querySelector("#edit-event-name").value = event.title;
        document.querySelector("#edit-event-desc").value = event.description;
        document.querySelector("#edit-event-time").value = h+":"+m;
        editTimeConfirm.onclick = ()=>{confirmEventEdit(event.id, currDate)}
        windowHead.innerText = "Edit Event";
        closeEventWindow();
    }
    else{
        editTimeConfirm.onclick = ()=>{confirmEventAdd(date, currDate)}
        windowHead.innerText = "New Event";
    }

    fadeIn("#edit-calendar-event" , 0.2);
}
function closeEditEvent(){
    fadeOut("#edit-calendar-event" , 0.2, ()=>{
        document.querySelector("#edit-time-confirm").onclick = null;
        document.querySelector("#edit-event-name").value = "";
        document.querySelector("#edit-event-desc").value = "";
        document.querySelector("#edit-event-time").value = "";
    });
}
function confirmEventAdd(date, currDate){
    const name = document.querySelector("#edit-event-name").value;
    const desc = document.querySelector("#edit-event-desc").value;
    const time = document.querySelector("#edit-event-time").value;

    if(!name || !desc || !time){
        notification("Fill out all fields");
        return;
    }
    const currDateTime = currDate+"T"+document.querySelector("#edit-event-time").value;
    createEvent(date, currDateTime, name, desc);
}
function confirmEventEdit(eventID, currDate){
    const name = document.querySelector("#edit-event-name").value;
    const desc = document.querySelector("#edit-event-desc").value;
    const time = document.querySelector("#edit-event-time").value;

    if(!name || !desc || !time){
        notification("Fill out all fields");
        return;
    }
    const currDateTime = currDate+"T"+document.querySelector("#edit-event-time").value+":00+00:00";
    editEvent(eventID, name, desc, currDateTime);
}

/*--Calendar Events----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------*/
async function loadCalendarEvents(date){
    try{
        const response = await fetch("/api/calendar");
        const events = await response.json();
        generateCalendarEvents(events, date);
    }
    catch(error){
        console.log("Load calendar events error:", error);
    }
}
async function createEvent(date, currDate, title, description){
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const eventData = {
        title:title, description:description,
        start:toRFC3339Local(currDate),
        end:toRFC3339Local(currDate),
        timeZone:timeZone
    };
    try{
        const response = await fetch("/api/calendar/add", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify(eventData)
        });

        if(!response.ok) notification("Failed to create event");
        else{
            const updateDate = new CustomEvent("update-date", {detail:{date:date}});
            window.dispatchEvent(updateDate);
            closeEditEvent();
        }
    }
    catch(error){
        console.error("Create event error", error);
        notification("Error creating event");
    }
}
async function deleteEvent(eventID){
    if(!confirm("Are you sure you want to delete this event?")) return;
    try{
        const response = await fetch("/api/calendar/delete/"+eventID, {
            method:"DELETE", headers:{"Content-Type":"application/json"}
        });
        if(!response.ok) notification("Event deletion error");
        else{
            document.getElementById("event-"+eventID).remove();
            closeEventWindow();
        }
    }   
    catch(error){
        console.error("Delete event error ", error);
        notification("Event deletion error");
    }
}
async function editEvent(eventID, title, description, time){
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lastIndex = time.lastIndexOf("+") - 3;
    const currTime = time.slice(0, lastIndex)
    const updatedData = {
        title:title, description:description,
        start:toRFC3339Local(currTime),
        end:toRFC3339Local(currTime),
        timeZone:timeZone
    }
    const response = await fetch("/api/calendar/edit/"+eventID, {
        method:"PUT",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify(updatedData),
    });
    
    const result = await response.json();
    if(result.status === 200){
        document.querySelector("#calendar-today").click();
        closeEditEvent();
    }
}
function toRFC3339Local(dtString){
    const date = new Date(dtString);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    const offsetMinutes = date.getTimezoneOffset(); // in minutes
    const offsetSign = offsetMinutes <= 0 ? '+' : '-';
    const offsetHours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0');
    const offsetMins = String(Math.abs(offsetMinutes) % 60).padStart(2, '0');
    const offset = `${offsetSign}${offsetHours}:${offsetMins}`;

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${offset}`;
}
