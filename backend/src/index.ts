// FIX: Using explicit Request and Response types from express to avoid conflicts with global types.
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import * as data from './data';
import { User, UserRole, Item, ChatMessage } from './types';
import { createClient } from '@supabase/supabase-js';

dotenv.config();
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  const candidate = path.resolve(process.cwd(), '../.env.local');
  dotenv.config({ path: candidate });
}

const app = express();
const port = process.env.PORT || 3001;
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = (supabaseUrl && supabaseServiceKey) ? createClient(supabaseUrl, supabaseServiceKey) : null as any;

// Middleware
app.use(cors());
app.use(express.json());

// --- HEALTH CHECK ---
app.get('/', (req: Request, res: Response) => {
  res.send('Backend server is running!');
});


// --- DATA ENDPOINTS ---
app.get('/api/users', (req: Request, res: Response) => res.json(data.users));
app.get('/api/items', (req: Request, res: Response) => res.json(data.items));
app.get('/api/bookings', (req: Request, res: Response) => res.json(data.bookings));
app.get('/api/reviews', (req: Request, res: Response) => res.json(data.reviews));
app.get('/api/posts', (req: Request, res: Response) => res.json(data.forumPosts));
app.get('/api/tickets', (req: Request, res: Response) => res.json(data.supportTickets));
app.get('/api/notifications', (req: Request, res: Response) => res.json(data.notifications));
app.get('/api/chats', (req: Request, res: Response) => res.json(data.chatMessages));
app.get('/api/damage-reports', (req: Request, res: Response) => res.json(data.damageReports));


// --- AUTH ---
app.post('/api/auth/login', (req: Request, res: Response) => {
    const { email, password } = req.body;
    const foundUser = data.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (foundUser) {
        // In a real app, never send the password back
        const { password, ...userToReturn } = foundUser;
        res.json(userToReturn);
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.post('/api/auth/signup', (req: Request, res: Response) => {
    const { email, phone } = req.body;
    if (!phone) {
        return res.status(400).json({ message: 'Phone number is required' });
    }
    const phoneDigits = String(phone).replace(/[^0-9]/g, '');
    if (data.users.some(u => u.phone === phoneDigits)) {
        return res.status(409).json({ message: 'Email or phone already exists. Please login.' });
    }
    if (email && data.users.some(u => u.email?.toLowerCase() === String(email).toLowerCase())) {
        return res.status(409).json({ message: 'Email or phone already exists. Please login.' });
    }
    const newUser: User = {
        id: Date.now(),
        ...req.body,
        phone: phoneDigits,
        status: req.body.role === UserRole.Supplier ? 'pending' : 'approved',
    };
    data.users.push(newUser);
    const { password, ...userToReturn } = newUser;
    res.status(201).json(userToReturn);
});

// --- USERS ---
app.put('/api/users/:id', (req: Request, res: Response) => {
    const userId = parseInt(req.params.id);
    const updatedUser = req.body;
    const userIndex = data.users.findIndex(u => u.id === userId);
    if (userIndex > -1) {
        data.users[userIndex] = { ...data.users[userIndex], ...updatedUser };
        const { password, ...userToReturn } = data.users[userIndex];
        res.json(userToReturn);
    } else {
        res.status(404).json({ message: 'User not found' });
    }
});

app.post('/api/users/change-password', (req: Request, res: Response) => {
    const { userId, currentPassword, newPassword } = req.body;
    const user = data.users.find(u => u.id === userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.password !== currentPassword) return res.status(403).json({ message: 'Incorrect current password' });
    user.password = newPassword;
    res.json({ message: 'Password updated' });
});

// --- ITEMS ---
app.post('/api/items', (req: Request, res: Response) => {
    const newItem: Item = { id: Date.now(), ...req.body, status: 'pending' };
    data.items.push(newItem);
    res.status(201).json(newItem);
});

app.put('/api/items/:id', (req: Request, res: Response) => {
    const itemId = parseInt(req.params.id);
    const itemIndex = data.items.findIndex(i => i.id === itemId);
    if (itemIndex > -1) {
        data.items[itemIndex] = { ...data.items[itemIndex], ...req.body };
        res.json(data.items[itemIndex]);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});

app.delete('/api/items/:id', (req: Request, res: Response) => {
    const itemId = parseInt(req.params.id);
    const itemIndex = data.items.findIndex(i => i.id === itemId);
    if (itemIndex > -1) {
        data.items.splice(itemIndex, 1);
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
});


// --- BOOKINGS ---
app.post('/api/bookings', (req: Request, res: Response) => {
    const newBooking = { id: `AGB-${Date.now()}`, ...req.body };
    data.bookings.push(newBooking);
    res.status(201).json(newBooking);
});

app.put('/api/bookings/:id', (req: Request, res: Response) => {
    const bookingId = req.params.id;
    const bookingIndex = data.bookings.findIndex(b => b.id === bookingId);
    if (bookingIndex > -1) {
        data.bookings[bookingIndex] = { ...data.bookings[bookingIndex], ...req.body };
        res.json(data.bookings[bookingIndex]);
    } else {
        res.status(404).json({ message: 'Booking not found' });
    }
});

// --- REVIEWS ---
app.post('/api/reviews', (req: Request, res: Response) => {
    const newReview = { id: Date.now(), ...req.body };
    data.reviews.push(newReview);
    res.status(201).json(newReview);
});

// --- CHATS ---
app.post('/api/chats', (req: Request, res: Response) => {
    const { chatId, senderId, receiverId, text } = req.body;
    if (!chatId || !senderId || !receiverId || !text) {
        return res.status(400).json({ message: 'Missing required chat fields' });
    }
    const newMessage: ChatMessage = {
        id: Date.now(),
        chatId,
        senderId,
        receiverId,
        text,
        timestamp: new Date().toISOString(),
        read: false,
        isBotMessage: req.body.isBotMessage || false,
    };
    data.chatMessages.push(newMessage);
    res.status(201).json(newMessage);
});


// --- ADMIN ACTIONS ---
const adminAction = (res: Response, collection: (User | Item)[], id: string, status: 'approved' | 'suspended' | 'rejected') => {
    const numericId = parseInt(id);
    const itemIndex = collection.findIndex(item => item.id === numericId);
    if (itemIndex > -1) {
        (collection[itemIndex] as User | Item).status = status;
        res.json(collection[itemIndex]);
    } else {
        res.status(404).json({ message: 'Item not found' });
    }
};

app.post('/api/admin/users/:id/approve', (req: Request, res: Response) => adminAction(res, data.users, req.params.id, 'approved'));
app.post('/api/admin/users/:id/suspend', (req: Request, res: Response) => adminAction(res, data.users, req.params.id, 'suspended'));
app.post('/api/admin/users/:id/reactivate', (req: Request, res: Response) => adminAction(res, data.users, req.params.id, 'approved'));
app.post('/api/admin/items/:id/approve', (req: Request, res: Response) => adminAction(res, data.items, req.params.id, 'approved'));
app.post('/api/admin/items/:id/reject', (req: Request, res: Response) => adminAction(res, data.items, req.params.id, 'rejected'));

// --- OTHER RESOURCES (Simplified for brevity) ---
app.post('/api/posts', (req: Request, res: Response) => {
    const newPost = { id: Date.now(), replies: [], ...req.body };
    data.forumPosts.unshift(newPost);
    res.status(201).json(newPost);
});

app.post('/api/posts/:id/replies', (req: Request, res: Response) => {
    const postId = parseInt(req.params.id);
    const post = data.forumPosts.find(p => p.id === postId);
    if(post) {
        const newReply = { id: Date.now(), ...req.body };
        post.replies.push(newReply);
        res.status(201).json(newReply);
    } else {
        res.status(404).json({ message: 'Post not found' });
    }
});

app.post('/api/tickets', (req: Request, res: Response) => {
    const newTicket = { id: Date.now(), status: 'open', replies: [], ...req.body };
    data.supportTickets.unshift(newTicket);
    res.status(201).json(newTicket);
});

app.post('/api/tickets/:id/replies', (req: Request, res: Response) => {
    const ticketId = parseInt(req.params.id);
    const ticket = data.supportTickets.find(t => t.id === ticketId);
    if (ticket) {
        const newReply = { id: Date.now(), ...req.body };
        ticket.replies = ticket.replies || [];
        ticket.replies.push(newReply);
        res.status(201).json(newReply);
    } else {
        res.status(404).json({ message: 'Ticket not found' });
    }
});

app.put('/api/tickets/:id/resolve', (req: Request, res: Response) => {
    const ticketId = parseInt(req.params.id);
    const ticket = data.supportTickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.status = 'closed';
        res.json(ticket);
    } else {
        res.status(404).json({ message: 'Ticket not found' });
    }
});


app.listen(port, () => {
  console.log(`Backend server listening on http://localhost:${port}`);
});
// --- AUTH HELPERS ---
app.get('/api/auth/email-by-phone/:phone', async (req: Request, res: Response) => {
  try {
    if (!supabase) return res.status(500).json({ message: 'Supabase not configured' });
    const phoneDigits = String(req.params.phone || '').replace(/[^0-9]/g, '');
    if (!phoneDigits) return res.status(400).json({ message: 'Invalid phone' });
    const { data, error } = await supabase.from('users').select('email').eq('phone', phoneDigits).limit(1);
    if (error) return res.status(500).json({ message: error.message });
    if (!data || data.length === 0) return res.status(404).json({ message: 'Not found' });
    const rec = data[0] as { email?: string };
    return res.json({ email: (rec.email || '').toLowerCase() });
  } catch (e: any) {
    return res.status(500).json({ message: e?.message || 'Error' });
  }
});
