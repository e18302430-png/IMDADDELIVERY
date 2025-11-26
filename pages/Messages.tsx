import React, { useState, useCallback } from 'react';
import { generateMessage } from '../services/geminiService';
import LoadingSpinner from '../components/LoadingSpinner';
import { useTranslation } from '../hooks/useTranslation';

const PREDEFINED_TOPIC_KEYS = [
    'reminderStartWork',
    'warningRepeatedDelay',
    'thanksExcellentPerformance',
    'noticePolicyUpdate',
    'queryAbsenceFromWorkArea',
];

const Messages: React.FC = () => {
    const { t } = useTranslation();
    const [customTopic, setCustomTopic] = useState('');
    const [generatedMessage, setGeneratedMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');

    const handleGenerateMessage = useCallback(async (topic: string) => {
        if (!topic) return;
        setIsLoading(true);
        setGeneratedMessage('');
        setCopySuccess('');
        const message = await generateMessage(topic);
        setGeneratedMessage(message);
        setIsLoading(false);
    }, []);

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(generatedMessage).then(() => {
            setCopySuccess(t('copySuccess'));
            setTimeout(() => setCopySuccess(''), 2000);
        }, () => {
            setCopySuccess(t('copyFail'));
        });
    };

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
            <h1 className="text-3xl font-bold text-center text-white">{t('smartMessageGenerator')}</h1>
            
            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-4 text-white">{t('chooseReadyTopic')}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {PREDEFINED_TOPIC_KEYS.map(topicKey => (
                        <button 
                            key={topicKey}
                            onClick={() => handleGenerateMessage(t(topicKey))}
                            className="bg-gray-800/50 text-white p-3 rounded-lg hover:bg-orange-500/10 border border-gray-700 hover:border-orange-500/50 transition-all duration-300 ltr:text-left rtl:text-right"
                        >
                            {t(topicKey)}
                        </button>
                    ))}
                </div>
            </div>

            <div className="glass-card p-6">
                <h2 className="text-xl font-semibold mb-2 text-white">{t('enterCustomTopic')}</h2>
                <div className="flex ltr:space-x-2 rtl:space-x-reverse rtl:space-x-2">
                    <input 
                        type="text"
                        value={customTopic}
                        onChange={(e) => setCustomTopic(e.target.value)}
                        placeholder={t('customTopicPlaceholder')}
                        className="flex-grow input-styled"
                    />
                    <button
                        onClick={() => handleGenerateMessage(customTopic)}
                        disabled={!customTopic || isLoading}
                        className="btn-primary"
                    >
                        {t('create')}
                    </button>
                </div>
            </div>

            {(isLoading || generatedMessage) && (
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4 text-white">{t('generatedMessage')}</h2>
                    {isLoading ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="relative">
                            <textarea
                                readOnly
                                value={generatedMessage}
                                className="w-full h-40 bg-gray-900/50 border border-gray-700 rounded-lg p-4 text-gray-300 whitespace-pre-wrap"
                            />
                            <button
                                onClick={handleCopyToClipboard}
                                className="absolute top-3 ltr:left-3 rtl:right-3 bg-gray-700/80 hover:bg-gray-600/80 text-gray-300 p-2 rounded-lg transition-colors"
                                title={t('copyToClipboard')}
                            >
                                <i className="fas fa-copy"></i>
                            </button>
                            {copySuccess && <p className="text-center mt-2 text-green-400">{copySuccess}</p>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Messages;