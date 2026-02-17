import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const endpoint = '/api/fees/';

const axiosOptions = {
    withCredentials: true,
    headers: { Accept: 'application/json' }
};

/**
 * EditFees Component
 * Fetches and updates administrative fee configurations and amounts.
 */
export default function EditFees() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [amountOccupied, setAmountOccupied] = useState('');
    const [amountEmpty, setAmountEmpty] = useState('');
    const [amountLand, setAmountLand] = useState('');
    const [description, setDescription] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [errors, setErrors] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { id } = useParams();
    const navigate = useNavigate();

    /**
     * Submit updated data to the API
     */
    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            await axios.put(`${endpoint}${id}`, {
                name: name.trim(),
                amount_occupied: amountOccupied,
                amount_empty: amountEmpty,
                amount_land: amountLand,
                description: description.trim()
            }, axiosOptions);

            toastr.success('Cuota actualizada exitosamente.', 'Éxito');
            navigate('/fees');
        } catch (error) {
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                toastr.error('Error de validación. Revise los campos.', 'Fallo');
            } else {
                toastr.error('Fallo al actualizar la cuota.', 'Error');
            }
        } finally {
            setIsSaving(false);
            setShowModal(false);
        }
    };

    /**
     * Triggers the confirmation modal
     */
    const triggerModal = (e) => {
        e.preventDefault();
        setFormValidated(true);
        const form = e.currentTarget;
        if (form.checkValidity()) {
            setShowModal(true);
        } else {
            toastr.warning('Por favor, corrija los errores en el formulario.', 'Atención');
        }
    };

    /**
     * Fetch existing fee data to populate the form
     */
    useEffect(() => {
        const getFeeById = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${endpoint}${id}`, axiosOptions);
                const data = response.data.data || response.data;
                setName(data.name);
                setAmountOccupied(data.amount_occupied);
                setAmountEmpty(data.amount_empty);
                setAmountLand(data.amount_land);
                setDescription(data.description || '');
            } catch (error) {
                console.error('Error fetching fee:', error);
                toastr.error('Fallo al cargar los datos de la cuota.', 'Error');
            } finally {
                setLoading(false);
            }
        };
        getFeeById();
    }, [id]);

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando datos de la cuota...</p>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4"><i className="fas fa-edit me-2"></i>Editar Cuota Administrativa</h2>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={triggerModal} noValidate className={formValidated ? 'was-validated' : ''}>
                        
                        {/* Name Field */}
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>Nombre de la Cuota <span className="text-danger">*</span></label>
                            <input 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                type='text'
                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                placeholder="Ej. Cuota de Mantenimiento"
                                required
                            />
                            {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
                        </div>

                        {/* Categorized Amount Inputs */}
                        <div className="row g-3 mb-4">
                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Casa Habitada ($) <span className="text-danger">*</span></label>
                                <div className="input-group">
                                    <span className="input-group-text">$</span>
                                    <input 
                                        value={amountOccupied} 
                                        onChange={(e) => setAmountOccupied(e.target.value)}
                                        type='number'
                                        step="0.01"
                                        className='form-control'
                                        required
                                    />
                                </div>
                            </div>
                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Casa Deshabitada ($) <span className="text-danger">*</span></label>
                                <div className="input-group">
                                    <span className="input-group-text">$</span>
                                    <input 
                                        value={amountEmpty} 
                                        onChange={(e) => setAmountEmpty(e.target.value)}
                                        type='number'
                                        step="0.01"
                                        className='form-control'
                                        required
                                    />
                                </div>
                            </div>
                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Terreno ($) <span className="text-danger">*</span></label>
                                <div className="input-group">
                                    <span className="input-group-text">$</span>
                                    <input 
                                        value={amountLand} 
                                        onChange={(e) => setAmountLand(e.target.value)}
                                        type='number'
                                        step="0.01"
                                        className='form-control'
                                        required
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Description Field */}
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>Descripción</label>
                            <textarea
                                value={description} 
                                onChange={(e) => setDescription(e.target.value)}
                                className='form-control'
                                rows="3"
                            />
                        </div>

                        <div className="d-flex gap-2 pt-3 border-top">
                            <button type='submit' className='btn btn-success px-4 shadow-sm' disabled={isSaving}>
                                <i className="fas fa-save me-2"></i>{isSaving ? 'Guardando...' : 'Actualizar Cuota'}
                            </button>
                            <button type='button' className='btn btn-secondary px-4' onClick={() => navigate('/fees')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header bg-success text-white">
                            <h5 className="modal-title"><i className="fas fa-question-circle me-2"></i>Confirmar Actualización</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body text-center p-4">
                            <p className="mb-0">¿Está seguro de que desea actualizar los montos y la información de esta cuota?</p>
                        </div>
                        <div className="modal-footer bg-light justify-content-center">
                            <button type="button" className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-success px-4" onClick={handleUpdate} disabled={isSaving}>
                                {isSaving ? 'Procesando...' : 'Confirmar y Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}