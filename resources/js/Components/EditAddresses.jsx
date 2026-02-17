import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const endpoint = '/api/addresses';
const userSearchEndpoint = '/api/usuarios'; 
const streetsEndpoint = '/api/streets';

/**
 * EditAddresses Component
 * Manages the retrieval and update of property details, including resident assignment,
 * street mapping, and occupation status.
 */
export default function EditAddresses() {
    // --- STATE FOR FORM INPUTS ---
    const [community, setCommunity] = useState('PRADOS DE LA HUERTA');
    const [streetId, setStreetId] = useState('');
    const [streetNumber, setStreetNumber] = useState('');
    const [type, setType] = useState('');
    const [status, setStatus] = useState(''); 
    const [comments, setComments] = useState('');
    const [monthsOverdue, setMonthsOverdue] = useState(0);
    const [formValidated, setFormValidated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- STATES FOR USER ASSIGNMENT ---
    const [userQuery, setUserQuery] = useState('');
    const [userId, setUserId] = useState(null); 
    const [userSuggestions, setUserSuggestions] = useState([]);

    // --- STATE FOR STREETS CATALOG ---
    const [streets, setStreets] = useState([]);

    const navigate = useNavigate();
    const { id } = useParams();

    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: 'application/json' },
    };

    /**
     * Restrict input to digits only
     */
    const handleNumberInput = (e) => {
        if (!/\d/.test(e.key)) e.preventDefault();
    };

    /**
     * Manage historical debt field with a logical cap
     */
    const handleMonthsOverdueChange = (e) => {
        const value = e.target.value.replace(/[^0-9]/g, '');
        const num = parseInt(value) || 0;
        setMonthsOverdue(Math.min(num, 100));
    };

    /**
     * Fetch existing address data and streets catalog on load
     */
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // Parallel fetching for performance
                const [addressRes, streetsRes] = await Promise.all([
                    axios.get(`${endpoint}/${id}`, axiosOptions),
                    axios.get(streetsEndpoint, axiosOptions)
                ]);

                // 1. Process Street Catalog
                const streetData = streetsRes.data.data || streetsRes.data;
                setStreets(streetData.filter(s => !s.deleted_at) || []);

                // 2. Process Address Data
                const address = addressRes.data.data;
                setCommunity(address.community || 'PRADOS DE LA HUERTA');
                setStreetId(address.street_id || '');
                setStreetNumber(address.street_number || '');
                setType(address.type || '');
                setStatus(address.status || ''); 
                setComments(address.comments || '');
                setMonthsOverdue(address.months_overdue ?? 0);
                
                if (address.user) {
                    setUserId(address.user.id);
                    setUserQuery(address.user.name);
                }
            } catch (error) {
                console.error('Initial load error:', error);
                toastr.error('Fallo al cargar los datos del predio.', 'Error');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    /**
     * User Autocomplete Logic (Debounced search)
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
                console.error('User search error:', error);
            }
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [userQuery, userId]);

    /**
     * Handle user selection from autocomplete
     */
    const handleSelectUser = (userSelected) => {
        setUserId(userSelected.id);
        setUserQuery(userSelected.name);
        setUserSuggestions([]);
    };

    /**
     * Send update request to API
     */
    const handleUpdate = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        // Strict Validation: Resident, Street, and Occupation Status (if CASA)
        const isStatusMissing = type === 'CASA' && !status;

        if (form.checkValidity() === false || !userId || !streetId || isStatusMissing) {
            e.stopPropagation();
            setFormValidated(true);
            toastr.warning('Por favor, complete los campos obligatorios, incluyendo el residente y el estado de ocupación.', 'Atención');
            return;
        }

        setIsSaving(true);
        try {
            await axios.put(`${endpoint}/${id}`, {
                community,
                street_id: streetId,
                street_number: streetNumber,
                type,
                status: type === 'CASA' ? status : 'Deshabitada',
                comments,
                user_id: userId,
                months_overdue: monthsOverdue
            }, axiosOptions);

            toastr.success('Dirección actualizada exitosamente.', 'Éxito');
            navigate('/addresses');
        } catch (error) {
            const msg = error.response?.data?.message || 'Error al actualizar el predio.';
            toastr.error(msg, 'Operación Fallida');
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando datos del predio...</p>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                {/* Standardized Success Green Header */}
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4"><i className="fas fa-edit me-2"></i>Editar Predio</h2>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={handleUpdate} noValidate className={formValidated ? 'was-validated' : ''}>
                        
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
                                    placeholder="Buscar usuario..."
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
                                <label className='form-label fw-bold'>Núm. Predio <span className="text-danger">*</span></label>
                                <input
                                    value={streetNumber}
                                    onChange={(e) => setStreetNumber(e.target.value)}
                                    onKeyPress={handleNumberInput} 
                                    type='text' 
                                    className='form-control'
                                    placeholder="Número"
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
                                placeholder="Notas internas..."
                            />
                        </div>

                        {/* ACTION BUTTONS */}
                        <div className="d-flex gap-2 pt-3 border-top">
                            <button type='submit' className='btn btn-success px-4 shadow-sm' disabled={isSaving}>
                                <i className="fas fa-save me-1"></i> {isSaving ? 'Actualizando...' : 'Actualizar Datos'}
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