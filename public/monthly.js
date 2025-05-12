// Monthly Calendar Functionality
document.addEventListener('DOMContentLoaded', function () {
    // Elements
    const prevMonthBtn = document.getElementById('prevMonth');
    const nextMonthBtn = document.getElementById('nextMonth');
    const monthYearHeader = document.getElementById('monthYearHeader');
    const calendarBody = document.getElementById('calendarBody');

    // Track current month and year
    let currentDate = new Date();
    let currentMonth = currentDate.getMonth();
    let currentYear = currentDate.getFullYear();

    // Track selected user
    let selectedUser = null;

    // Month names in Turkish
    const monthNames = [
        'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
        'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
    ];

    // Day names in Turkish (starting from Monday)
    const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Pzr'];

    // Add user selector above the calendar
    const userSelectorContainer = document.createElement('div');
    userSelectorContainer.className = 'user-selector-container';
    userSelectorContainer.innerHTML = `
    <label for="userSelector">Kullanıcı Seçin:</label>
    <select id="userSelector" class="user-selector"></select>
  `;

    // Insert user selector before the calendar container (not before month-navigation)
    const monthlyCalendarSection = document.querySelector('.monthly-calendar-section');
    const monthlyCalendarContainer = document.querySelector('.monthly-calendar-container');
    if (monthlyCalendarSection && monthlyCalendarContainer) {
        monthlyCalendarSection.insertBefore(userSelectorContainer, monthlyCalendarContainer);
    }

    // Get user selector element
    const userSelector = document.getElementById('userSelector');

    // Populate user selector with users from the main table
    function populateUserSelector() {
        const userSelector = document.getElementById('userSelector');
        if (!userSelector) return;

        // Clear existing options
        userSelector.innerHTML = '';

        // Fetch users directly from the API
        fetch('/api/all-data')
            .then(response => response.json())
            .then(data => {
                if (data.users && Array.isArray(data.users)) {
                    // Sort users alphabetically
                    data.users.sort((a, b) => a.name.localeCompare(b.name));

                    // Add each user to the selector
                    data.users.forEach(user => {
                        const option = document.createElement('option');
                        option.value = user.name;
                        option.textContent = user.name;
                        option.dataset.userId = user._id; // Store user ID for easier access
                        userSelector.appendChild(option);
                    });

                    // Select first user by default
                    if (userSelector.options.length > 0) {
                        selectedUser = userSelector.options[0].value;
                        userSelector.value = selectedUser;
                        // Generate calendar with the selected user
                        generateCalendar(currentMonth, currentYear);
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching users:', error);
            });
    }

    // Call this function after the main table is loaded
    window.updateMonthlyCalendarUsers = populateUserSelector;

    // Listen for user selection changes
    userSelector.addEventListener('change', function () {
        const previousUser = selectedUser;
        selectedUser = this.value;

        // Log the user selection change
        if (typeof logUnauthorizedAccess === 'function') {
            logUnauthorizedAccess(`monthly-calendar-user-change: ${previousUser}-to-${selectedUser}`);
        }

        generateCalendar(currentMonth, currentYear);
    });

    // Initialize calendar
    generateCalendar(currentMonth, currentYear);

    // Event listeners for navigation buttons
    prevMonthBtn.addEventListener('click', function () {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        generateCalendar(currentMonth, currentYear);
    });

    nextMonthBtn.addEventListener('click', function () {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        generateCalendar(currentMonth, currentYear);
    });

    // Function to generate the calendar
    function generateCalendar(month, year) {
        // Update month display
        monthYearHeader.textContent = `${monthNames[month]} ${year}`;

        // Add selected user name to the header if available
        if (selectedUser) {
            monthYearHeader.textContent = `${monthNames[month]} ${year}`;
        }

        // Add loading indicator to the calendar container
        const calendarContainer = calendarBody.closest('.monthly-calendar-container');

        // Remove any existing loading indicator first
        const existingLoader = document.querySelector('.calendar-loading');
        if (existingLoader) {
            existingLoader.remove();
        }

        // Create new loading indicator
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'calendar-loading';
        loadingIndicator.innerHTML = '<div class="spinner"></div><p>Yükleniyor...</p>';

        // Add loading indicator directly to the calendar container
        if (calendarContainer) {
            calendarContainer.appendChild(loadingIndicator);
        }

        // Get first day of month (0 = Sunday, 1 = Monday, etc.)
        let firstDay = new Date(year, month, 1).getDay();
        // Adjust for Monday as first day of week
        firstDay = firstDay === 0 ? 6 : firstDay - 1;

        // Get number of days in month
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Get number of days in previous month
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        // Calculate rows needed (maximum 6 rows)
        const rows = Math.ceil((daysInMonth + firstDay) / 7);

        // Current date for highlighting today
        const today = new Date();
        const todayDate = today.getDate();
        const todayMonth = today.getMonth();
        const todayYear = today.getFullYear();

        // If a user is selected, fetch their reading data
        if (selectedUser) {
            // Fetch all data including user stats
            fetch('/api/all-data')
                .then(response => response.json())
                .then(data => {
                    // Find the user by name
                    const user = data.users.find(u => u.name === selectedUser);
                    if (!user) return;

                    // Filter stats for this user and month
                    const userStats = data.stats.filter(s => {
                        if (s.userId !== user._id) return false;

                        // Check if the date is in the current month/year
                        const dateParts = s.date.split('-');
                        const statYear = parseInt(dateParts[0]);
                        const statMonth = parseInt(dateParts[1]) - 1; // Convert to 0-based month

                        return statYear === year && statMonth === month;
                    });

                    // Now clear the calendar and remove loading indicator
                    calendarBody.innerHTML = '';
                    const loadingElement = calendarContainer.querySelector('.calendar-loading');
                    if (loadingElement) {
                        loadingElement.remove();
                    }

                    // Render calendar with the filtered stats
                    renderCalendarWithData(rows, firstDay, daysInMonth, daysInPrevMonth, todayDate, todayMonth, todayYear, userStats);
                })
                .catch(error => {
                    console.error('Error fetching user data:', error);

                    // Clear the calendar and remove loading indicator even on error
                    calendarBody.innerHTML = '';
                    const loadingElement = calendarContainer.querySelector('.calendar-loading');
                    if (loadingElement) {
                        loadingElement.remove();
                    }

                    renderCalendarWithData(rows, firstDay, daysInMonth, daysInPrevMonth, todayDate, todayMonth, todayYear, []);
                });
        } else {
            // No user selected, clear and render empty calendar
            calendarBody.innerHTML = '';
            const loadingElement = calendarContainer ? calendarContainer.querySelector('.calendar-loading') : null;
            if (loadingElement) {
                loadingElement.remove();
            }

            renderCalendarWithData(rows, firstDay, daysInMonth, daysInPrevMonth, todayDate, todayMonth, todayYear, []);
        }
    }

    // Helper function to render calendar with data
    function renderCalendarWithData(rows, firstDay, daysInMonth, daysInPrevMonth, todayDate, todayMonth, todayYear, stats) {
        let date = 1;
        for (let i = 0; i < rows; i++) {
            // Create row
            const row = document.createElement('tr');

            // Create cells for each day of the week
            for (let j = 0; j < 7; j++) {
                const cell = document.createElement('td');

                if (i === 0 && j < firstDay) {
                    // Previous month days
                    const prevMonthDay = daysInPrevMonth - firstDay + j + 1;
                    cell.textContent = prevMonthDay;
                    cell.classList.add('other-month');
                    cell.style.backgroundColor = '#f0f0f0'; // Açık gri arka plan
                    cell.style.color = '#999'; // Soluk metin rengi
                } else if (date > daysInMonth) {
                    // Next month days
                    const nextMonthDay = date - daysInMonth;
                    cell.textContent = nextMonthDay;
                    cell.classList.add('other-month');
                    cell.style.backgroundColor = '#f0f0f0'; // Açık gri arka plan
                    cell.style.color = '#999'; // Soluk metin rengi
                    date++;
                } else {
                    // Current month days
                    cell.textContent = date;
                    const currentDate = date;

                    // Check if it's today
                    if (currentDate === todayDate && currentMonth === todayMonth && currentYear === todayYear) {
                        cell.classList.add('today');
                    }

                    // Find status for this date
                    const dateStr = formatDateForTable(currentDate, currentMonth, currentYear);
                    const dayStat = stats.find(s => s.date === dateStr);

                    // Rest of the code remains the same
                    if (dayStat) {
                        // Apply appropriate styling based on status
                        if (dayStat.status === 'okudum') {
                            cell.classList.add('read');
                            const statusIndicator = document.createElement('div');
                            statusIndicator.className = 'monthly-reading-status';
                            statusIndicator.textContent = '✔️';
                            cell.style.backgroundColor = '#d4edda';
                            cell.style.color = '#155724';
                            cell.style.fontWeight = 'bold';
                            cell.appendChild(statusIndicator);
                        } else if (dayStat.status === 'okumadım') {
                            cell.classList.add('not-read');
                            const statusIndicator = document.createElement('div');
                            statusIndicator.className = 'monthly-reading-status';
                            statusIndicator.textContent = '❌';
                            cell.style.backgroundColor = '#f8d7da';
                            cell.style.color = '#721c24';
                            cell.appendChild(statusIndicator);
                        } else {
                            cell.classList.add('not-applicable');
                            const statusIndicator = document.createElement('div');
                            statusIndicator.className = 'monthly-reading-status';
                            statusIndicator.textContent = '➖';
                            cell.style.backgroundColor = '#e2e3e5';
                            cell.style.color = '#383d41';
                            cell.appendChild(statusIndicator);
                        }

                        // Add click event to toggle reading status
                        cell.addEventListener('click', function () {
                            toggleUserReadingStatus(selectedUser, currentDate, currentMonth, currentYear);
                        });
                    } else {
                        // No status yet, add click event to set status
                        cell.addEventListener('click', function () {
                            toggleUserReadingStatus(selectedUser, currentDate, currentMonth, currentYear);
                        });
                    }

                    date++;
                }

                row.appendChild(cell);
            }

            calendarBody.appendChild(row);
        }
    }

    // Function to get reading status for a specific user and date
    // Function to get reading status for a specific user and date
    function getUserReadingStatus(userName, day, month, year) {
        // Get the date string in the format used in your main table
        const dateStr = formatDateForTable(day, month, year);

        // Fetch user data from API instead of trying to read from the table
        return fetch('/api/all-data')
            .then(response => response.json())
            .then(data => {
                // Find the user by name
                const user = data.users.find(u => u.name === userName);
                if (!user) return null;

                // Find the status for this date
                const stat = data.stats.find(s => s.userId === user._id && s.date === dateStr);
                if (!stat) return null;

                // Return the appropriate status class
                if (stat.status === 'okudum') return 'read';
                if (stat.status === 'okumadım') return 'not-read';
                if (stat.status === 'not-applicable') return 'not-applicable';
                return null;
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                return null;
            });
    }

    // Function to toggle reading status for a specific user and date
    // Function to toggle reading status for a specific user and date
    function toggleUserReadingStatus(userName, day, month, year) {
        // Get the date string in the format used in your API
        const dateStr = formatDateForTable(day, month, year);

        // Find the user ID
        fetch('/api/all-data')
            .then(response => response.json())
            .then(data => {
                const user = data.users.find(u => u.name === userName);
                if (!user) throw new Error('User not found');

                // Find current status
                const stat = data.stats.find(s => s.userId === user._id && s.date === dateStr);
                let currentStatus = stat ? stat.status : '';
                let newStatus = '';

                // Cycle through statuses: empty -> okudum -> okumadım -> empty
                if (currentStatus === '') {
                    newStatus = 'okudum';
                } else if (currentStatus === 'okudum') {
                    newStatus = 'okumadım';
                } else if (currentStatus === 'okumadım') {
                    newStatus = '';
                }

                // Update the status in the database
                return fetch('/api/update-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user._id,
                        date: dateStr,
                        status: newStatus
                    })
                });
            })
            .then(response => {
                if (response && response.ok) {
                    // Refresh the calendar
                    generateCalendar(currentMonth, currentYear);

                    // Also refresh the main table if possible
                    if (window.loadTrackerTable) {
                        window.loadTrackerTable();
                    }
                }
            })
            .catch(error => {
                console.error('Error toggling reading status:', error);
            });
    }

    // Find the user's row in the main table
    function toggleUserReadingStatus(userName, day, month, year) {
        // Get the date string in the format used in your main table
        const dateStr = formatDateForTable(day, month, year);

        // Find the user's row in the main table
        const userRows = document.querySelectorAll('#trackerTable tbody tr');
        for (let i = 0; i < userRows.length; i++) {
            const row = userRows[i];
            const name = row.querySelector('td:first-child').textContent;

            if (name === userName) {
                // Find the cell for this date
                const cells = row.querySelectorAll('td');
                for (let j = 1; j < cells.length; j++) {
                    const headerCell = document.querySelector(`#trackerTable thead th:nth-child(${j + 1})`);
                    if (headerCell && headerCell.getAttribute('data-date') === dateStr) {
                        // Simulate a click on the cell to toggle status
                        cells[j].click();
                        return;
                    }
                }
            }
        }
    }

    // Helper function to format date for table lookup
    function formatDateForTable(day, month, year) {
        // Format should match the data-date attribute in your table headers
        // Adjust this based on your actual date format
        return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
    }

    // Function to update the calendar with actual user reading data
    function updateCalendarWithUserData() {
        // This function would be called after fetching user data
        populateUserSelector();
        generateCalendar(currentMonth, currentYear);
    }

    // Expose the update function globally so it can be called from your main script
    window.updateMonthlyCalendar = updateCalendarWithUserData;

    // Try to populate users initially if the table is already loaded
    setTimeout(populateUserSelector, 500);
});