import React from 'react';

interface EditableInputProps {
    value: string | number;
    onChange: (newValue: string) => void;
    placeholder?: string;
    type?: 'text' | 'textarea' | 'number' | 'date';
}

const EditableInput: React.FC<EditableInputProps> = ({ value, onChange, placeholder, type = 'text' }) => {
    const commonClasses = "w-full input-styled";
    
    if (type === 'textarea') {
        return (
            <textarea
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={commonClasses}
                placeholder={placeholder}
                rows={2}
                onClick={(e) => e.stopPropagation()}
            />
        );
    }

    return (
        <input
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
            placeholder={placeholder}
            onClick={(e) => e.stopPropagation()}
        />
    );
};

export default EditableInput;