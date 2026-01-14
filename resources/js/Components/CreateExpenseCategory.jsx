import React, { useState, useContext } from 'react';
import axios from 'axios';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/expense_categories';

export default function CreateExpenseCategory() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [errors, setErrors] = useState({});

    // --- CONTEXT AND NAVIGATION ---
    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Handle form submission to create a new expense category
     */
    const store = async (e) => {
        e.preventDefault();
        setErrors({}); // Clear previous validation errors
        
        const form = e.currentTarget;

        // Check if the form is valid according to HTML5 constraints
        if (form.checkValidity() === false) {
            e.stopPropagation();
            setErrorMessage('Por favor, complete todos los campos obligatorios.');
        } else {
            // Using standard JSON payload for name creation
            try {
                await axios.post(endpoint, { name: name.trim() }, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                
                // Success feedback in Spanish and redirect to list
                setSuccessMessage('Categoría de gasto creada exitosamente.');
                setErrorMessage('');
                navigate('/expense_categories');
            } catch (error) {
                console.error('Error creating category:', error.response || error);
                
                // Handle Laravel validation errors (422)
                if (error.response?.data?.errors) {
                    setErrors(error.response.data.errors);
                    setErrorMessage('Error de validación. Revise los campos.');
                } else {
                    setErrorMessage('Fallo al crear la categoría.');
                }
            }
        }
        setFormValidated(true);
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        {/* Standardized Success Green Header */}
                        <div className="card-header bg-success text-white p-3">
                            <h2 className="mb-0 h4">
                                <i className="fas fa-tags me-2"></i>Nueva Categoría de Gasto
                            </h2>
                        </div>
                        <div className="card-body p-4">
                            {/* Error Alert Display */}
                            {errorMessage && (
                                <div className="alert alert-danger text-center shadow-sm">
                                    {errorMessage}
                                </div>
                            )}

                            <form onSubmit={store} noValidate className={formValidated ? 'was-validated' : ''}>
                                
                                {/* Category Name Input */}
                                <div className='mb-4'>
                                    <label className='form-label fw-bold'>Nombre de la Categoría <span className="text-danger">*</span></label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        type='text'
                                        className={`form-control ${errors.name ? 'is-invalid' : ''}`}
                                        placeholder="Ej. Internet, etc."
                                        required
                                    />
                                    {errors.name ? (
                                        <div className="invalid-feedback">{errors.name[0]}</div>
                                    ) : (
                                        <div className="invalid-feedback">Por favor, ingrese un nombre para la categoría.</div>
                                    )}
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="d-flex gap-2 pt-3 border-top">
                                    <button type='submit' className='btn btn-success px-4 shadow-sm'>
                                        <i className="fas fa-save me-2"></i>Guardar Categoría
                                    </button>
                                    <button 
                                        type='button' 
                                        className='btn btn-secondary px-4' 
                                        onClick={() => navigate('/expense_categories')}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}