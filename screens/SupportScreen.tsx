

import React, { useState, useEffect } from 'react';
import { AppView, SupportTicket, UserRole } from '../types';
import Header from '../components/Header';
import Input from '../components/Input';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { useSupport } from '../context/SupportContext';
import { useLanguage } from '../context/LanguageContext';

interface SupportScreenProps {
    navigate: (view: AppView) => void;
    goBack: () => void;
}

const faqs = [
    { q: 'How do I cancel a booking?', a: 'Go to the "Bookings" tab, find your booking, and click "Cancel Booking".' },
    { q: 'What is the payment process?', a: 'Payment is handled securely. You can pay the full amount upfront or pay later after the service is completed.' },
    { q: 'Can I modify a booking?', a: 'Currently, you need to cancel and re-book. We are working on an edit feature.' },
];

const SupportScreen: React.FC<SupportScreenProps> = ({ navigate, goBack }) => {
    const { user, allUsers } = useAuth();
    const { tickets, addTicket, addReplyToTicket } = useSupport();
    const { t } = useLanguage();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [showContactForm, setShowContactForm] = useState(false);
    const [activeTicketId, setActiveTicketId] = useState<number | null>(null);
    const [reply, setReply] = useState('');

    const myTickets = tickets.filter(t => t.userId === user?.id);
    const hasOpenTicket = myTickets.some(t => t.status === 'open');

    useEffect(() => {
        if (user) {
            setName(user.name);
            setEmail(user.email);
        }
    }, [user]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        addTicket({
            name,
            email,
            message,
            userId: user?.id
        });
        setMessage('');
        setShowContactForm(false);
    };

    const handleReplySubmit = (ticketId: number) => {
        if (!reply.trim() || !user) return;
        // FIX: Add missing 'timestamp' property to the reply object.
        addReplyToTicket(ticketId, {
            authorId: user.id,
            text: reply,
            timestamp: new Date().toLocaleTimeString()
        });
        setReply('');
    };

    const getAuthorName = (authorId: number | string) => {
        const author = allUsers.find(u => u.id === authorId);
        if (author?.role === UserRole.Admin) return "Support Team";
        return author?.name || "You";
    };

    return (
        <div className="dark:text-neutral-200 bg-green-50 dark:bg-neutral-900 min-h-screen">
            <Header title={t('helpAndSupport')} onBack={goBack} />
            <div className="p-6">
                <div className="mb-8">
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">{t('myTickets')}</h2>
                    <div className="space-y-2">
                        {myTickets.length > 0 ? myTickets.map(ticket => (
                            <details key={ticket.id} className="bg-white dark:bg-neutral-700 p-4 rounded-lg group border border-neutral-200 dark:border-neutral-600 shadow-sm" onToggle={(e) => e.currentTarget.open ? setActiveTicketId(ticket.id) : setActiveTicketId(null)}>
                                <summary className="font-semibold text-neutral-800 dark:text-neutral-100 cursor-pointer flex justify-between items-center">
                                    <span>{ticket.message.substring(0, 30)}...</span>
                                    <span className={`text-xs px-2 py-1 rounded-full ${ticket.status === 'open' ? 'bg-yellow-200 text-yellow-800' : 'bg-green-200 text-green-800'}`}>{ticket.status}</span>
                                </summary>
                                <div className="mt-4 border-t pt-4 dark:border-neutral-600 space-y-3">
                                    <p className="text-sm text-neutral-600 dark:text-neutral-300 italic">"{ticket.message}"</p>
                                    {ticket.replies?.map(r => (
                                        <div key={r.id} className={`p-2 rounded-lg text-sm ${r.authorId === user?.id ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200' : 'bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100'}`}>
                                            <p className="font-semibold">{getAuthorName(r.authorId)}:</p>
                                            <p>{r.text}</p>
                                        </div>
                                    ))}
                                    {ticket.status === 'open' && (
                                        <div className="flex space-x-2">
                                            <input value={reply} onChange={e => setReply(e.target.value)} placeholder={t('writeAReply')} className="flex-grow p-2 border border-neutral-300 dark:border-neutral-500 rounded-lg text-sm bg-white dark:bg-neutral-800 text-black dark:text-white" />
                                            <Button onClick={() => handleReplySubmit(ticket.id)} className="w-auto px-4 py-1 text-sm">{t('send')}</Button>
                                        </div>
                                    )}
                                </div>
                            </details>
                        )) : <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">You have not raised any complaints yet.</p>}
                    </div>
                </div>

                <div className="mb-8 border-t dark:border-neutral-700 pt-8">
                    <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100 mb-4">{t('faqs')}</h2>
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <details key={index} className="bg-white dark:bg-neutral-700 p-4 rounded-lg border border-neutral-200 dark:border-neutral-600 shadow-sm">
                                <summary className="font-semibold text-neutral-800 dark:text-neutral-100 cursor-pointer">{faq.q}</summary>
                                <p className="mt-2 text-neutral-700 dark:text-neutral-300">{faq.a}</p>
                            </details>
                        ))}
                    </div>
                </div>

                <div className="border-t dark:border-neutral-700 pt-8">
                    {showContactForm ? (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{t('contactSupport')}</h2>
                                <button onClick={() => setShowContactForm(false)} className="text-sm text-neutral-500 dark:text-neutral-300 hover:text-neutral-800 dark:hover:text-neutral-100">{t('cancel')}</button>
                            </div>
                            <p className="text-neutral-700 dark:text-neutral-300 mb-4">Fill out the form below to create a new ticket.</p>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <Input label="Your Name" value={name} onChange={e => setName(e.target.value)} required readOnly={!!user} />
                                <Input label={t('email')} type="email" value={email} onChange={e => setEmail(e.target.value)} required readOnly={!!user} />
                                <div>
                                    <label className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">Message</label>
                                    <textarea value={message} onChange={e => setMessage(e.target.value)} rows={5} required className="shadow appearance-none border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-lg w-full py-3 px-4 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50" />
                                </div>
                                <Button type="submit">Submit New Ticket</Button>
                            </form>
                        </div>
                    ) : (
                        <button onClick={() => setShowContactForm(true)} disabled={hasOpenTicket} className="w-full text-left p-4 bg-white dark:bg-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-600 transition-colors flex items-center space-x-4 disabled:opacity-50 disabled:cursor-not-allowed border border-neutral-200 dark:border-neutral-600 shadow-sm">
                            <div className="p-2 bg-primary/10 rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-neutral-800 dark:text-neutral-100">{t('contactSupport')}</h2>
                                <p className="text-sm text-neutral-500 dark:text-neutral-400">{hasOpenTicket ? 'Please wait for your current ticket to be resolved.' : 'Still need help? Create a new ticket.'}</p>
                            </div>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportScreen;
