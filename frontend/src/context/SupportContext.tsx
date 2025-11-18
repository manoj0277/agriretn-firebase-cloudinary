import React, { createContext, useState, useContext, ReactNode, useMemo, useEffect } from 'react';
import { SupportTicket, SupportReply } from '../types';
import { useToast } from './ToastContext';
import { supabase, supabaseConfigured } from '../../lib/supabase';
import { useAuth } from './AuthContext';

interface SupportContextType {
    tickets: SupportTicket[];
    addTicket: (ticket: Omit<SupportTicket, 'id' | 'status' | 'timestamp' | 'replies'>) => Promise<void>;
    resolveTicket: (ticketId: number) => Promise<void>;
    addReplyToTicket: (ticketId: number, reply: Omit<SupportReply, 'id' | 'timestamp'>) => Promise<void>;
}

const SupportContext = createContext<SupportContextType | undefined>(undefined);

export const SupportProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const { showToast } = useToast();
    const { user } = useAuth();

    useEffect(() => {
        const fetchTickets = async () => {
            if (!supabaseConfigured) return;
            if (!user) return;
            try {
                const { data, error } = await supabase.from('supportTickets').select('*');
                if (error) throw error;
                setTickets((data || []) as SupportTicket[]);
            } catch (error) {
            }
        };
        fetchTickets();
    }, [user]);

    const addTicket = async (ticketData: Omit<SupportTicket, 'id' | 'status' | 'timestamp' | 'replies'>) => {
        try {
            const newTicket: SupportTicket = { id: Date.now(), status: 'open', timestamp: new Date().toISOString(), replies: [], ...ticketData } as SupportTicket;
            const { error } = await supabase.from('supportTickets').upsert([newTicket]);
            if (error) throw error;
            setTickets(prev => [newTicket, ...prev]);
            showToast('Support ticket submitted successfully!', 'success');
        } catch (error) {
            showToast('Failed to submit ticket.', 'error');
        }
    };

    const resolveTicket = async (ticketId: number) => {
        try {
            const { error } = await supabase.from('supportTickets').update({ status: 'closed' }).eq('id', ticketId);
            if (error) throw error;
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: 'closed' } : t));
            showToast('Ticket marked as resolved.', 'success');
        } catch (error) {
            showToast('Failed to resolve ticket.', 'error');
        }
    };

    const addReplyToTicket = async (ticketId: number, replyData: Omit<SupportReply, 'id' | 'timestamp'>) => {
        try {
            const reply: SupportReply = { id: Date.now(), timestamp: new Date().toISOString(), ...replyData } as SupportReply;
            const { data } = await supabase.from('supportTickets').select('replies').eq('id', ticketId).limit(1);
            const existing = (data && data[0] && (data[0] as any).replies) || [];
            const updatedReplies = [...existing, reply];
            const { error } = await supabase.from('supportTickets').update({ replies: updatedReplies }).eq('id', ticketId);
            if (error) throw error;
            setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, replies: updatedReplies } : t));
            showToast('Reply sent!', 'success');
        } catch (error) {
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