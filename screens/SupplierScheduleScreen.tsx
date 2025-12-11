import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';
import { useItem } from '../context/ItemContext';
import Button from '../components/Button';

const SupplierScheduleScreen: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { bookings } = useBooking();
    const { items } = useItem();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());

    const myBookings = useMemo(() => {
        return bookings.filter(b => b.supplierId === user?.id && b.status !== 'Cancelled');
    }, [bookings, user]);

    const getBookingsForDate = (dateStr: string) => {
        return myBookings.filter(b => b.date === dateStr);
    };

    const handleDateClick = (date: Date) => {
        setSelectedDate(date);
    };

    const handleToggleBlockDate = () => {
        if (!user) return;
        const dateStr = selectedDateStr;
        const blockedDates = user.blockedDates || [];
        const isBlocked = blockedDates.includes(dateStr);

        const newBlockedDates = isBlocked
            ? blockedDates.filter(d => d !== dateStr)
            : [...blockedDates, dateStr];

        updateUser({ ...user, blockedDates: newBlockedDates });
    };

    const calendarData = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
        const leadingBlanks = Array.from({ length: firstDay }, (_, i) => null);

        return [...leadingBlanks, ...days];
    }, [currentDate]);

    const changeMonth = (offset: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + offset);
            return newDate;
        });
    };

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Derived state for the selected date
    const selectedDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    const selectedDateBookings = getBookingsForDate(selectedDateStr);
    const isSelectedDateBlocked = user?.blockedDates?.includes(selectedDateStr);

    return (
        <div className="p-4 space-y-6">
            {/* Calendar Section */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700 overflow-hidden">
                <div className="p-4 flex justify-between items-center border-b border-neutral-100 dark:border-neutral-700">
                    <h2 className="font-bold text-lg text-neutral-800 dark:text-neutral-100">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <div className="flex space-x-2">
                        <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <button onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="p-4">
                    <div className="grid grid-cols-7 gap-1 text-center mb-2">
                        {dayNames.map(day => (
                            <div key={day} className="text-xs font-semibold text-neutral-400 uppercase tracking-wider py-1">
                                {day}
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-7 gap-1">
                        {calendarData.map((day, index) => {
                            if (!day) return <div key={`blank-${index}`} className="h-10"></div>;

                            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                            const dateString = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const dayBookings = getBookingsForDate(dateString);
                            const isBlocked = user?.blockedDates?.includes(dateString);
                            const isToday = dateString === todayString;
                            const isSelected = dateObj.toDateString() === selectedDate.toDateString();

                            const hasConfirmed = dayBookings.some(b => b.status === 'Confirmed' || b.status === 'Completed');
                            const hasPending = dayBookings.some(b => b.status === 'Pending Confirmation');

                            let containerClass = "h-10 relative flex items-center justify-center rounded-full cursor-pointer transition-all mx-auto w-10 ";

                            // Priority: Blocked (rest day) styling > Selected > Today > Default
                            if (isBlocked) {
                                // Rest day - always red, even when selected
                                if (isSelected) {
                                    containerClass += "bg-red-500 text-white font-bold shadow-md transform scale-105";
                                } else {
                                    containerClass += "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 font-medium";
                                }
                            } else if (isSelected) {
                                containerClass += "bg-primary text-white font-bold shadow-md transform scale-105";
                            } else if (isToday) {
                                containerClass += "bg-primary/10 text-primary font-bold";
                            } else {
                                containerClass += "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700";
                            }

                            return (
                                <div key={day} className="flex justify-center">
                                    <div onClick={() => handleDateClick(dateObj)} className={containerClass}>
                                        {day}
                                        {/* Rest Day Indicator (Red Cross) */}
                                        {isBlocked && !isSelected && (
                                            <div className="absolute inset-0 flex items-center justify-center opacity-50 pointer-events-none">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </div>
                                        )}
                                        {/* Booking Indicators (Dots) */}
                                        <div className="absolute bottom-1 flex space-x-0.5 justify-center">
                                            {/* Red dot for rest days */}
                                            {!isSelected && isBlocked && (
                                                <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                                            )}
                                            {!isSelected && !isBlocked && hasConfirmed && (
                                                <div className="w-1 h-1 rounded-full bg-green-500"></div>
                                            )}
                                            {!isSelected && !isBlocked && hasPending && (
                                                <div className="w-1 h-1 rounded-full bg-yellow-500"></div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Selected Date Details */}
            <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-sm border border-neutral-100 dark:border-neutral-700 p-5">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="font-bold text-xl text-neutral-900 dark:text-white">
                            {selectedDate.toLocaleDateString('default', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h3>
                        {selectedDateBookings.length > 0 ? (
                            <p className="text-sm text-neutral-500 font-medium mt-1">
                                {selectedDateBookings.length} booking{selectedDateBookings.length !== 1 ? 's' : ''} scheduled
                            </p>
                        ) : (
                            <p className="text-sm text-neutral-500 mt-1">No bookings scheduled</p>
                        )}
                    </div>

                    {/* Rest Day Action */}
                    <div className="flex flex-col items-end">
                        <span className="text-xs font-semibold text-neutral-500 mb-1.5 uppercase tracking-wide">Actions</span>
                        <button
                            onClick={handleToggleBlockDate}
                            className={`flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${isSelectedDateBlocked
                                ? 'bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50'
                                : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                                }`}
                        >
                            {isSelectedDateBlocked ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Cancel Rest Day
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                    </svg>
                                    Take a Rest Day
                                </>
                            )}
                        </button>
                    </div>
                </div>

                <div className="space-y-3">
                    {isSelectedDateBlocked ? (
                        <div className="text-center py-10 bg-red-50 dark:bg-red-900/10 rounded-xl border border-dashed border-red-200 dark:border-red-800">
                            <div className="bg-red-100 dark:bg-red-800/30 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                            </div>
                            <h4 className="font-bold text-red-700 dark:text-red-400 mb-1">Rest Day Active</h4>
                            <p className="text-sm text-red-600 dark:text-red-300">You are not receiving requests for this day.</p>
                        </div>
                    ) : selectedDateBookings.length > 0 ? (
                        selectedDateBookings
                            .sort((a, b) => a.startTime.localeCompare(b.startTime))
                            .map(booking => {
                                const item = items.find(i => i.id === booking.itemId);
                                const isConfirmed = booking.status === 'Confirmed' || booking.status === 'Completed' || booking.status === 'Arrived' || booking.status === 'In Process';

                                return (
                                    <div key={booking.id} className="flex group bg-white dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700 hover:border-primary/30 rounded-xl p-3 transition-all hover:shadow-sm">
                                        <div className="flex-shrink-0 w-16 flex flex-col items-center justify-center border-r border-neutral-100 dark:border-neutral-700 pr-3 mr-3">
                                            <span className="text-lg font-bold text-neutral-800 dark:text-neutral-200">{booking.startTime}</span>
                                            <span className="text-xs text-neutral-400 uppercase font-semibold">{booking.estimatedDuration ? `${booking.estimatedDuration}h` : 'Task'}</span>
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h4 className="font-bold text-neutral-800 dark:text-neutral-100 truncate">{item?.name || 'Service'}</h4>
                                                <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${booking.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                    booking.status === 'Confirmed' ? 'bg-blue-100 text-blue-700' :
                                                        booking.status === 'In Process' ? 'bg-purple-100 text-purple-700' :
                                                            'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {booking.status}
                                                </span>
                                            </div>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center mb-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                </svg>
                                                {booking.location}
                                            </p>
                                            <p className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                                </svg>
                                                Customer ID: {booking.farmerId.substring(0, 6)}...
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                    ) : (
                        <div className="text-center py-10">
                            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <p className="text-neutral-400 font-medium">No bookings for this date</p>
                            <p className="text-xs text-neutral-400 mt-1">Enjoy your free time!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupplierScheduleScreen;