import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ChatWindow from '../../components/ChatWindow';

const ChatPage = ({ user }) => {
    const [activeContact, setActiveContact] = useState(null); 
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    const [searchTerm, setSearchTerm] = useState(''); 
    const [currentPage, setCurrentPage] = useState(1); 
    const contactsPerPage = 10; 

    /**
     * Fetch the contact list from the server
     */
    const fetchContacts = async () => {
        try {
            const response = await axios.get('/api/chat/contacts');
            setContacts(response.data.users);
        } catch (error) {
            console.error("Error fetching chat contacts:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Initial Fetch
    useEffect(() => {
        fetchContacts();
    }, []);

    /**
     * Real-time listener on the USER'S notification channel.
     * This ensures the list updates even if the user is browsing the contact list
     * but not looking at the specific chat that received a message.
     */
    useEffect(() => {
        if (!user?.id || !window.Echo) return;

        // Using the same global channel as ChatBadgeUpdater
        const userChannel = `App.Models.User.${user.id}`;

        window.Echo.private(userChannel)
            .listen('.MessageSent', (e) => {
                if (e.message.receiver_id === user.id) {
                    const senderId = e.message.sender_id;
                    const isViewingThisChat = activeContact && activeContact.id === senderId;
                    
                    if (!isViewingThisChat) {
                        setContacts(prevContacts => {
                            const contactExists = prevContacts.some(c => c.id === senderId);
                            
                            // If contact exists in current list, increment unread count locally
                            if (contactExists) {
                                return prevContacts.map(contact => {
                                    if (contact.id === senderId) {
                                        return {
                                          ...contact,
                                          unread_count: (contact.unread_count || 0) + 1
                                        };
                                    }
                                    return contact;
                                });
                            } else {
                                // If contact is not in the list (e.g. filtered or new), refresh from server
                                fetchContacts();
                                return prevContacts;
                            }
                        });
                    }
                }
            });

        return () => {
            window.Echo.leave(userChannel);
        };
    }, [user?.id, activeContact]); 

    /**
     * Handles contact selection and resets their unread count locally
     */
    const handleSelectContact = (contact) => {
        setActiveContact(contact);
        
        // Optimistic UI update: clear badge immediately
        setContacts(prevContacts => 
            prevContacts.map(c => 
                c.id === contact.id ? { ...c, unread_count: 0 } : c
            )
        );

        // Notify ChatBadgeUpdater and other components to sync global count
        window.dispatchEvent(new CustomEvent('chat-messages-read'));
    };
    
    // Filtering and Pagination Logic
    const filteredContacts = useMemo(() => {
        return contacts.filter(contact =>
            contact.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, searchTerm]);

    const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

    const currentContacts = useMemo(() => {
        const indexOfLastContact = currentPage * contactsPerPage;
        const indexOfFirstContact = indexOfLastContact - contactsPerPage;
        return filteredContacts.slice(indexOfFirstContact, indexOfLastContact);
    }, [filteredContacts, currentPage]);


    return (
        <div className="content-wrapper" style={{ minHeight: '80vh' }}>
            <section className="content pt-3">
                <div className="row">
                    
                    {/* Contacts Column */}
                    <div className="col-md-4">
                        <div className="card card-primary card-outline">
                            <div className="card-header">
                                <h3 className="card-title">👥 Contactos</h3>
                            </div>
                            
                            <div className="card-body p-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar contacto..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                />
                            </div>

                            <div className="card-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {isLoading && <p className="text-center p-3">Cargando usuarios...</p>}
                                
                                {!isLoading && currentContacts.length === 0 && (
                                    <p className="text-center p-3 text-muted">No se encontraron contactos.</p>
                                )}

                                <ul className="nav nav-pills flex-column">
                                    {currentContacts.map(contact => (
                                        <li 
                                            className="nav-item" 
                                            key={contact.id}
                                            onClick={() => handleSelectContact(contact)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <a 
                                                href="#" 
                                                className={`nav-link ${activeContact && activeContact.id === contact.id ? 'active' : ''}`}
                                                onClick={(e) => e.preventDefault()}
                                            >
                                                <i className="fas fa-user mr-2"></i> 
                                                {contact.name}
                                                
                                                {contact.unread_count > 0 && (
                                                    <span className="badge badge-danger float-right">
                                                        {contact.unread_count}
                                                    </span>
                                                )}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            
                            {/* Pagination */}
                            {totalPages > 1 && filteredContacts.length > 0 && (
                                <div className="card-footer clearfix">
                                    <ul className="pagination pagination-sm m-0 float-right">
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <a className="page-link" href="#" onClick={(e) => {e.preventDefault(); setCurrentPage(prev => Math.max(prev - 1, 1));}}>«</a>
                                        </li>
                                        <li className="page-item disabled">
                                            <span className="page-link text-muted">Página {currentPage} de {totalPages}</span>
                                        </li>
                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <a className="page-link" href="#" onClick={(e) => {e.preventDefault(); setCurrentPage(prev => Math.min(prev + 1, totalPages));}}>»</a>
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Chat Window Column */}
                    <div className="col-md-8">
                        {activeContact ? (
                            <ChatWindow 
                                currentUserId={user.id} 
                                receiver={activeContact} 
                            />
                        ) : (
                            <div className="card card-primary card-outline">
                                <div className="card-body">
                                    <p className="text-center text-muted">Selecciona un contacto para iniciar la conversación.</p>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </section>
        </div>
    );
};

export default ChatPage;