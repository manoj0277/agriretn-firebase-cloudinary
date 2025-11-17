import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-neutral-700 dark:text-neutral-300 text-sm font-bold mb-2">
                {label}
            </label>
            <input
                id={id}
                className="shadow appearance-none border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-700 rounded-lg w-full py-3 px-4 text-neutral-900 dark:text-neutral-100 placeholder-neutral-500 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:light] dark:[color-scheme:dark]"
                {...props}
            />
        </div>
    );
};

export default Input;