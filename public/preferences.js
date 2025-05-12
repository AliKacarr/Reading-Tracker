document.addEventListener('DOMContentLoaded', function () { //Tablonun ilk günü seçimi
    const savedFirstDay = localStorage.getItem('preferredFirstDay');

    if (firstDaySelect) {
        if (savedFirstDay !== null) {
            firstDayOfWeek = parseInt(savedFirstDay);
            firstDaySelect.value = savedFirstDay;
        } else {
            firstDayOfWeek = parseInt(firstDaySelect.value);
        }

        // Add event listener for combobox changes
        firstDaySelect.addEventListener('change', function () {
            firstDayOfWeek = parseInt(this.value);
            localStorage.setItem('preferredFirstDay', this.value);
            weekOffset = 0;
            loadTrackerTable();
        });
    }
});