import React, { useState } from "react";

function Clienti() {
  const [events, setEvents] = useState([
    { id: "1", title: "Appuntamento con Rossi", start: "2025-08-25T10:00:00" },
    { id: "2", title: "Follow-up con Bianchi", start: "2025-08-26T14:00:00" },
  ]);

  const handleDateClick = (info) => {
    const title = prompt("Inserisci titolo appuntamento:");
    if (title) {
      setEvents([
        ...events,
        { id: String(events.length + 1), title, start: info.date },
      ]);
    }
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-2xl font-bold mb-4">📅 Agenda Clienti</h1>

      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        editable={true}
        selectable={true}
        events={events}
        dateClick={handleDateClick}
        height="80vh"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "dayGridMonth,timeGridWeek,timeGridDay",
        }}
      />
    </div>
  );
}

export default Clienti;
