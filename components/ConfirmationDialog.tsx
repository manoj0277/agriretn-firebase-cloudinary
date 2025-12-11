import React from 'react';
import Button from './Button';

interface ConfirmationDialogProps {
    title: string;
    message: string;
    note?: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
}

const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    title,
    message,
    note,
    onConfirm,
    onCancel,
    confirmText = 'Confirm',
    cancelText = 'Cancel'
}) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
                <h3 id="dialog-title" className="text-lg font-bold text-neutral-800 mb-2">{title}</h3>
                <p className="text-neutral-700 mb-4">{message}</p>
                {note && <p className="text-xs text-neutral-500 bg-neutral-100 p-2 rounded-md mb-6">{note}</p>}
                <div className="flex justify-end space-x-2">
                    <Button variant="secondary" onClick={onCancel}>
                        {cancelText}
                    </Button>
                    <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
                        {confirmText}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationDialog;