import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/fees';

/**
 * CreateFees Component
 * Handles the creation of new administrative fees with categorized amounts.
 */
export default function CreateFees() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState('');
    const [amountOccupied, setAmountOccupied] = useState('');
    const [amountEmpty, setAmountEmpty] = useState('');
    const [amountLand, setAmountLand] = useState('');
    const [description, setDescription] = useState('');
    const [formValidated, setFormValidated] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // --- NAVIGATION ---
    const navigate = useNavigate();

    /**
     * Handles form submission to create a new fee
     */
    const store = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        // Frontend validation check
        if (form.checkValidity() === false) {
            e.stopPropagation();
            toastr.warning('Por favor, complete todos los campos obligatorios.', 'Atención');
        } else {
            setIsSaving(true);
            try {
                // Sending categorization specific amounts to backend
                await axios.post(endpoint, {
                    name: name.trim(),
                    amount_occupied: amountOccupied,
                    amount_empty: amountEmpty,
                    amount_land: amountLand,
                    description: description.trim()
                }, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                
                toastr.success('Cuota creada exitosamente.', 'Éxito');
                navigate('/fees');
            } catch (error) {
                const msg = error.response?.data?.message || 'Error al crear la cuota.';
                toastr.error(msg, 'Operación Fallida');
                console.error('Error creating fee:', error);
            } finally {
                setIsSaving(false);
            }
        }
        setFormValidated(true);
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4">
                        <i className="fas fa-plus-circle me-2"></i>Crear Nueva Cuota
                    </h2>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={store} noValidate className={formValidated ? 'was-validated' : ''}>
                        
                        {/* Name Field */}
                        <div className='mb-4'>
                            <label className='form-label fw-bold'>Nombre de la Cuota <span className="text-danger">*</span></label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                type='text'
                                className='form-control'
                                placeholder="ej. Mantenimiento General"
                                required
                            />
                            <div className="invalid-feedback">El nombre es obligatorio.</div>
                        </div>

                        {/* Categorized Amount Inputs Row */}
                        <div className="row g-3 mb-4">
                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Casa Habitada ($) <span className="text-danger">*</span></label>
                                <input
                                    value={amountOccupied}
                                    onChange={(e) => setAmountOccupied(e.target.value)}
                                    type='number'
                                    step="0.01"
                                    className='form-control'
                                    placeholder="0.00"
                                    required
                                />
                                <div className="invalid-feedback">Monto requerido.</div>
                            </div>

                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Casa Deshabitada ($) <span className="text-danger">*</span></label>
                                <input
                                    value={amountEmpty}
                                    onChange={(e) => setAmountEmpty(e.target.value)}
                                    type='number'
                                    step="0.01"
                                    className='form-control'
                                    placeholder="0.00"
                                    required
                                />
                                <div className="invalid-feedback">Monto requerido.</div>
                            </div>

                            <div className='col-md-4'>
                                <label className='form-label fw-bold'>Terreno ($) <span className="text-danger">*</span></label>
                                <input
                                    value={amountLand}
                                    onChange={(e) => setAmountLand(e.target.value)}
                                    type='number'
                                    step="0.01"
                                    className='form-control'
                                    placeholder="0.00"
                                    required
                                />
                                <div className="invalid-feedback">Monto requerido.</div>
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
                                placeholder="Detalles sobre lo que cubre esta cuota..."
                            />
                        </div>

                        <div className="d-flex gap-2 pt-3 border-top">
                            <button type='submit' className='btn btn-success px-4 shadow-sm' disabled={isSaving}>
                                <i className="fas fa-save me-2"></i>{isSaving ? 'Guardando...' : 'Guardar Cuota'}
                            </button>
                            <button type='button' className='btn btn-secondary px-4' onClick={() => navigate('/fees')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}