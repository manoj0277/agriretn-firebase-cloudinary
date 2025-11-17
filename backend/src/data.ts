import { User, UserRole, Item, ItemCategory, Booking, Review, ChatMessage, ForumPost, CommunityReply, DamageReport, Notification, SupportTicket, WORK_PURPOSES } from './types';

export let users: User[] = [
    { id: 1, name: 'Ravi Kumar', email: 'farmer@test.com', password: 'manoj123', phone: '9876543210', role: UserRole.Farmer, status: 'approved', avgRating: 4.8, locationCoords: { lat: 17.3850, lng: 78.4867 }, profilePicture: 'https://images.unsplash.com/photo-1591181825852-f4a45a6c3a81?q=80&w=800&auto=format&fit=crop' },
    { id: 2, name: 'Laxmi Services', email: 'supplier@test.com', password: 'manoj123', phone: '8765432109', role: UserRole.Supplier, status: 'approved', locationCoords: { lat: 17.393, lng: 78.486 }, profilePicture: 'https://images.unsplash.com/photo-1562235392-56b5791742de?q=80&w=800&auto=format&fit=crop' },
    { id: 3, name: 'Admin User', email: 'admin@test.com', password: 'manoj123', phone: '1234567890', role: UserRole.Admin, status: 'approved', profilePicture: 'https://images.unsplash.com/photo-1580852300654-034f8007104b?q=80&w=800&auto=format&fit=crop', locationCoords: { lat: 17.38, lng: 78.49 } },
    { id: 4, name: 'Suresh Farms', email: 'supplier2@test.com', password: 'password123', phone: '7654321098', role: UserRole.Supplier, status: 'pending', profilePicture: 'https://images.unsplash.com/photo-1560493676-04071c5f467b?q=80&w=800&auto=format&fit=crop', locationCoords: { lat: 17.45, lng: 78.55 } },
    { id: 5, name: 'Priya Patel', email: 'farmer2@test.com', password: 'password123', phone: '6543210987', role: UserRole.Farmer, status: 'approved', locationCoords: { lat: 17.41, lng: 78.50 }, profilePicture: 'https://images.unsplash.com/photo-1601758123926-4cf339f4c278?q=80&w=800&auto=format&fit=crop' },
];

export let items: Item[] = [
    { id: 1, name: 'John Deere 5310', category: ItemCategory.Tractors, purposes: [{ name: 'Ploughing', price: 1500 }, { name: 'Sowing / Planting', price: 1600 }], images: ['https://assets.tractorjunction.com/tractor-junction/assets/images/tractor/john-deere-5310-4wd-220922115020.jpg?format=auto'], ownerId: 2, location: 'Hyderabad', available: true, status: 'approved', description: 'Powerful 55 HP tractor for all your heavy-duty farming needs. Well-maintained and reliable.', avgRating: 4.5, model: '5310 4WD', year: 2022, horsepower: 55, condition: 'Good', licensePlate: 'TS09AB1234', locationCoords: { lat: 17.393, lng: 78.486 }, operatorCharge: 300, currentLocation: { lat: 17.393, lng: 78.486 } },
    { id: 2, name: 'Harvesting Team', category: ItemCategory.Workers, purposes: [{ name: 'Harvesting', price: 500 }], images: ['https://images.unsplash.com/photo-1601758123926-4cf339f4c278?q=80&w=800&auto=format&fit=crop'], ownerId: 2, location: 'Hyderabad', available: true, status: 'approved', description: 'Experienced team of workers for efficient harvesting. Price is per person per hour.', avgRating: 4.7, quantityAvailable: 10, gender: 'Female', locationCoords: { lat: 17.39, lng: 78.49 } },
    { id: 3, name: 'Spraying Drone', category: ItemCategory.Drones, purposes: [{ name: 'Spraying Pesticides/Fertilizers', price: 800 }], images: ['https://images.unsplash.com/photo-1621269264489-c41103310461?q=80&w=800&auto=format&fit=crop'], ownerId: 4, location: 'Hyderabad', available: true, status: 'pending', description: 'Advanced agricultural drone for efficient spraying. Covers large areas quickly.', model: 'DJI Agras T40', condition: 'New', locationCoords: { lat: 17.42, lng: 78.50 } },
    { id: 4, name: 'JCB 3DX', category: ItemCategory.JCB, purposes: [{ name: 'Digging / Earth Moving', price: 2000 }], images: ['https://5.imimg.com/data5/ANDROID/Default/2021/4/SF/DS/DI/72221658/product-jpeg-500x500.jpg'], ownerId: 2, location: 'Hyderabad', available: false, status: 'approved', description: 'Reliable JCB for construction and digging work.', avgRating: 4.2, model: '3DX', year: 2021, condition: 'Fair', licensePlate: 'TS09CD5678', operatorCharge: 400, locationCoords: { lat: 17.40, lng: 78.48 } },
];

export let bookings: Booking[] = [
    { id: 'AGB-ABCD-1234', farmerId: 1, supplierId: 2, itemId: 1, itemCategory: ItemCategory.Tractors, date: '2024-07-10', startTime: '09:00', endTime: '13:00', location: 'My Farm, Hyderabad', status: 'Completed', workPurpose: 'Ploughing', finalPrice: 6000, disputeRaised: false, disputeResolved: false, damageReported: false, advanceAmount: 6000, advancePaymentId: 'pay_upfront_123' },
    { id: 'AGB-EFGH-5678', farmerId: 1, supplierId: 2, itemId: 2, itemCategory: ItemCategory.Workers, date: '2024-07-12', startTime: '10:00', endTime: '18:00', location: 'My Farm, Hyderabad', status: 'Confirmed', workPurpose: 'Harvesting', estimatedPrice: 4000, quantity: 5, advanceAmount: 0 },
    { id: 'AGB-IJKL-9012', farmerId: 5, itemCategory: ItemCategory.Tractors, date: '2024-07-25', startTime: '08:00', endTime: '12:00', location: 'Patel Farm, Hadapsar', status: 'Searching', workPurpose: 'Ploughing', preferredModel: 'any', advanceAmount: 0 },
    { id: 'AGB-MNOP-3456', farmerId: 1, supplierId: 2, itemId: 4, itemCategory: ItemCategory.JCB, date: new Date().toISOString().split('T')[0], startTime: '10:00', endTime: '14:00', location: 'Site B, Hyderabad', status: 'Pending Confirmation', workPurpose: 'Digging / Earth Moving', estimatedPrice: 8000, advanceAmount: 2000, advancePaymentId: 'pay_adv_456' },
];

export let reviews: Review[] = [
    { id: 1, itemId: 1, bookingId: 'AGB-ABCD-1234', reviewerId: 1, rating: 5, comment: 'Great tractor, very powerful and well-maintained.' },
    { id: 2, ratedUserId: 1, bookingId: 'AGB-ABCD-1234', reviewerId: 2, rating: 5, comment: 'Ravi was very professional and communicative.' },
];

export let forumPosts: ForumPost[] = [
    { id: 1, authorId: 1, title: 'Best pesticide for wheat?', content: 'I am seeing some pests on my wheat crop. What is the best organic pesticide to use?', timestamp: '2 days ago', replies: [{ id: 1, authorId: 2, content: 'Neem oil works great for most common pests.', timestamp: '1 day ago' }] },
    { id: 2, authorId: 5, title: 'Question about soil testing', content: 'Where can I get my soil tested in the Pune area?', timestamp: '5 days ago', replies: [] },
];

export let damageReports: DamageReport[] = [];

export let notifications: Notification[] = [
    { id: 1, userId: 1, message: 'Your booking for Harvesting Team is confirmed.', type: 'booking', read: false, timestamp: '1 hour ago' },
    { id: 2, userId: 1, message: 'A new post was made in the community forum.', type: 'community', read: true, timestamp: '3 hours ago' },
];

export let supportTickets: SupportTicket[] = [
    { id: 1, userId: 1, name: 'Ravi Kumar', email: 'farmer@test.com', message: 'I was overcharged for my last booking.', status: 'open', timestamp: '3 hours ago', replies: [{ id: 1, authorId: 3, text: "We are looking into it and will get back to you shortly.", timestamp: "2 hours ago" }] }
];

export let chatMessages: ChatMessage[] = [
    { id: 1, chatId: '1-2', senderId: 1, receiverId: 2, text: 'Hi, is your tractor available tomorrow?', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
    { id: 2, chatId: '1-2', senderId: 2, receiverId: 1, text: 'Yes it is. What time do you need it?', timestamp: new Date(Date.now() - 3500000).toISOString(), read: false, isBotMessage: true },
];
