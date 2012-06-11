
require(["jquery", "mymodule", "fullcalendar"], function($, m) {
    //the fullcalendar plugins have been loaded.
    $(function() {
        
        var loadAnker = function (event) {
            //alert (JSON.stringify(event));
            $('.model-dialog').toggle();
            $('#signup-ct').load (event.target.pathname, function () {alert ('loaded');});
            return false;
        }
        
        
        $(document).on('click', 'a', loadAnker);  
        
        $('.showcal').fullCalendar({
					// put your options and callbacks here
					 weekends: false,
					 defaultView: 'agendaWeek',
					 height: 401,
					 events: [
							{
								title  : m.someValue,
								start  : '2012-06-04 12:30:00',
								end    : '2012-06-04 14:30:00',
								allDay : false // will make the time show
							}
						]
				});
    });
});