import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PricingRule } from '../../utils/pricing';
import Header from '../../components/Header';
import Button from '../../components/Button';
import Input from '../../components/Input';
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc, query, where } from 'firebase/firestore';
import { db } from '../../src/lib/firebase';

const DemandControlScreen: React.FC = () => {
    const { user } = useAuth();
    const [rules, setRules] = useState<PricingRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Form State
    const [district, setDistrict] = useState('');
    const [mandal, setMandal] = useState('');
    const [multiplier, setMultiplier] = useState('1.1');
    const [seasonName, setSeasonName] = useState('');
    const [isFormVisible, setIsFormVisible] = useState(false);

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const q = query(collection(db, 'pricing_rules'));
            const snapshot = await getDocs(q);
            const loadedRules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PricingRule));
            setRules(loadedRules);
        } catch (error) {
            console.error("Error fetching rules:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddRule = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newRule: Omit<PricingRule, 'id'> = {
                district: district.trim() || 'ALL',
                mandal: mandal.trim() || 'ALL',
                multiplier: parseFloat(multiplier),
                seasonName: seasonName || 'High Demand',
                isActive: true
            };

            await addDoc(collection(db, 'pricing_rules'), newRule);
            setDistrict('');
            setMandal('');
            setMultiplier('1.1');
            setSeasonName('');
            setIsFormVisible(false);
            fetchRules();
            alert('Rule added successfully!');
        } catch (error) {
            console.error("Error adding rule:", error);
            alert('Failed to add rule.');
        }
    };

    const handleDeleteRule = async (id: string) => {
        if (!confirm('Are you sure you want to delete this rule?')) return;
        try {
            await deleteDoc(doc(db, 'pricing_rules', id));
            setRules(rules.filter(r => r.id !== id));
        } catch (error) {
            console.error("Error deleting rule:", error);
        }
    };

    const toggleRuleStatus = async (rule: PricingRule) => {
        try {
            await updateDoc(doc(db, 'pricing_rules', rule.id), { isActive: !rule.isActive });
            setRules(rules.map(r => r.id === rule.id ? { ...r, isActive: !r.isActive } : r));
        } catch (error) {
            console.error("Error updating rule:", error);
        }
    };

    return (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen p-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Demand & Price Control</h1>

            <div className="mb-8">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Active Pricing Rules</h2>
                    <Button onClick={() => setIsFormVisible(true)}>
                        <div className="flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                            Add New Rule
                        </div>
                    </Button>
                </div>

                {isFormVisible && (
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg mb-8 animate-fade-in border border-primary/20 ring-1 ring-black/5">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                Create Surge Pricing Rule
                            </h3>
                            <button onClick={() => setIsFormVisible(false)} className="text-gray-400 hover:text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <form onSubmit={handleAddRule}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">State/District <span className="text-red-500">*</span></label>
                                    <Input
                                        value={district}
                                        onChange={e => setDistrict(e.target.value)}
                                        placeholder="e.g. Siddipet (or 'ALL')"
                                        required
                                        className="h-11"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Found in search/geolocation (e.g. 'Hyderabad')</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mandal/Area <span className="text-red-500">*</span></label>
                                    <Input
                                        value={mandal}
                                        onChange={e => setMandal(e.target.value)}
                                        placeholder="e.g. Husnabad (or 'ALL')"
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Multiplier <span className="text-red-500">*</span></label>
                                    <div className="relative">
                                        <Input
                                            type="number"
                                            step="0.1"
                                            min="1.0"
                                            value={multiplier}
                                            onChange={e => setMultiplier(e.target.value)}
                                            required
                                            className="h-11 pl-10"
                                        />
                                        <div className="absolute left-3 top-3 text-gray-400 font-bold">x</div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">1.5 = 50% increase in price</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Reason Label</label>
                                    <Input
                                        value={seasonName}
                                        onChange={e => setSeasonName(e.target.value)}
                                        placeholder="e.g. Peak Season"
                                        className="h-11"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 pt-4 border-t dark:border-gray-700">
                                <button type="button" onClick={() => setIsFormVisible(false)} className="px-6 py-2.5 rounded-lg text-gray-600 font-medium hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors">Cancel</button>
                                <Button type="submit" className="px-8 shadow-lg shadow-primary/30">Save Rule</Button>
                            </div>
                        </form>
                    </div>
                )}

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-100/50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-extra-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Region</th>
                                <th className="px-6 py-4 text-left text-xs font-extra-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Limits</th>
                                <th className="px-6 py-4 text-left text-xs font-extra-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Multiplier</th>
                                <th className="px-6 py-4 text-left text-xs font-extra-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-extra-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {rules.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">No active rules defined.</td>
                                </tr>
                            ) : (
                                rules.map(rule => (
                                    <tr key={rule.id}>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{rule.seasonName}</div>
                                            <div className="text-sm text-gray-500">{rule.district === 'ALL' ? 'Global' : `${rule.mandal}, ${rule.district}`}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {rule.category || 'All Categories'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                                {rule.multiplier}x (+{Math.round((rule.multiplier - 1) * 100)}%)
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <button
                                                onClick={() => toggleRuleStatus(rule)}
                                                className={`text-xs font-bold ${rule.isActive ? 'text-green-600' : 'text-gray-400'}`}
                                            >
                                                {rule.isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleDeleteRule(rule.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-800">
                    <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-2">How it works</h3>
                    <p className="text-sm text-blue-600 dark:text-blue-400">
                        Set a multiplier for a specific Mandal or District. Suppliers in that area with "Auto Price Optimization" enabled will automatically have their prices increased by this factor during booking estimation.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DemandControlScreen;
