import axios from 'axios';
import React, { useState, useEffect, useContext } from 'react';
import { MessageContext } from './MessageContext';
import { useNavigate, useParams } from 'react-router-dom';

const endpoint = '/api/streets/';

const axiosOptions = {
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    }
};

export default function EditStreet() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [errors, setErrors] = useState({});
    const [showModal, setShowModal] = useState(false);

    const { id } = useParams();
    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Fetch street data by ID
     */
    useEffect(() => {
        const getStreetById = async () => {
            try {
                const response = await axios.get(`${endpoint}${id}`, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                setName(response.data.name);
            } catch (error) {
                console.error('Error fetching street:', error);
                setErrorMessage('Fallo al cargar la calle.');
            }
        };
        getStreetById();
    }, [id, setErrorMessage]);

    /**
     * Handle final update
     */
    const handleUpdate = async () => {
        try {
            // Usamos PUT directamente para consistencia si no hay archivos
            const response = await axios.put(`${endpoint}${id}`, { name: name.trim() }, axiosOptions);
            
            if (response.status === 200) {
                setSuccessMessage('Calle actualizada exitosamente.');
                setErrorMessage('');
                navigate('/streets');
            }
        } catch (error) {
            console.error('Error updating street:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                setErrorMessage('Error de validación al actualizar la calle.');
            } else {
                setErrorMessage(error.response?.data?.message || 'Fallo al actualizar la calle.');
            }
        } finally {
            setShowModal(false);
        }
    };

    /**
     * Trigger modal confirmation
     */
    const update = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setErrorMessage('El nombre de la calle es obligatorio.');
            setFormValidated(true);
            return;
        }
        setShowModal(true);
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        {/* Header color BG-SUCCESS estandarizado */}
                        <div className="card-header bg-success text-white p-3">
                            <h2 className="mb-0 h4">
                                <i className="fas fa-road me-2"></i>Editar Calle
                            </h2>
                        </div>
                        <div className="card-body p-4">
                            {errorMessage && (
                                <div className="alert alert-danger text-center shadow-sm">
                                    {errorMessage}
                                </div>
                            )}

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
                                    <button type='submit' className='btn btn-success px-4 shadow-sm'>
                                        <i className="fas fa-save me-2"></i>Actualizar Calle
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

            {/* MODAL DE CONFIRMACIÓN */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header bg-success text-white">
                            <h5 className="modal-title"><i className="fas fa-question-circle me-2"></i>Confirmar Actualización</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body text-center p-4">
                            <p className="mb-0">¿Está seguro de que desea actualizar la información de esta calle?</p>
                        </div>
                        <div className="modal-footer bg-light text-center">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-success" onClick={handleUpdate}>Confirmar y Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
}