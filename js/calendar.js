function loadCalendar(){
    /*const calendarDIV = document.getElementById("calendar");
    const calendar = new FullCalendar.Calendar(calendarDIV, {
        plugins:["dayGrid", "interaction"],
        initialView:"dayGridMonth",
        headerToolbar:{
            left:"prev,next today",
            center:"title",
            right:"dayGridMonth,dayGridWeek,dayGridDay"
        },
        editable:true,
        selectable:true,
        eventLimit:true,
        events:"/api/calendar",
        dateClick:(info)=>{createEvent(info.date)},
        eventClick:(info)=>{editEvent(info.event)},
        eventDrop:(info)=>{updateEvent(info.event)}
    });
    calendar.render();


    function createEvent(date){
        const title = prompt("Enter event title:");
        if(title){
            fetch("/api/calendar", {
                method:"POST",
                headers:{"Content-Type":"application/json"},
                body:JSON.stringify({
                    title:title,
                    start:date.toISOString(),
                    end:new Date(date.getTime() + 60*60*1000).toISOString()
                })
            })
            .then(() => calendar.refetchEvents());
        }
    }
    function editEvent(event){
        const newTitle = prompt("Edit event title:", event.title);
        if(newTitle !== null) {
            fetch("/api/calendar/"+event.id, {
                method:"PUT",
                body:JSON.stringify({title:newTitle})
            })
            .then(() => calendar.refetchEvents());
        }
    }
    function updateEvent(event){
        fetch("/api/calendar/"+event.id, {
            method:"PUT",
            body:JSON.stringify({
                start:event.start.toISOString(),
                end:event.end?.toISOString()
            })
        });
    }*/
}