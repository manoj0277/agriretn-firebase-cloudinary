import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBooking } from '../context/BookingContext';

const SupplierScheduleScreen: React.FC = () => {
    const { user, updateUser } = useAuth();
    const { bookings } = useBooking();
    const [currentDate, setCurrentDate] = useState(new Date());

    const supplierBookings = useMemo(() => {
        return bookings
            .filter(b => b.supplierId === user?.id && b.status !== 'Cancelled')
            .map(b => b.date);
    }, [bookings, user]);

    const handleDateClick = (date: string) => {
        if (!user) return;
        const blockedDates = user.blockedDates || [];
        const isBlocked = blockedDates.includes(date);

        const newBlockedDates = isBlocked
            ? blockedDates.filter(d => d !== date)
            : [...blockedDates, date];

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
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;


    return (
        <div className="p-4">
            <div className="bg-white p-4 rounded-lg border border-neutral-200">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-800">&lt;</button>
                    <h2 className="font-bold text-lg text-neutral-800">
                        {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-neutral-100 text-neutral-800">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-neutral-800 mb-2">
                    {dayNames.map(day => <div key={day}>{day}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {calendarData.map((day, index) => {
                        if (!day) return <div key={`blank-${index}`}></div>;
                        
                        const dateString = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isBooked = supplierBookings.includes(dateString);
                        const isBlocked = user?.blockedDates?.includes(dateString);
                        const isToday = dateString === todayString;

                        let classes = "h-12 flex items-center justify-center rounded-lg cursor-pointer transition-colors ";

                        if (isBooked) {
                            classes += "bg-primary/80 text-white font-bold cursor-not-allowed";
                        } else if (isBlocked) {
                            classes += "bg-neutral-200 text-neutral-900 relative";
                        } else {
                            classes += "bg-neutral-100 text-neutral-800 hover:bg-neutral-200";
                        }
                        
                        if (isToday) {
                            classes += " border-2 border-primary";
                        }

                        return (
                            <div key={day} onClick={() => !isBooked && handleDateClick(dateString)} className={classes}>
                                {day}
                                {isBlocked && <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500 transform -rotate-45"></div>}
                            </div>
                        );
                    })}
                </div>
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-neutral-800">
                    <div className="flex items-center"><span className="w-4 h-4 rounded-full bg-primary/80 mr-2"></span>Booked</div>
                    <div className="flex items-center"><span className="w-4 h-4 rounded-full bg-red-500 mr-2"></span>Blocked</div>
                    <div className="flex items-center"><span className="w-4 h-4 rounded-full bg-neutral-100 border border-neutral-300 mr-2"></span>Available</div>
                </div>
            </div>
        </div>
    );
};

export default SupplierScheduleScreen;