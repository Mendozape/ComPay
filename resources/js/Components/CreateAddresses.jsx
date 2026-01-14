import React, { useState, useContext, useEffect } from 'react'; 
import axios from 'axios';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/addresses';
const userSearchEndpoint = '/api/usuarios'; 
const streetsEndpoint = '/api/streets'; 

export default function CreateAddresses() {
    // --- STATE FOR ADDRESS FORM ---
    const [community, setCommunity] = useState('PRADOS DE LA HUERTA'); 
    const [streetId, setStreetId] = useState(''); 
    const [streetNumber, setStreetNumber] = useState('');
    const [type, setType] = useState(''); 
    
    /** * 🔥 IMPROVEMENT: Initialized as empty string.
     * This forces the user to pick "Habitada" or "Deshabitada" manually
     * if the property type is "CASA".
     */
    const [status, setStatus] = useState(''); 
    
    const [comments, setComments] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [monthsOverdue, setMonthsOverdue] = useState(0); 
    const [streets, setStreets] = useState([]); 

    // --- STATES FOR USER (RESIDENT) ASSIGNMENT ---
    const [userQuery, setUserQuery] = useState('');
    const [userId, setUserId] = useState(null); 
    const [userSuggestions, setUserSuggestions] = useState([]);

    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: 'application/json' },
    };

    /**
     * Input restrictions for numbers
     */
    const handleNumberInput = (e) => {
        if (!/\d/.test(e.key)) e.preventDefault();
    };
    
    const handleMonthsOverdueChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        const num = parseInt(value) || 0; 
        setMonthsOverdue(Math.min(num, 100)); 
    };
    
    /**
     * Fetch Streets Catalog from API
     */
    const fetchStreets = async () => {
        try {
            const response = await axios.get(streetsEndpoint, axiosOptions);
            const data = response.data.data || response.data;
            const activeStreets = data.filter(s => !s.deleted_at); 
            setStreets(activeStreets || []);
        } catch (error) {
            console.error('Error fetching streets:', error);
            setErrorMessage('Fallo al cargar el catálogo de calles.');
        }
    };

    useEffect(() => {
        fetchStreets();
    }, []);

    /**
     * User Autocomplete Search (Debounce logic)
     */
    useEffect(() => {
        if (!userQuery || userId) { 
            setUserSuggestions([]);
            return;
        }
        const delayDebounceFn = setTimeout(async () => {
            try {
                const response = await axios.get(`${userSearchEndpoint}?search=${userQuery}`, axiosOptions);
                const data = response.data.data || response.data;
                setUserSuggestions(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error('Error searching users:', error);
                setUserSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [userQuery, userId]);

    const handleSelectUser = (user) => {
        setUserId(user.id);
        setUserQuery(user.name); 
        setUserSuggestions([]); 
    };

    /**
     * Handle form submission
     */
    const store = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        // Validation: Ensure User, Street, and Status (if CASA) are selected
        const isStatusMissing = type === 'CASA' && !status;

        if (form.checkValidity() === false || !userId || !streetId || isStatusMissing) {
            e.stopPropagation();
            setErrorMessage('Por favor, complete todos los campos obligatorios, incluyendo el estado de la casa.'); 
            setFormValidated(true);
            return;
        }

        try {
            await axios.post(endpoint, {
                community,
                street_id: streetId,
                street_number: streetNumber,
                type,
                // If type is LAND, it defaults to Deshabitada for DB consistency
                status: type === 'CASA' ? status : 'Deshabitada',
                comments,
                user_id: userId,
                months_overdue: monthsOverdue
            }, axiosOptions);

            setSuccessMessage('Predio registrado exitosamente.');
            navigate('/addresses');
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Fallo al crear el predio.';
            setErrorMessage(errorMsg);
        }
        setFormValidated(true);
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                {/* Standardized Success Green Header */}
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4"><i className="fas fa-home me-2"></i>Registrar Nuevo Predio</h2>
                </div>
                <div className="card-body p-4">
                    {errorMessage && <div className="alert alert-danger text-center shadow-sm">{errorMessage}</div>}
                    
                    <form onSubmit={store} noValidate className={formValidated ? 'was-validated' : ''}>
                        
                        {/* ROW 1: USER ASSIGNMENT */}
                        <div className='mb-4 position-relative'>
                            <label className='form-label fw-bold'>Usuario / Residente Asignado <span className="text-danger">*</span></label>
                            <div className="input-group">
                                <span className="input-group-text"><i className="fas fa-user"></i></span>
                                <input
                                    type='text'
                                    className={`form-control ${formValidated && !userId ? 'is-invalid' : ''}`}
                                    value={userQuery}
                                    onChange={(e) => {
                                        setUserQuery(e.target.value);
                                        setUserId(null); 
                                    }}
                                    placeholder="Escriba el nombre del residente para buscar..."
                                    required
                                    autoComplete="off"
                                />
                            </div>
                            {userSuggestions.length > 0 && (
                                <ul className="list-group position-absolute w-100 shadow-lg" style={{ zIndex: 1000 }}>
                                    {userSuggestions.map((u) => (
                                        <li key={u.id} className="list-group-item list-group-item-action" onClick={() => handleSelectUser(u)} style={{ cursor: 'pointer' }}>
                                            <strong>{u.name}</strong> <small className="text-muted">({u.email})</small>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>

                        {/* ROW 2: COMMUNITY, STREET, AND NUMBER */}
                        <div className="row g-3 mb-3">
                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Comunidad</label>
                                <input className='form-control bg-light' value={community} readOnly />
                            </div>
                            <div className='col-md-5'>
                                <label className='form-label fw-bold'>Calle <span className="text-danger">*</span></label>
                                <select
                                    value={streetId}
                                    onChange={(e) => setStreetId(e.target.value)}
                                    className={`form-select ${formValidated && !streetId ? 'is-invalid' : ''}`}
                                    required
                                >
                                    <option value="" disabled>Seleccione una calle...</option>
                                    {streets.map((st) => (
                                        <option key={st.id} value={st.id}>{st.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className='col-md-3'>
                                <label className='form-label fw-bold'>Núm. Exterior <span className="text-danger">*</span></label>
                                <input
                                    value={streetNumber}
                                    onChange={(e) => setStreetNumber(e.target.value)}
                                    onKeyPress={handleNumberInput} 
                                    type='text' 
                                    className='form-control'
                                    placeholder="Ej. 123"
                                    required
                                />
                            </div>
                        </div>

                        {/* ROW 3: DEBT, TYPE, AND STATUS */}
                        <div className="row g-3 mb-4">
                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Meses Atrasados (Histórico)</label>
                                <input
                                    value={monthsOverdue}
                                    onChange={handleMonthsOverdueChange}
                                    type='number' 
                                    className='form-control'
                                    required
                                />
                            </div>
                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Tipo de Predio <span className="text-danger">*</span></label>
                                <select
                                    value={type}
                                    onChange={(e) => {
                                        setType(e.target.value);
                                        if(e.target.value !== 'CASA') setStatus(''); // Reset status if changed to Land
                                    }}
                                    className='form-select'
                                    required 
                                >
                                    <option value="" disabled>Seleccione...</option>
                                    <option value="CASA">CASA</option>
                                    <option value="TERRENO">TERRENO</option>
                                </select>
                            </div>
                            
                            {/* DYNAMIC FIELD: Shown only if type is CASA */}
                            {type === 'CASA' && (
                                <div className='col-md-4'>
                                    <label className='form-label fw-bold text-primary'>Estado de Ocupación <span className="text-danger">*</span></label>
                                    <select
                                        value={status}
                                        onChange={(e) => setStatus(e.target.value)}
                                        className={`form-select border-primary ${formValidated && !status ? 'is-invalid' : ''}`}
                                        required 
                                    >
                                        <option value="" disabled>-- Seleccione Estado --</option>
                                        <option value="Habitada">Habitada</option>
                                        <option value="Deshabitada">Deshabitada</option>
                                    </select>
                                    <div className="invalid-feedback">Debe elegir si la casa está habitada o no.</div>
                                </div>
                            )}
                        </div>

                        {/* ROW 4: COMMENTS */}
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>Comentarios Adicionales</label>
                            <textarea
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                className='form-control'
                                rows='2'
                                placeholder="Notas internas sobre el predio..."
                            />
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="d-flex gap-2 pt-3 border-top">
                            <button type='submit' className='btn btn-success px-4 shadow-sm'>
                                <i className="fas fa-save me-2"></i>Registrar Predio
                            </button>
                            <button type='button' className='btn btn-secondary px-4' onClick={() => navigate('/addresses')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}