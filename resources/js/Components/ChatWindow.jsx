import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatWindow = ({ currentUserId, receiver }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [typingUser, setTypingUser] = useState(null);
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);

    const getChannelName = (id1, id2) => {
        const ids = [Number(id1), Number(id2)];
        ids.sort((a, b) => a - b);
        return `chat.${ids.join('.')}`;
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typingUser]);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await axios.get(`/api/chat/messages/${receiver.id}`);
                setMessages(response.data.messages);

                const hasUnread = response.data.messages.some(
                    msg => Number(msg.receiver_id) === Number(currentUserId) && !msg.read_at
                );
                if (hasUnread) {
                    await axios.post(`/api/chat/mark-as-read`, { sender_id: receiver.id });
                    window.dispatchEvent(new CustomEvent('chat-messages-read'));
                }
            } catch (error) {
                console.error("Error fetching messages:", error);
            }
        };

        fetchMessages();

        if (!window.Echo) return;

        const channelName = getChannelName(currentUserId, receiver.id);

        window.Echo.private(channelName)
            .listen('.MessageSent', async (e) => {
                if (Number(e.message.sender_id) === Number(receiver.id)) {
                    setMessages(prev => {
                        const exists = prev.some(m => m.id === e.message.id);
                        return exists ? prev : [...prev, e.message];
                    });
                    try {
                        await axios.post(`/api/chat/mark-as-read`, { sender_id: receiver.id });
                        window.dispatchEvent(new CustomEvent('chat-messages-read'));
                    } catch (err) {
                        console.error("Mark as read failed:", err);
                    }
                }
            })
            .listen('.UserTyping', (e) => {
                if (Number(e.sender_id) === Number(receiver.id)) {
                    setTypingUser(receiver.name);
                    clearTimeout(typingTimeoutRef.current);
                    typingTimeoutRef.current = setTimeout(() => {
                        setTypingUser(null);
                    }, 2500);
                }
            })
            .listen('.MessageRead', (e) => {
                // Check if the other person read OUR messages
                if (Number(e.reader_id) === Number(receiver.id)) {
                    setMessages(prev =>
                        prev.map(msg => ({
                            ...msg,
                            read_at: msg.read_at || new Date().toISOString()
                        }))
                    );
                }
            });

        return () => {
            window.Echo.leave(channelName);
            clearTimeout(typingTimeoutRef.current);
        };
    }, [currentUserId, receiver.id]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const tempMessage = {
            id: Date.now(),
            sender_id: currentUserId,
            receiver_id: receiver.id,
            content: newMessage.trim(),
            created_at: new Date().toISOString(),
            read_at: null,
            sender: { name: 'You' },
        };

        setMessages(prev => [...prev, tempMessage]);
        setNewMessage('');

        try {
            const response = await axios.post('/api/chat/send', {
                receiver_id: receiver.id,
                content: tempMessage.content,
            });

            setMessages(prev =>
                prev.map(msg =>
                    msg.id === tempMessage.id ? response.data.message : msg
                )
            );
        } catch (err) {
            console.error("Error sending message:", err);
            setMessages(prev => prev.filter(m => m.id !== tempMessage.id));
        }
    };

    const handleTyping = async (e) => {
        setNewMessage(e.target.value);
        if (!isTyping) {
            setIsTyping(true);
            try {
                await axios.post('/api/chat/typing', { receiver_id: receiver.id });
            } catch (err) {}
            setTimeout(() => setIsTyping(false), 2000);
        }
    };

    return (
        <div className="card card-primary card-outline direct-chat direct-chat-primary">
            <div className="card-header">
                <h3 className="card-title">Chat con {receiver.name}</h3>
            </div>

            <div className="card-body">
                <div className="direct-chat-messages" style={{ height: '50vh', overflowY: 'scroll' }}>
                    {messages.map(msg => {
                        const isMe = Number(msg.sender_id) === Number(currentUserId);
                        const time = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                        const bubbleStyle = {
                            backgroundColor: isMe ? '#dcf8c6' : '#f1f0f0',
                            color: '#000',
                            borderRadius: '10px',
                            padding: '8px 10px',
                            display: 'inline-block',
                            maxWidth: '75%',
                        };

                        return (
                            <div key={msg.id} className={`direct-chat-msg ${isMe ? 'right' : ''}`}>
                                <div className="direct-chat-infos clearfix">
                                    <span className={`direct-chat-name ${isMe ? 'float-right' : 'float-left'}`}>
                                        {isMe ? 'You' : msg.sender?.name}
                                    </span>
                                    <span className={`direct-chat-timestamp ${isMe ? 'float-left' : 'float-right'}`}>
                                        {time}
                                    </span>
                                </div>
                                <i className="direct-chat-img fas fa-user-circle"></i>
                                <div className="direct-chat-text" style={bubbleStyle}>
                                    {msg.content}
                                    {isMe && (
                                        <span className="ml-2" style={{ fontSize: '13px' }}>
                                            {msg.read_at ? (
                                                <span style={{ color: '#34B7F1' }}>✓✓</span>
                                            ) : (
                                                <span style={{ color: 'gray' }}>✓</span>
                                            )}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    {typingUser && (
                        <div className="text-muted small ml-3">
                            <i>{typingUser} está escribiendo...</i>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            <div className="card-footer">
                <form onSubmit={handleSend}>
                    <div className="input-group">
                        <input
                            type="text"
                            placeholder="Escribe un mensaje..."
                            className="form-control"
                            value={newMessage}
                            onChange={handleTyping}
                            autoComplete="off"
                        />
                        <span className="input-group-append">
                            <button type="submit" className="btn btn-primary" disabled={!newMessage.trim()}>
                                Enviar
                            </button>
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatWindow;