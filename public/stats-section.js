async function loadReadingStats() {
    try {
        // Fetch the reading statistics from the server
        const response = await fetch('/api/reading-stats');
        const userStats = await response.json();

        // Get all stats to calculate "okumadım" counts
        const allDataResponse = await fetch('/api/all-data');
        const allData = await allDataResponse.json();

        // Create a map of all dates with status for each user
        const userDatesMap = {};

        // Initialize the map for each user
        for (const user of allData.users) {
            userDatesMap[user._id] = {};
        }

        // Fill in the map with actual statuses
        for (const stat of allData.stats) {
            if (!userDatesMap[stat.userId]) {
                userDatesMap[stat.userId] = {};
            }
            userDatesMap[stat.userId][stat.date] = stat.status;
        }

        // Calculate "okumadım" counts for each user
        const enhancedUserStats = userStats.map(user => {
            const userStatuses = userDatesMap[user.userId] || {};
            const okumadimCount = Object.values(userStatuses).filter(status => status === 'okumadım').length;

            return {
                ...user,
                okumadim: okumadimCount
            };
        });

        // Get the canvas element
        const ctx = document.getElementById('readingStatsChart');

        // Check if the canvas exists
        if (!ctx) {
            console.error('Chart canvas element not found');
            return;
        }

        // Prepare data for the chart
        const labels = enhancedUserStats.map(user => user.name);
        const okudumData = enhancedUserStats.map(user => user.okudum);
        const okumadimData = enhancedUserStats.map(user => user.okumadim);

        // Calculate success rates
        const successRates = enhancedUserStats.map(user => {
            const total = user.okudum + user.okumadim;
            return total > 0 ? Math.round((user.okudum / total) * 100) : 0;
        });

        // Find the highest success rate
        const highestSuccessRate = Math.max(...successRates);

        // Create background colors array based on success rates
        const okudumBackgroundColors = enhancedUserStats.map((user, index) => {
            // If this user has the highest success rate, highlight with a more vibrant color
            return successRates[index] === highestSuccessRate
                ? 'rgba(76, 217, 99, 0.95)' // Brighter green for highest success rate
                : 'rgba(68, 206, 91, 0.79)'; // Regular green for others
        });

        // Create border colors array based on success rates
        const okudumBorderColors = enhancedUserStats.map((user, index) => {
            // If this user has the highest success rate, highlight with a thicker border
            return successRates[index] === highestSuccessRate
                ? 'rgba(50, 180, 80, 1)' // Darker green border for highest success rate
                : 'rgba(76, 217, 100, 1)'; // Regular green border for others
        });

        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Check if there's an existing chart instance
        if (window.readingStatsChart instanceof Chart) {
            window.readingStatsChart.destroy();
        }

        // Create the chart
        window.readingStatsChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Okudum',
                        data: okudumData,
                        backgroundColor: okudumBackgroundColors,
                        borderColor: okudumBorderColors,
                        borderWidth: enhancedUserStats.map((user, index) =>
                            successRates[index] === highestSuccessRate ? 2 : 1
                        ),
                        hoverBackgroundColor: 'rgba(63, 194, 63, 0.9)'
                    },
                    {
                        label: 'Okumadım',
                        data: okumadimData,
                        backgroundColor: 'rgba(255, 100, 60, 0.7)',
                        borderColor: 'rgba(255, 100, 60, 1)',
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 10,    // üstten boşluk (px)
                        bottom: 10,  // alttan boşluk (px)
                        left: 10,   // soldan boşluk (px)
                        right: 10   // sağdan boşluk (px)
                    }
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: true,
                            text: 'Kullanıcılar',
                            color: '#000000',
                            font: {
                                weight: 'bold',
                                size: 15 // Yazı boyutunu artırdık
                            }
                        },
                        ticks: {
                            color: '#000000',
                            font: {
                                size: 16
                            }
                        },
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Gün Sayısı',
                            color: '#000000',
                            font: {
                                weight: 'bold',
                                size: 15 // Yazı boyutunu artırdık
                            }
                        },
                        ticks: {
                            color: '#000000',
                            font: {
                                size: 13 // Kullanıcı isimlerinin yazı boyutu artırıldı
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            afterBody: function (context) {
                                const index = context[0].dataIndex;
                                return `Başarı Oranı: %${successRates[index]}`;
                            }
                        },
                        titleColor: '#000000',
                        bodyColor: '#000000',
                        backgroundColor: 'rgba(255, 255, 255, 0.9)',
                        borderColor: 'rgba(0, 0, 0, 0.2)',
                        borderWidth: 1
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#000000',
                            font: {
                                weight: 'bold',
                                size: 14
                            }
                        }
                    },
                    datalabels: {
                        display: function (context) {
                            // Only show for the first dataset (Okudum)
                            return context.datasetIndex === 0;
                        },
                        formatter: function (value, context) {
                            const index = context.dataIndex;
                            const successRate = successRates[index];
                            const isHighest = successRate === highestSuccessRate;
                            const isLowest = successRate === Math.min(...successRates);

                            // Add crown emoji for users with the highest success rate
                            // Add alert emoji for users with the lowest success rate
                            if (isHighest) {
                                return `👑 %${successRate}`;
                            } else if (isLowest) {
                                return `💀 %${successRate}`;
                            } else {
                                return `%${successRate}`;
                            }
                        },
                        align: 'start',        // Align at the end of the bar
                        anchor: 'end',
                        offset: 0,             // Position above the bar
                        rotation: 0,           // Ensure text is horizontal
                        color: '#000000',
                        backgroundColor: 'rgba(255, 244, 244, 0.9)', // More opaque background
                        borderColor: 'rgba(0, 0, 0, 0.2)',
                        borderWidth: 1.2,
                        borderRadius: 4,
                        font: {
                            weight: 'bold',
                            size: 15 // Set a fixed larger font size for all labels
                        },
                        padding: {
                            top: 4,
                            bottom: 4,
                            left: 6,
                            right: 6
                        },
                        z: 100
                    }
                }
            },
            plugins: [ChartDataLabels] // Add the ChartDataLabels plugin
        });
    } catch (error) {
        console.error('Error loading reading stats:', error);
    }
}