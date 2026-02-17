import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/expense_categories';

/**
 * CreateExpenseCategory Component
 * Handles the creation of new expense categories with toastr notifications.
 */
export default function CreateExpenseCategory() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // --- NAVIGATION ---
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
            toastr.warning('Por favor, complete todos los campos obligatorios.', 'Atención');
        } else {
            setIsSaving(true);
            try {
                await axios.post(endpoint, { name: name.trim() }, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                
                toastr.success('Categoría de gasto creada exitosamente.', 'Éxito');
                navigate('/expense_categories');
            } catch (error) {
                // Handle Laravel validation errors (422)
                if (error.response?.data?.errors) {
                    setErrors(error.response.data.errors);
                    toastr.error('Error de validación. Revise los campos.', 'Fallo');
                } else {
                    const msg = error.response?.data?.message || 'Fallo al crear la categoría.';
                    toastr.error(msg, 'Operación Fallida');
                }
            } finally {
                setIsSaving(false);
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
                                    <button type='submit' className='btn btn-success px-4 shadow-sm' disabled={isSaving}>
                                        <i className="fas fa-save me-2"></i>{isSaving ? 'Guardando...' : 'Guardar Categoría'}
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