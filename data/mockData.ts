
import { User, UserRole, Item, ItemCategory, Booking, Review, ChatMessage, ForumPost, CommunityReply, DamageReport, Notification, SupportTicket, WORK_PURPOSES } from '../types';
const PLACEHOLDER_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e5e7eb'/%3E%3Ctext x='400' y='225' font-size='32' text-anchor='middle' dominant-baseline='middle' fill='%236b7280' font-family='Arial'%3EImage%3C/text%3E%3C/svg%3E";

export const users: User[] = [
    { id: 1, name: 'Ravi Kumar', email: 'farmer@test.com', password: 'manoj123', phone: '9876543210', role: UserRole.Farmer, status: 'approved', avgRating: 4.8, locationCoords: { lat: 17.3850, lng: 78.4867 }, profilePicture: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?q=80&w=256&auto=format&fit=crop' },
    { id: 2, name: 'Laxmi Services', email: 'supplier@test.com', password: 'manoj123', phone: '8765432109', role: UserRole.Supplier, status: 'approved', locationCoords: { lat: 17.393, lng: 78.486 }, profilePicture: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=256&auto=format&fit=crop' },
    { id: 3, name: 'Admin User', email: 'admin@test.com', password: 'manoj123', phone: '1234567890', role: UserRole.Admin, status: 'approved', profilePicture: 'https://images.unsplash.com/photo-1502767089025-6572583495b0?q=80&w=256&auto=format&fit=crop' },
    { id: 4, name: 'Suresh Farms', email: 'supplier2@test.com', password: 'password123', phone: '7654321098', role: UserRole.Supplier, status: 'pending', profilePicture: 'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?q=80&w=256&auto=format&fit=crop' },
    { id: 5, name: 'Priya Patel', email: 'farmer2@test.com', password: 'password123', phone: '6543210987', role: UserRole.Farmer, status: 'approved', locationCoords: { lat: 17.41, lng: 78.50 }, profilePicture: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=256&auto=format&fit=crop' },
];

export const items: Item[] = [
    { id: 1, name: 'John Deere 5310', category: ItemCategory.Tractors, purposes: [{ name: 'Ploughing', price: 1500 }, { name: 'Sowing / Planting', price: 1600 }], images: [
        'https://images.unsplash.com/photo-1603903222109-2e8c0fc7b75a?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1608596060523-eb59f8d97249?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1543148180-75b4863e1fd9?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 2, location: 'Hyderabad', available: true, status: 'approved', description: 'Powerful 55 HP tractor for all your heavy-duty farming needs. Well-maintained and reliable.', avgRating: 4.5, model: '5310 4WD', year: 2022, horsepower: 55, condition: 'Good', licensePlate: 'TS09AB1234', locationCoords: { lat: 17.393, lng: 78.486 }, operatorCharge: 300, currentLocation: { lat: 17.393, lng: 78.486 } },
    { id: 2, name: 'Harvesting team', category: ItemCategory.Workers, purposes: [{ name: 'Harvesting', price: 500 }], images: [
        'https://images.unsplash.com/photo-1591181825852-f4a45a6c3a81?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1601758123926-4cf339f4c278?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 2, location: 'Hyderabad', available: true, status: 'approved', description: 'Experienced team of workers for efficient harvesting. Price is per person per hour.', avgRating: 4.7, quantityAvailable: 10, gender: 'Female' },
    { id: 3, name: 'Spraying Drone', category: ItemCategory.Drones, purposes: [{ name: 'Spraying Pesticides/Fertilizers', price: 800 }], images: [
        'https://images.unsplash.com/photo-1535223289827-42f1e9919769?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 4, location: 'Hyderabad', available: true, status: 'pending', description: 'Advanced agricultural drone for efficient spraying. Covers large areas quickly.', model: 'DJI Agras T40', condition: 'New' },
    { id: 4, name: 'JCB 3DX', category: ItemCategory.JCB, purposes: [{ name: 'Digging / Earth Moving', price: 2000 }], images: [
        'https://images.unsplash.com/photo-1523411285165-cc15fc48f4c9?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1516920084814-9d4d94d0d021?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 2, location: 'Hyderabad', available: false, status: 'approved', description: 'Reliable JCB for construction and digging work.', avgRating: 4.2, model: '3DX', year: 2021, condition: 'Fair', licensePlate: 'TS09CD5678', operatorCharge: 400 },
    { id: 5, name: 'Mahindra 575 DI', category: ItemCategory.Tractors, purposes: [{ name: 'Ploughing', price: 1400 }, { name: 'Tilling', price: 1500 }], images: [
        'https://images.unsplash.com/photo-1603903222109-2e8c0fc7b75a?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1543148180-75b4863e1fd9?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 4, location: 'Secunderabad', available: true, status: 'approved', description: 'Reliable 45 HP tractor suitable for medium farms.', avgRating: 4.1, model: '575 DI', year: 2020, horsepower: 45, condition: 'Good', licensePlate: 'TS10EF1234', locationCoords: { lat: 17.435, lng: 78.501 } },
    { id: 6, name: 'Combine Harvester', category: ItemCategory.Harvesters, purposes: [{ name: 'Harvesting', price: 2500 }], images: [
        'https://images.unsplash.com/photo-1591906832588-9b233a7f6e29?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1581091870627-3cc81f4a0a8b?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 2, location: 'Shamirpet', available: true, status: 'approved', description: 'High-capacity harvester for quick and efficient harvesting.', avgRating: 4.6, model: 'New Holland TC5.30', year: 2021, condition: 'Excellent', locationCoords: { lat: 17.560, lng: 78.570 } },
    { id: 7, name: 'Boom Sprayer', category: ItemCategory.Sprayers, purposes: [{ name: 'Pesticide Spraying', price: 900 }, { name: 'Fertilizer Spraying', price: 950 }], images: [
        'https://images.unsplash.com/photo-1543363136-7e4d3e0f0b2a?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 2, location: 'Gachibowli', available: true, status: 'approved', description: 'Wide coverage sprayer suitable for large fields.', avgRating: 4.0, condition: 'Good', locationCoords: { lat: 17.440, lng: 78.348 } },
    { id: 8, name: 'Experienced Tractor Driver', category: ItemCategory.Drivers, purposes: [{ name: 'Tractor Driving', price: 600 }], images: [
        'https://images.unsplash.com/photo-1591181825852-f4a45a6c3a81?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 4, location: 'Madhapur', available: true, status: 'approved', description: 'Licensed driver with 7+ years of experience.', avgRating: 4.3, locationCoords: { lat: 17.448, lng: 78.392 } },
    { id: 9, name: 'Borewell Rig', category: ItemCategory.Borewell, purposes: [{ name: 'Borewell Drilling', price: 3500 }], images: [
        'https://images.unsplash.com/photo-1581090933873-4c6a3a868946?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 2, location: 'Kukatpally', available: false, status: 'approved', description: 'Heavy-duty rig for borewell operations.', avgRating: 3.9, locationCoords: { lat: 17.494, lng: 78.399 } },
    { id: 10, name: 'Field Worker Team', category: ItemCategory.Workers, purposes: [{ name: 'Weeding', price: 400 }, { name: 'Harvest Support', price: 450 }], images: [
        'https://images.unsplash.com/photo-1601758123926-4cf339f4c278?q=80&w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1591181825852-f4a45a6c3a81?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 2, location: 'LB Nagar', available: true, status: 'approved', description: 'Skilled team for general farm labor.', avgRating: 4.2, quantityAvailable: 8, locationCoords: { lat: 17.355, lng: 78.557 } },
    { id: 11, name: 'DJI Phantom 4 RTK', category: ItemCategory.Drones, purposes: [{ name: 'Field Mapping', price: 1200 }], images: [
        'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?q=80&w=800&auto=format&fit=crop'
    ], ownerId: 4, location: 'Kompally', available: true, status: 'approved', description: 'Survey-grade drone for accurate field mapping.', avgRating: 4.7, model: 'Phantom 4 RTK', condition: 'Excellent', locationCoords: { lat: 17.526, lng: 78.475 } },
];

export const bookings: Booking[] = [
    { id: 'AGB-ABCD-1234', farmerId: 1, supplierId: 2, itemId: 1, itemCategory: ItemCategory.Tractors, date: '2024-07-10', startTime: '09:00', endTime: '13:00', location: 'My Farm, Hyderabad', status: 'Completed', workPurpose: 'Ploughing', finalPrice: 6000, disputeRaised: false, disputeResolved: false, damageReported: false, advanceAmount: 6000, advancePaymentId: 'pay_upfront_123' },
    { id: 'AGB-EFGH-5678', farmerId: 1, supplierId: 2, itemId: 2, itemCategory: ItemCategory.Workers, date: '2024-07-12', startTime: '10:00', endTime: '18:00', location: 'My Farm, Hyderabad', status: 'Confirmed', workPurpose: 'Harvesting', estimatedPrice: 4000, quantity: 5, advanceAmount: 0 },
    { id: 'AGB-IJKL-9012', farmerId: 5, itemCategory: ItemCategory.Tractors, date: '2024-07-25', startTime: '08:00', endTime: '12:00', location: 'Patel Farm, Hyderabad', status: 'Searching', workPurpose: 'Ploughing', preferredModel: 'any', advanceAmount: 0 },
    { id: 'AGB-MNOP-3456', farmerId: 1, supplierId: 2, itemId: 4, itemCategory: ItemCategory.JCB, date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '14:00', location: 'Site B, Hyderabad', status: 'Pending Confirmation', workPurpose: 'Digging / Earth Moving', estimatedPrice: 8000, advanceAmount: 2000, advancePaymentId: 'pay_adv_456' },
];

export const reviews: Review[] = [
    { id: 1, itemId: 1, bookingId: 'AGB-ABCD-1234', reviewerId: 1, rating: 5, comment: 'Great tractor, very powerful and well-maintained.' },
    { id: 2, ratedUserId: 1, bookingId: 'AGB-ABCD-1234', reviewerId: 2, rating: 5, comment: 'Ravi was very professional and communicative.' },
];

export const forumPosts: ForumPost[] = [
    { id: 1, authorId: 1, title: 'Best pesticide for wheat?', content: 'I am seeing some pests on my wheat crop. What is the best organic pesticide to use?', timestamp: '2 days ago', replies: [{ id: 1, authorId: 2, content: 'Neem oil works great for most common pests.', timestamp: '1 day ago' }] },
    { id: 2, authorId: 5, title: 'Question about soil testing', content: 'Where can I get my soil tested in the Pune area?', timestamp: '5 days ago', replies: [] },
];

export const damageReports: DamageReport[] = [];

export const notifications: Notification[] = [
    { id: 1, userId: 1, message: 'Your booking for Harvesting Team is confirmed.', type: 'booking', read: false, timestamp: '1 hour ago' },
    { id: 2, userId: 1, message: 'A new post was made in the community forum.', type: 'community', read: true, timestamp: '3 hours ago' },
];

export const supportTickets: SupportTicket[] = [
    { id: 1, userId: 1, name: 'Ravi Kumar', email: 'farmer@test.com', message: 'I was overcharged for my last booking.', status: 'open', timestamp: '3 hours ago', replies: [{ id: 1, authorId: 3, text: "We are looking into it and will get back to you shortly.", timestamp: "2 hours ago" }] }
];

export const chatMessages: ChatMessage[] = [
    { id: 1, chatId: '1-2', senderId: 1, receiverId: 2, text: 'Hi, is your tractor available tomorrow?', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
    { id: 2, chatId: '1-2', senderId: 2, receiverId: 1, text: 'Yes it is. What time do you need it?', timestamp: new Date(Date.now() - 3500000).toISOString(), read: false, isBotMessage: true },
];
