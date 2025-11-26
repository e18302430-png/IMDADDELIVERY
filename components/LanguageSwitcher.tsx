import React, { useState } from 'react';
import { useTranslation } from '../hooks/useTranslation';

const LanguageSwitcher: React.FC = () => {
    const { language, setLanguage } = useTranslation();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // FIX: Use `as const` to infer literal types for language codes,
    // ensuring type compatibility with the `setLanguage` function.
    const languages = [
        { code: 'ar', name: 'العربية' },
        { code: 'en', name: 'English' },
        { code: 'ur', name: 'اردو' },
    ] as const;

    return (
        <div className="relative">
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="glass-card p-2 h-12 w-12 flex items-center justify-center rounded-full">
                 <i className="fas fa-globe text-xl text-gray-300"></i>
            </button>
            {isDropdownOpen && (
                <div className="absolute top-14 ltr:right-0 rtl:left-0 glass-card p-2 rounded-lg w-36 shadow-lg z-20">
                    {languages.map(lang => (
                        <button key={lang.code} onClick={() => { setLanguage(lang.code); setIsDropdownOpen(false);}}
                        className={`w-full text-right px-3 py-2 rounded-md text-sm font-semibold ${language === lang.code ? 'bg-orange-500/20 text-orange-300' : 'text-gray-300 hover:bg-gray-700/50'}`}>
                            {lang.name}
                        </button>
                    ))}
                </div>
            )}
         </div>
    );
};

export default LanguageSwitcher;