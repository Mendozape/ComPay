import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import ChatWindow from '../../components/ChatWindow';

const ChatPage = ({ user }) => {
    const [activeContact, setActiveContact] = useState(null); 
    const [contacts, setContacts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 👈 NEW STATES for Search and Pagination
    const [searchTerm, setSearchTerm] = useState(''); 
    const [currentPage, setCurrentPage] = useState(1); 
    const contactsPerPage = 10; 

    // Initial Contacts Fetch
    useEffect(() => {
        const fetchContacts = async () => {
            try {
                // NOTE: If the list is too large, this route should be updated to include pagination in Laravel.
                const response = await axios.get('/api/chat/contacts');
                setContacts(response.data.users);
            } catch (error) {
                console.error("Error fetching chat contacts:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchContacts();
    }, []);

    // Real-time listener to update contact badges (KEEP THIS BLOCK AS IS)
    useEffect(() => {
        if (!user?.id || !window.Echo) return;

        const userChannel = `App.Models.User.${user.id}`;

        window.Echo.private(userChannel)
            .listen('.MessageSent', (e) => {
                if (e.message.receiver_id === user.id) {
                    const isViewingThisChat = activeContact && activeContact.id === e.message.sender_id;
                    
                    if (!isViewingThisChat) {
                        setContacts(prevContacts => 
                            prevContacts.map(contact => {
                                if (contact.id === e.message.sender_id) {
                                    return {
                                        ...contact,
                                        unread_count: (contact.unread_count || 0) + 1
                                    };
                                }
                                return contact;
                            })
                        );
                    }
                }
            });

        return () => {
            window.Echo.leave(userChannel);
        };
    }, [user?.id, activeContact]); 

    // Function to handle when a contact is selected
    const handleSelectContact = (contact) => {
        setActiveContact(contact);
        
        // Reset the selected contact's counter immediately (optimistic UI)
        setContacts(prevContacts => 
            prevContacts.map(c => 
                c.id === contact.id ? { ...c, unread_count: 0 } : c
            )
        );

        console.log('Dispatching chat-messages-read event...');
        window.dispatchEvent(new CustomEvent('chat-messages-read'));
    };
    
    // -----------------------------------------------------------
    // FILTERING AND PAGINATION LOGIC (using useMemo for efficiency)
    // -----------------------------------------------------------
    
    const filteredContacts = useMemo(() => {
        // Filter contacts based on search term
        return contacts.filter(contact =>
            contact.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [contacts, searchTerm]);

    const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

    const currentContacts = useMemo(() => {
        // Calculate which contacts to show on the current page
        const indexOfLastContact = currentPage * contactsPerPage;
        const indexOfFirstContact = indexOfLastContact - contactsPerPage;
        return filteredContacts.slice(indexOfFirstContact, indexOfLastContact);
    }, [filteredContacts, currentPage, contactsPerPage]);


    return (
        <div className="content-wrapper" style={{ minHeight: '80vh' }}>
            <section className="content pt-3">
                <div className="row">
                    
                    {/* Contacts Column (Sidebar with Search and Pagination) */}
                    <div className="col-md-4">
                        <div className="card card-primary card-outline">
                            <div className="card-header">
                                <h3 className="card-title">👥 Contactos</h3>
                            </div>
                            
                            {/* SEARCH FIELD */}
                            <div className="card-body p-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder="Buscar contacto..."
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setCurrentPage(1); // Reset to page 1 when searching
                                    }}
                                />
                            </div>

                            {/* PAGINATED CONTACT LIST */}
                            <div className="card-body p-0" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                {isLoading && <p className="text-center p-3">Cargando usuarios...</p>}
                                
                                {/* Show message if no results */}
                                {(!isLoading && currentContacts.length === 0) && (
                                    <p className="text-center p-3 text-muted">No se encontraron contactos.</p>
                                )}

                                <ul className="nav nav-pills flex-column">
                                    {/* Map ONLY the contacts from the current page */}
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
                                                
                                                {/* Unread message badge per contact */}
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
                            
                            {/* PAGINATION CONTROLS */}
                            {(totalPages > 1 && filteredContacts.length > 0) && (
                                <div className="card-footer clearfix">
                                    <ul className="pagination pagination-sm m-0 float-right">
                                        
                                        {/* Previous Button */}
                                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                                            <a className="page-link" href="#" onClick={(e) => {e.preventDefault(); setCurrentPage(prev => Math.max(prev - 1, 1));}}>«</a>
                                        </li>
                                        
                                        {/* Page Indicator */}
                                        <li className="page-item disabled">
                                            <span className="page-link text-muted">Página {currentPage} de {totalPages}</span>
                                        </li>

                                        {/* Next Button */}
                                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                                            <a className="page-link" href="#" onClick={(e) => {e.preventDefault(); setCurrentPage(prev => Math.min(prev + 1, totalPages));}}>»</a>
                                        </li>
                                    </ul>
                                </div>
                            )}
                            
                        </div>
                    </div>

                    {/* Conversation Column (Main Window) */}
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
