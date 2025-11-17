import React, { useState, useMemo } from 'react';
import { AppView, SupportTicket, UserRole } from '../types';
import { useSupport } from '../context/SupportContext';
import { useAuth } from '../context/AuthContext';
import Header from '../components/Header';
import Button from '../components/Button';

interface ManageSupportTicketsScreenProps {
    onBack: () => void;
}

const TicketCard: React.FC<{ ticket: SupportTicket, onResolve: (id: number) => void, onReply: (id: number, text: string) => void, allUsers: any[] }> = ({ ticket, onResolve, onReply, allUsers }) => {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [replyText, setReplyText] = useState('');
    const { user } = useAuth();
    
    const getStatusClasses = (status: SupportTicket['status']) => {
        switch (status) {
            case 'open': return 'bg-yellow-100 text-yellow-800';
            case 'closed': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    
    const handleReply = () => {
        if (replyText.trim()) {
            onReply(ticket.id, replyText);
            setReplyText('');
        }
    };
    
    const getAuthorName = (authorId: number) => {
        const author = allUsers.find(u => u.id === authorId);
        if (author?.role === UserRole.Admin) return "Support Team";
        return author?.name || "User";
    };

    return (
        <div className="bg-white dark:bg-neutral-800 p-4 rounded-lg border border-neutral-200 dark:border-neutral-700">
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="font-bold text-neutral-800 dark:text-neutral-100">{ticket.name}</h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{ticket.email} - {ticket.timestamp}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusClasses(ticket.status)}`}>
                    {ticket.status}
                </span>
            </div>
            <p className="mt-2 text-neutral-700 dark:text-neutral-300 bg-neutral-50 dark:bg-neutral-700 p-3 rounded-md">{ticket.message}</p>
            
            {isChatOpen && (
                <div className="mt-3 border-t dark:border-neutral-600 pt-3 space-y-3">
                    {ticket.replies && ticket.replies.length > 0 ? (
                        ticket.replies.map(reply => (
                            <div key={reply.id} className={`p-2 rounded-lg text-sm ${reply.authorId === user?.id ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-neutral-100 dark:bg-neutral-600'}`}>
                               <p className="font-semibold">{getAuthorName(reply.authorId)}:</p>
                               <p>{reply.text}</p>
                            </div>
                        ))
                    ) : <p className="text-sm text-center text-neutral-500">No replies yet.</p>}

                    {ticket.status === 'open' && (
                        <div className="flex space-x-2">
                            <input
                                value={replyText}
                                onChange={e => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                className="flex-grow p-2 border border-neutral-300 dark:border-neutral-500 rounded-lg text-sm bg-white dark:bg-neutral-800 text-black dark:text-white"
                            />
                            <Button onClick={handleReply} className="w-auto px-4 py-1 text-sm">Send</Button>
                        </div>
                    )}
                </div>
            )}
            
            {ticket.status === 'open' && (
                <div className="text-right mt-3 border-t border-neutral-100 dark:border-neutral-600 pt-3 flex justify-end items-center space-x-2">
                    <button onClick={() => setIsChatOpen(!isChatOpen)} className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500" title="Chat with user">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    </button>
                    <button onClick={() => onResolve(ticket.id)} className="text-sm bg-green-600 text-white font-semibold py-1 px-3 rounded-md hover:bg-green-700">Mark as Resolved</button>
                </div>
            )}
        </div>
    );
};

const ManageSupportTicketsScreen: React.FC<ManageSupportTicketsScreenProps> = ({ onBack }) => {
    const { tickets, resolveTicket, addReplyToTicket } = useSupport();
    const { user, allUsers } = useAuth();
    const [filter, setFilter] = useState<'all' | SupportTicket['status']>('all');

    const handleReply = (ticketId: number, text: string) => {
        if (user) {
            addReplyToTicket(ticketId, {
                authorId: user.id,
                text,
                timestamp: new Date().toLocaleTimeString()
            });
        }
    };

    const filteredTickets = useMemo(() => {
        const sorted = [...tickets].sort((a, b) => (a.status === 'open' ? -1 : 1) - (b.status === 'open' ? -1 : 1));
        if (filter === 'all') return sorted;
        return sorted.filter(t => t.status === filter);
    }, [tickets, filter]);

    return (
        <div className="bg-neutral-50 dark:bg-neutral-900 min-h-screen">
            <div className="p-4">
                <div className="flex space-x-2 mb-4">
                    {(['all', 'open', 'closed'] as const).map(status => (
                        <button
                            key={status}
                            onClick={() => setFilter(status)}
                            className={`px-4 py-2 text-sm font-semibold rounded-full capitalize ${filter === status ? 'bg-primary text-white' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-700 dark:text-neutral-200'}`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
                <div className="space-y-3">
                    {filteredTickets.map(ticket => (
                        <TicketCard
                            key={ticket.id}
                            ticket={ticket}
                            onResolve={resolveTicket}
                            onReply={handleReply}
                            allUsers={allUsers}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManageSupportTicketsScreen;