import React, { useState, useEffect } from 'react'; 
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/addresses';
const userSearchEndpoint = '/api/usuarios'; 
const streetsEndpoint = '/api/streets'; 

/**
 * CreateAddresses Component
 * Handles the registration of new properties (CASA or TERRENO) 
 * and assigns them to a resident.
 */
export default function CreateAddresses() {
    // --- STATE FOR ADDRESS FORM ---
    const [community] = useState('PRADOS DE LA HUERTA'); 
    const [streetId, setStreetId] = useState(''); 
    const [streetNumber, setStreetNumber] = useState('');
    const [type, setType] = useState(''); 
    const [status, setStatus] = useState(''); 
    const [comments, setComments] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [monthsOverdue, setMonthsOverdue] = useState(0); 
    const [streets, setStreets] = useState([]); 
    const [isSaving, setIsSaving] = useState(false);

    // --- STATES FOR USER (RESIDENT) ASSIGNMENT ---
    const [userQuery, setUserQuery] = useState('');
    const [userId, setUserId] = useState(null); 
    const [userSuggestions, setUserSuggestions] = useState([]);
    const [noResults, setNoResults] = useState(false); // Flag for empty search results

    const navigate = useNavigate();

    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: 'application/json' },
    };

    /**
     * Restrict input to numbers only
     */
    const handleNumberInput = (e) => {
        if (!/\d/.test(e.key)) e.preventDefault();
    };
    
    /**
     * Sync months overdue with a limit of 100
     */
    const handleMonthsOverdueChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        const num = parseInt(value) || 0; 
        setMonthsOverdue(Math.min(num, 100)); 
    };
    
    /**
     * Fetch Streets Catalog from API on mount
     */
    useEffect(() => {
        const fetchStreets = async () => {
            try {
                const response = await axios.get(streetsEndpoint, axiosOptions);
                const data = response.data.data || response.data;
                const activeStreets = data.filter(s => !s.deleted_at); 
                setStreets(activeStreets || []);
            } catch (error) {
                console.error('Error fetching streets:', error);
                toastr.error('Fallo al cargar el catálogo de calles.', 'Fallo');
            }
        };
        fetchStreets();
    }, []);

    /**
     * User Autocomplete Search Logic (Debounced)
     */
    useEffect(() => {
        // Reset results flag on every query change
        setNoResults(false);

        if (!userQuery || userId) { 
            setUserSuggestions([]);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            try {
                const response = await axios.get(`${userSearchEndpoint}?search=${userQuery}`, axiosOptions);
                const data = response.data.data || response.data;
                const results = Array.isArray(data) ? data : [];
                
                setUserSuggestions(results);
                // Trigger message if user is typing and no results are returned
                if (userQuery.length > 0 && results.length === 0) {
                    setNoResults(true);
                }
            } catch (error) {
                console.error('Error searching users:', error);
                setUserSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [userQuery, userId]);

    /**
     * Select user from autocomplete list
     */
    const handleSelectUser = (user) => {
        setUserId(user.id);
        setUserQuery(user.name); 
        setUserSuggestions([]); 
        setNoResults(false);
    };

    /**
     * Handle form submission
     */
    const store = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        const isStatusMissing = type === 'CASA' && !status;

        if (form.checkValidity() === false || !userId || !streetId || isStatusMissing) {
            e.stopPropagation();
            setFormValidated(true);
            toastr.warning('Por favor, complete todos los campos obligatorios, incluyendo el residente y el estado de ocupación.', 'Atención');
            return;
        }

        setIsSaving(true);
        try {
            await axios.post(endpoint, {
                community,
                street_id: streetId,
                street_number: streetNumber,
                type,
                status: type === 'CASA' ? status : 'Deshabitada',
                comments,
                user_id: userId,
                months_overdue: monthsOverdue
            }, axiosOptions);

            toastr.success('Predio registrado exitosamente.', 'Éxito');
            navigate('/addresses');
        } catch (error) {
            const errorMsg = error.response?.data?.message || 'Fallo al crear el predio.';
            toastr.error(errorMsg, 'Operación Fallida');
        } finally {
            setIsSaving(false);
            setFormValidated(true);
        }
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4"><i className="fas fa-home me-2"></i>Registrar Nuevo Predio</h2>
                </div>
                <div className="card-body p-4">
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
                            
                            {/* Empty Result Message */}
                            {noResults && (
                                <div className="text-danger small mt-1 fw-bold">
                                    <i className="fas fa-exclamation-circle me-1"></i>No se encontraron residentes con el texto ingresado
                                </div>
                            )}

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
                                        if(e.target.value !== 'CASA') setStatus('');
                                    }}
                                    className='form-select'
                                    required 
                                >
                                    <option value="" disabled>Seleccione...</option>
                                    <option value="CASA">CASA</option>
                                    <option value="TERRENO">TERRENO</option>
                                </select>
                            </div>
                            
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
                            <button type='submit' className='btn btn-success px-4 shadow-sm' disabled={isSaving}>
                                <i className="fas fa-save me-2"></i>{isSaving ? 'Registrando...' : 'Registrar Predio'}
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