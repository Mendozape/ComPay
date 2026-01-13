import React, { useState, useContext, useEffect } from 'react'; 
import axios from 'axios';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/addresses';
// UPDATED: Now points to the users endpoint for search
const userSearchEndpoint = '/api/usuarios'; 
const streetsEndpoint = '/api/streets'; 

export default function CreateAddresses() {
    // --- STATE FOR ADDRESS FORM ---
    const [community, setCommunity] = useState('PRADOS DE LA HUERTA'); 
    const [streetId, setStreetId] = useState(''); 
    const [streetNumber, setStreetNumber] = useState('');
    const [type, setType] = useState(''); 
    const [comments, setComments] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [monthsOverdue, setMonthsOverdue] = useState(0); 
    const [streets, setStreets] = useState([]); 

    // --- STATES FOR USER (RESIDENT) ASSIGNMENT ---
    const [userQuery, setUserQuery] = useState('');
    const [userId, setUserId] = useState(null); 
    const [userSuggestions, setUserSuggestions] = useState([]);
    const [selectedUserName, setSelectedUserName] = useState('');
    const [hasExistingAddress, setHasExistingAddress] = useState(false); 

    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: 'application/json' },
    };

    // Restrict input to only numeric digits
    const handleNumberInput = (e) => {
        if (!/\d/.test(e.key)) e.preventDefault();
    };
    
    // Handle change for monthsOverdue with a cap
    const handleMonthsOverdueChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        const num = parseInt(value) || 0; 
        setMonthsOverdue(Math.min(num, 100)); 
    };
    
    // Fetch available streets from catalog
    const fetchStreets = async () => {
        try {
            const response = await axios.get(streetsEndpoint, axiosOptions);
            const activeStreets = response.data.data.filter(s => !s.deleted_at); 
            setStreets(activeStreets || []);
        } catch (error) {
            console.error('Error fetching streets:', error);
            setErrorMessage('Fallo al cargar el catálogo de calles.');
        }
    };

    useEffect(() => {
        fetchStreets();
    }, []);

    // --- USER AUTOCOMPLETE LOGIC (Debouncing) ---
    useEffect(() => {
        if (!userQuery || userId) { 
            setUserSuggestions([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                // Search users by name. Note: your backend should support this search in the users index or a specific search endpoint.
                const response = await axios.get(`${userSearchEndpoint}?search=${userQuery}`, axiosOptions);
                
                // Adjusting based on standard pagination response or direct array
                const data = response.data.data || response.data;
                const suggestions = Array.isArray(data) ? data : [];
                setUserSuggestions(suggestions);
            } catch (error) {
                console.error('Error fetching user search results:', error);
                setUserSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [userQuery, userId]);

    // Handler when a user suggestion is clicked
    const handleSelectUser = (user) => {
        setUserId(user.id);
        setSelectedUserName(user.name);
        setUserQuery(user.name); 
        setUserSuggestions([]); 
        
        // Check if the user already has an assigned address (1:1 logic)
        setHasExistingAddress(false); 
    };

    const store = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        // Validation check
        if (form.checkValidity() === false || !userId || !streetId) {
            e.stopPropagation();
            if (hasExistingAddress) {
                setErrorMessage('El usuario seleccionado ya tiene una dirección asignada.');
            } else {
                setErrorMessage('Por favor, complete todos los campos obligatorios, incluyendo la asignación de Usuario y Calle.'); 
            }
            setFormValidated(true);
            return;
        }

        try {
            await axios.post(endpoint, {
                community,
                street_id: streetId,
                street_number: streetNumber,
                type,
                comments,
                user_id: userId, // Sending user_id instead of resident_id
                months_overdue: monthsOverdue
            }, axiosOptions);

            setSuccessMessage('Dirección creada y usuario asignado exitosamente.');
            setErrorMessage('');
            navigate('/addresses');
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Fallo al crear la dirección.';
            setErrorMessage(errorMsg);
            console.error('Error creating address:', error);
        }
        setFormValidated(true);
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm">
                <div className="card-header bg-success text-white">
                    <h2 className="mb-0 h4">Registrar Nuevo Predio</h2>
                </div>
                <div className="card-body">
                    {errorMessage && <div className="alert alert-danger text-center">{errorMessage}</div>}
                    
                    <form onSubmit={store} noValidate className={formValidated ? 'was-validated' : ''}>
                        
                        {/* FIELD: USER ASSIGNMENT (AUTOCOMPLETE) */}
                        <div className='mb-4 position-relative'>
                            <label className='form-label fw-bold'>Usuario / Residente Asignado <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <span className="input-group-text"><i className="fas fa-user"></i></span>
                                <input
                                    type='text'
                                    className={`form-control ${formValidated && (!userId || hasExistingAddress) ? 'is-invalid' : (userId && !hasExistingAddress ? 'is-valid' : '')}`}
                                    value={userQuery}
                                    onChange={(e) => {
                                        setUserQuery(e.target.value);
                                        setUserId(null); 
                                        setHasExistingAddress(false);
                                    }}
                                    placeholder="Escriba el nombre del usuario para buscar..."
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            
                            {userSuggestions.length > 0 && (
                                <ul className="list-group position-absolute w-100 shadow-lg" style={{ zIndex: 1000 }}>
                                    {userSuggestions.map((u) => (
                                        <li
                                            key={u.id}
                                            className="list-group-item list-group-item-action"
                                            onClick={() => handleSelectUser(u)}
                                            style={{ cursor: 'pointer' }}
                                        >
                                            <strong>{u.name}</strong> <small className="text-muted">({u.email})</small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            
                            {userId && !hasExistingAddress && <div className="form-text text-success">Usuario seleccionado correctamente.</div>}
                            {hasExistingAddress && <div className="text-danger small mt-1">⚠️ Este usuario ya tiene un predio vinculado.</div>}
                        </div>

                        <div className="row">
                            {/* COMMUNITY */}
                            <div className='col-md-6 mb-3'>
                                <label className='form-label fw-bold'>Comunidad</label>
                                <input className='form-control bg-light' value={community} readOnly />
                            </div>

                            {/* STREET SELECT */}
                            <div className='col-md-6 mb-3'>
                                <label className='form-label fw-bold'>Calle <span className="text-danger">*</span></label>
                                <select
                                    value={streetId}
                                    onChange={(e) => setStreetId(e.target.value)}
                                    className={`form-control ${formValidated && !streetId ? 'is-invalid' : ''}`}
                                    required
                                >
                                    <option value="" disabled>Seleccione una calle...</option>
                                    {streets.map((st) => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="row">
                            {/* STREET NUMBER */}
                            <div className='col-md-4 mb-3'>
                                <label className='form-label fw-bold'>Número de Predio <span className="text-danger">*</span></label>
                                <input
                                    value={streetNumber}
                                    onChange={(e) => setStreetNumber(e.target.value)}
                                    onKeyPress={handleNumberInput} 
                                    type='text' 
                                    className='form-control'
                                    placeholder="Solo números"
                                    required
                                />
                            </div>

                            {/* TYPE SELECT */}
                            <div className='col-md-4 mb-3'>
                                <label className='form-label fw-bold'>Tipo de Predio <span className="text-danger">*</span></label>
                                <select
                                    value={type}
                                    onChange={(e) => setType(e.target.value)}
                                    className='form-control'
                                    required 
                                >
                                    <option value="" disabled>Seleccione...</option>
                                    <option value="CASA">CASA</option>
                                    <option value="TERRENO">TERRENO</option>
                                </select>
                            </div>

                            {/* MONTHS OVERDUE */}
                            <div className='col-md-4 mb-3'>
                                <label className='form-label fw-bold'>Meses Atrasados (Histórico)</label>
                                <input
                                    value={monthsOverdue}
                                    onChange={handleMonthsOverdueChange}
                                    type='number' 
                                    className='form-control'
                                    required
                                />
                                <div className="form-text">Deuda previa a 2026.</div>
                            </div>
                        </div>

                        {/* COMMENTS */}
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>Comentarios Adicionales</label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className='form-control'
                                rows='2'
                                placeholder="Notas internas sobre la ubicación o el predio..."
                            />
                        </div>

                        <div className="d-flex gap-2">
                            <button type='submit' className='btn btn-success px-4'>
                                <i className="fas fa-save me-1"></i> Registrar Predio
                            </button>
                            <button type='button' className='btn btn-secondary' onClick={() => navigate('/addresses')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}