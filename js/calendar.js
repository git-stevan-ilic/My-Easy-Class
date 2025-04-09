async function loadCalendar(){
    try{
        const response = await fetch("/api/calendar");
        const events = await response.json();
        
        console.log(events)

        const calendarDIV = document.querySelector(".calendarDIV");
        calendarDIV.innerHTML = events.map(event => `
            <div class="event">
                <h3>${event.summary}</h3>
                <p>${new Date(event.start.dateTime).toLocaleString()}</p>
                <p>${event.description || ''}</p>
            </div>
        `).join('');
    }
    catch(error){
        console.error("Error loading calendar:", error);
    }
}

  