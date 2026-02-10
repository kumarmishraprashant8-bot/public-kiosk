import { useState, useEffect, useRef } from 'react';

interface Message {
    id: number;
    author_type: string;
    author_name: string;
    content: string;
    message_type: string;
    created_at: string;
}

interface Thread {
    id: number;
    thread_id: string;
    messages: Message[];
    status: string;
}

interface CitizenChatProps {
    submissionId: number;
    receiptId: string;
}

const API_URL = 'http://localhost:8000';

export default function CitizenChat({ submissionId, receiptId }: CitizenChatProps) {
    const [thread, setThread] = useState<Thread | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (expanded && submissionId) {
            fetchThread();
            // Poll for new messages every 10 seconds when expanded
            const interval = setInterval(fetchThread, 10000);
            return () => clearInterval(interval);
        }
    }, [expanded, submissionId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [thread?.messages]);

    const fetchThread = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/threads/by-submission/${submissionId}`);
            if (res.ok) {
                setThread(await res.json());
            }
        } catch (error) {
            console.error('Failed to fetch thread:', error);
        } finally {
            setLoading(false);
        }
    };

    const startConversation = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ submission_id: submissionId }),
            });
            if (res.ok) {
                const newThread = await res.json();
                setThread(newThread);
            }
        } catch (error) {
            console.error('Failed to start conversation:', error);
        } finally {
            setLoading(false);
        }
    };

    const sendMessage = async () => {
        if (!thread || !newMessage.trim()) return;
        setSending(true);
        try {
            const res = await fetch(`${API_URL}/threads/${thread.thread_id}/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: newMessage,
                    author_type: 'citizen',
                    author_name: `Citizen #${receiptId.slice(0, 4).toUpperCase()}`,
                }),
            });
            if (res.ok) {
                const msg = await res.json();
                setThread(prev => prev ? {
                    ...prev,
                    messages: [...prev.messages, msg],
                } : null);
                setNewMessage('');
            }
        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setSending(false);
        }
    };

    const hasUnread = thread?.messages?.some(m =>
        m.author_type === 'admin' || m.author_type === 'crew'
    );

    return (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            {/* Header - Always visible */}
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">💬</span>
                    <div className="text-left">
                        <p className="font-bold">Live Updates & Chat</p>
                        <p className="text-sm text-white/70">
                            {thread ? `${thread.messages.length} messages` : 'Get updates on your complaint'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {hasUnread && (
                        <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                    )}
                    <span className={`transform transition-transform ${expanded ? 'rotate-180' : ''}`}>
                        ▼
                    </span>
                </div>
            </button>

            {/* Expandable Chat Area */}
            {expanded && (
                <div className="border-t border-gray-200">
                    {loading && !thread ? (
                        <div className="p-8 text-center text-gray-400">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p>Loading conversation...</p>
                        </div>
                    ) : !thread ? (
                        <div className="p-6 text-center">
                            <p className="text-gray-600 mb-4">
                                Have a question or want to provide more details?
                            </p>
                            <button
                                onClick={startConversation}
                                disabled={loading}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors"
                            >
                                {loading ? 'Starting...' : '💬 Start Conversation'}
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Messages */}
                            <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
                                {thread.messages.length === 0 ? (
                                    <div className="text-center text-gray-400 py-8">
                                        <span className="text-4xl block mb-2">💬</span>
                                        <p>No messages yet. Send the first message!</p>
                                    </div>
                                ) : (
                                    thread.messages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className={`flex ${msg.author_type === 'citizen' ? 'justify-end' : 'justify-start'}`}
                                        >
                                            <div
                                                className={`max-w-[80%] rounded-xl p-3 ${msg.author_type === 'citizen'
                                                        ? 'bg-blue-500 text-white'
                                                        : msg.author_type === 'system'
                                                            ? 'bg-gray-200 text-gray-600 italic text-sm'
                                                            : msg.author_type === 'crew'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-purple-100 text-purple-800'
                                                    }`}
                                            >
                                                <div className="text-xs opacity-70 mb-1">
                                                    {msg.author_type === 'admin' ? '👨‍💼 Admin' :
                                                        msg.author_type === 'crew' ? '🚀 Field Crew' :
                                                            msg.author_type === 'system' ? '🤖 System' : ''}
                                                    • {new Date(msg.created_at).toLocaleTimeString()}
                                                </div>
                                                <p className="text-sm">{msg.content}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Input */}
                            {thread.status !== 'closed' && (
                                <div className="p-4 border-t border-gray-200 bg-white">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                                            placeholder="Type a message..."
                                            className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                        />
                                        <button
                                            onClick={sendMessage}
                                            disabled={sending || !newMessage.trim()}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl disabled:opacity-50 transition-colors"
                                        >
                                            {sending ? '...' : '➤'}
                                        </button>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        <button
                                            onClick={() => setNewMessage('When will someone be coming?')}
                                            className="text-xs px-2 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
                                        >
                                            📅 When?
                                        </button>
                                        <button
                                            onClick={() => setNewMessage('The issue is getting worse.')}
                                            className="text-xs px-2 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
                                        >
                                            ⚠️ Urgent
                                        </button>
                                        <button
                                            onClick={() => setNewMessage('Thank you for the update.')}
                                            className="text-xs px-2 py-1 bg-gray-100 rounded-lg hover:bg-gray-200"
                                        >
                                            🙏 Thanks
                                        </button>
                                    </div>
                                </div>
                            )}

                            {thread.status === 'closed' && (
                                <div className="p-4 bg-green-50 text-center text-green-700">
                                    ✓ This conversation has been closed. Your issue has been resolved.
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
