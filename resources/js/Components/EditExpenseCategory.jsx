import axios from 'axios';
import React, { useState, useEffect, useContext } from 'react';
import { MessageContext } from './MessageContext';
import { useNavigate, useParams } from 'react-router-dom';

const endpoint = '/api/expense_categories/';

const axiosOptions = {
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    }
};

export default function EditExpenseCategory() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [errors, setErrors] = useState({});
    const [showModal, setShowModal] = useState(false);

    const { id } = useParams();
    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Effect to fetch the current category data on component load
     */
    useEffect(() => {
        const getCategoryById = async () => {
            try {
                const response = await axios.get(`${endpoint}${id}`, axiosOptions);
                setName(response.data.data.name);
            } catch (error) {
                console.error('Error fetching category:', error);
                setErrorMessage('Fallo al cargar la categoría.');
            }
        };
        getCategoryById();
    }, [id, setErrorMessage]);

    /**
     * Handler for final update confirmation
     */
    const handleUpdate = async () => {
        try {
            // Usamos PUT directamente para actualización
            const response = await axios.put(`${endpoint}${id}`, { name }, axiosOptions);
            
            if (response.status === 200) {
                setSuccessMessage('Categoría de gasto actualizada exitosamente.');
                setErrorMessage('');
                navigate('/expense_categories');
            }
        } catch (error) {
            console.error('Error updating category:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
                setErrorMessage('Error de validación. Revise los campos.');
            } else {
                setErrorMessage(error.response?.data?.message || 'Fallo al actualizar la categoría.');
            }
        } finally {
            setShowModal(false);
        }
    };

    /**
     * Handler to show the confirmation modal
     */
    const update = (e) => {
        e.preventDefault();
        if (!name.trim()) {
            setErrorMessage('El nombre de la categoría es obligatorio.');
            setFormValidated(true);
            return;
        }
        setErrors({}); 
        setShowModal(true);
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm">
                {/* Header color BG-SUCCESS para estandarizar */}
                <div className="card-header bg-success text-white">
                    <h2 className="mb-0 h4"><i className="fas fa-edit me-2"></i>Editar Categoría de Gasto</h2>
                </div>
                <div className="card-body p-4">
                    {errorMessage && (
                        <div className="alert alert-danger text-center shadow-sm">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={update} noValidate className={formValidated ? 'was-validated' : ''}>
                        
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>Nombre de la Categoría <span className="text-danger">*</span></label>
                            <input 
                                value={name} 
                                onChange={(e) => setName(e.target.value)}
                                type='text'
                                className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                placeholder="Ej. Mantenimiento, Servicios, etc."
                                required
                            />
                            {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
                        </div>

                        <div className="d-flex gap-2 pt-3 border-top">
                            <button type='submit' className='btn btn-success px-4'>
                                <i className="fas fa-save me-2"></i>Actualizar Categoría
                            </button>
                            <button type='button' className='btn btn-secondary px-4' onClick={() => navigate('/expense_categories')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header bg-success text-white">
                            <h5 className="modal-title"><i className="fas fa-question-circle me-2"></i>Confirmar Actualización</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body text-center p-4">
                            <p className="mb-0">¿Está seguro de que desea actualizar el nombre de esta categoría?</p>
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-success" onClick={handleUpdate}>Confirmar y Guardar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}