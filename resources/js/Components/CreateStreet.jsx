import axios from 'axios';
import React, { useState, useContext } from 'react';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/streets';

export default function CreateStreet() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [formValidated, setFormValidated] = useState(false);

    // --- CONTEXT AND NAVIGATION ---
    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Handle form submission to create a new street record
     */
    const store = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        // Basic HTML5 validation check
        if (form.checkValidity() === false) {
            e.stopPropagation();
            setErrorMessage('Por favor, complete todos los campos obligatorios.');
        } else {
            // Using standard JSON payload for simple text data
            try {
                await axios.post(endpoint, { name: name.trim() }, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });

                // Success feedback and redirecting to the catalog
                setSuccessMessage('Calle creada exitosamente.');
                setErrorMessage('');
                navigate('/streets');
            } catch (error) {
                console.error('Error creating street:', error);
                const msg = error.response?.data?.message || 'Fallo al crear la calle.';
                setErrorMessage(msg);
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
                                <i className="fas fa-road me-2"></i>Nueva Calle
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
                                
                                {/* Street Name Input */}
                                <div className='mb-4'>
                                    <label className='form-label fw-bold'>Nombre de la Calle <span className="text-danger">*</span></label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        type='text'
                                        className='form-control'
                                        placeholder="Ej. Av. De los Pinos"
                                        required
                                    />
                                    <div className="invalid-feedback">
                                        Por favor, ingrese un nombre para la calle.
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="d-flex gap-2 pt-3 border-top">
                                    <button type='submit' className='btn btn-success px-4 shadow-sm'>
                                        <i className="fas fa-save me-2"></i>Guardar Calle
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
        </div>
    );
}