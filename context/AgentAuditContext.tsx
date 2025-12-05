import React, { createContext, useContext, ReactNode } from 'react';
import { AgentAction, AgentActionType } from '../types';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api';

interface AgentAuditContextType {
    logAction: (action: Omit<AgentAction, 'id' | 'timestamp' | 'agentId' | 'agentName'>) => Promise<void>;
    getAgentActions: (agentId: number, limit?: number) => Promise<AgentAction[]>;
    getAllAgentActions: (limit?: number) => Promise<AgentAction[]>;
}

const AgentAuditContext = createContext<AgentAuditContextType | undefined>(undefined);

export const AgentAuditProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const { showToast } = useToast();

    const logAction = async (actionData: Omit<AgentAction, 'id' | 'timestamp' | 'agentId' | 'agentName'>): Promise<void> => {
        if (!user) {
            console.error('Cannot log action: No user logged in');
            return;
        }

        try {
            // Get browser info
            const userAgent = navigator.userAgent;

            const actionPayload: Omit<AgentAction, 'id'> = {
                agentId: user.id,
                agentName: user.name,
                timestamp: new Date().toISOString(),
                userAgent,
                ...actionData
            };

            const response = await fetch(`${API_URL}/agent/log-action`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(actionPayload)
            });

            if (!response.ok) {
                throw new Error('Failed to log action');
            }

            console.log('Agent action logged:', actionData.action);
        } catch (error) {
            console.error('Error logging agent action:', error);
            // Don't show toast to user - this is background logging
        }
    };

    const getAgentActions = async (agentId: number, limit: number = 50): Promise<AgentAction[]> => {
        try {
            const response = await fetch(`${API_URL}/agent/actions/${agentId}?limit=${limit}`);

            if (!response.ok) {
                throw new Error('Failed to fetch agent actions');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching agent actions:', error);
            showToast('Failed to load agent actions', 'error');
            return [];
        }
    };

    const getAllAgentActions = async (limit: number = 100): Promise<AgentAction[]> => {
        try {
            const response = await fetch(`${API_URL}/agent/actions/all?limit=${limit}`);

            if (!response.ok) {
                throw new Error('Failed to fetch all agent actions');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching all agent actions:', error);
            showToast('Failed to load agent actions', 'error');
            return [];
        }
    };

    const value = {
        logAction,
        getAgentActions,
        getAllAgentActions
    };

    return (
        <AgentAuditContext.Provider value={value}>
            {children}
        </AgentAuditContext.Provider>
    );
};

export const useAgentAudit = (): AgentAuditContextType => {
    const context = useContext(AgentAuditContext);
    if (context === undefined) {
        throw new Error('useAgentAudit must be used within an AgentAuditProvider');
    }
    return context;
};
