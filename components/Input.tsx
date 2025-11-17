import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
}

const Input: React.FC<InputProps> = ({ label, id, ...props }) => {
    return (
        <div>
            <label htmlFor={id} className="block text-gray-700 dark:text-neutral-300 text-sm font-bold mb-2">
                {label}
                {props.required ? <span className="text-red-500"> *</span> : null}
            </label>
            <input
                id={id}
                className="shadow appearance-none border border-neutral-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg w-full py-3 px-4 text-neutral-800 dark:text-white placeholder-gray-400 leading-tight focus:outline-none focus:ring-2 focus:ring-primary/50 [color-scheme:light] dark:[color-scheme:dark]"
                {...props}
            />
        </div>
    );
};

export default Input;