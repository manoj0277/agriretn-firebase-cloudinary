import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { SupportTicket, SupportReply } from '../types';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface SupportContextType {
    tickets: SupportTicket[];
    addTicket: (ticket: Omit<SupportTicket, 'id' | 'status' | 'timestamp' | 'replies'>) => void;
    resolveTicket: (ticketId: number) => void;
    addReplyToTicket: (ticketId: number, reply: Omit<SupportReply, 'id'>) => void;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export const SupportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const { showToast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        const load = async () => {
            if (!user) return;
            try {
                const res = await fetch(`${API_URL}/support-tickets`);
                if (res.ok) {
                    const data = await res.json();
                    setTickets(data);
                }
            } catch { }
        };
        load();
    }, [user]);

    const addTicket = async (ticketData: Omit<SupportTicket, 'id' | 'status' | 'timestamp' | 'replies'>) => {
        try {
            const newTicket: SupportTicket = { id: Date.now(), status: 'open', timestamp: new Date().toISOString(), replies: [], ...ticketData } as SupportTicket;
            const res = await fetch(`${API_URL}/support-tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newTicket)
            });
            if (!res.ok) throw new Error('Failed');
            setTickets(prev => [newTicket, ...prev]);
            showToast('Support ticket submitted successfully!', 'success');
        } catch {
            showToast('Failed to submit ticket.', 'error');
        }
    };

    const resolveTicket = async (ticketId: number) => {
        try {
            const res = await fetch(`${API_URL}/support-tickets/${ticketId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'closed' })
            });
            if (!res.ok) throw new Error('Failed');
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t));
            showToast('Ticket marked as resolved.', 'success');
        } catch {
            showToast('Failed to resolve ticket.', 'error');
        }
    };

    const addReplyToTicket = async (ticketId: number, replyData: Omit<SupportReply, 'id'>) => {
        try {
            const ticket = tickets.find(t => t.id === ticketId);
            if (!ticket) return;
            const reply: SupportReply = { id: Date.now(), ...replyData } as SupportReply;
            const updatedReplies = [...(ticket.replies || []), reply];
            const res = await fetch(`${API_URL}/support-tickets/${ticketId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ replies: updatedReplies })
            });
            if (!res.ok) throw new Error('Failed');
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, replies: updatedReplies } : t));
            showToast('Reply sent!', 'success');
        } catch {
            showToast('Failed to send reply.', 'error');
        }
    };

    const value = useMemo(() => ({ tickets, addTicket, resolveTicket, addReplyToTicket }), [tickets]);

    return (
        <SupportContext.Provider value={value}>
            {children}
        </SupportContext.Provider>
    );
};

export const useSupport = (): SupportContextType => {
    const context = useContext(SupportContext);
    if (context === undefined) {
        throw new Error('useSupport must be used within a SupportProvider');
    }
    return context;
};
