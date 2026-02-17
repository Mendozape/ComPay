import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const endpoint = '/api/streets/';

const axiosOptions = {
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    }
};

/**
 * EditStreet Component
 * Manages the data retrieval and update process for an existing street record.
 */
export default function EditStreet() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [errors, setErrors] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const { id } = useParams();
    const navigate = useNavigate();

    /**
     * Fetch street data by ID on mount
     */
    useEffect(() => {
        const getStreetById = async () => {
            try {
                setLoading(true);
                const response = await axios.get(`${endpoint}${id}`, axiosOptions);
                setName(response.data.name);
            } catch (error) {
                console.error('Error fetching street:', error);
                toastr.error('Fallo al cargar la calle.', 'Error');
            } finally {
                setLoading(false);
            }
        };
        getStreetById();
    }, [id]);

    /**
     * Handle final update submission
     */
    const handleUpdate = async () => {
        setIsSaving(true);
        try {
            const response = await axios.put(`${endpoint}${id}`, { name: name.trim() }, axiosOptions);
            
            if (response.status === 200) {
                toastr.success('Calle actualizada exitosamente.', 'Éxito');
                navigate('/streets');
            }
        } catch (error) {
            console.error('Error updating street:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                toastr.error('Error de validación al actualizar la calle.', 'Fallo');
            } else {
                const msg = error.response?.data?.message || 'Fallo al actualizar la calle.';
                toastr.error(msg, 'Operación Fallida');
            }
        } finally {
            setIsSaving(false);
            setShowModal(false);
        }
    };

    /**
     * Trigger modal confirmation for update
     */
    const update = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toastr.warning('El nombre de la calle es obligatorio.', 'Atención');
            setFormValidated(true);
            return;
        }
        setShowModal(true);
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando datos de la calle...</p>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        {/* Standardized Success Green Header */}
                        <div className="card-header bg-success text-white p-3">
                            <h2 className="mb-0 h4">
                                <i className="fas fa-road me-2"></i>Editar Calle
                            </h2>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={update} noValidate className={formValidated ? 'was-validated' : ''}>
                                <div className='mb-4'>
                                    <label className='form-label fw-bold'>Nombre de la Calle <span className="text-danger">*</span></label>
                                    <input 
                                        value={name} 
                                        onChange={(e) => setName(e.target.value)}
                                        type='text'
                                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                        placeholder="Ingrese el nombre de la calle"
                                        required
                                    />
                                    {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
                                </div>

                                <div className="d-flex gap-2 pt-3 border-top">
                                    <button type='submit' className='btn btn-success px-4 shadow-sm' disabled={isSaving}>
                                        <i className="fas fa-save me-2"></i>{isSaving ? 'Actualizando...' : 'Actualizar Calle'}
                                    </button>
                                    <button 
                                        type='button' 
                                        className='btn btn-secondary px-4' 
                                        onClick={() => navigate('/streets')}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
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
                            <p className="mb-0">¿Está seguro de que desea actualizar la información de esta calle?</p>
                        </div>
                        <div className="modal-footer bg-light justify-content-center">
                            <button type="button" className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-success px-4" onClick={handleUpdate} disabled={isSaving}>
                                {isSaving ? 'Guardando...' : 'Confirmar y Guardar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
}