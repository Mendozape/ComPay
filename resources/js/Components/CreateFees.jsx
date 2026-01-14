import React, { useState, useContext } from 'react';
import axios from 'axios';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/fees';

export default function CreateFees() {
    const [name, setName] = useState('');
    // NEW: Separated states for occupied house, empty house, and land amounts
    const [amountOccupied, setAmountOccupied] = useState('');
    const [amountEmpty, setAmountEmpty] = useState('');
    const [amountLand, setAmountLand] = useState('');
    const [description, setDescription] = useState('');
    const [formValidated, setFormValidated] = useState(false);

    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Handles form submission to create a new fee
     */
    const store = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        if (form.checkValidity() === false) {
            e.stopPropagation();
            setErrorMessage('Por favor, complete todos los campos obligatorios.');
        } else {
            // UPDATED: Sending the 3 specific amount fields to the backend
            try {
                await axios.post(endpoint, {
                    name,
                    amount_occupied: amountOccupied,
                    amount_empty: amountEmpty,
                    amount_land: amountLand,
                    description
                }, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                
                setSuccessMessage('Cuota creada exitosamente.');
                setErrorMessage('');
                navigate('/fees');
            } catch (error) {
                const msg = error.response?.data?.message || 'Error al crear la cuota.';
                setErrorMessage(msg);
                console.error('Error creating fee:', error);
            }
        }
        setFormValidated(true);
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm">
                <div className="card-header bg-success text-white">
                    <h2 className="mb-0 h4">Crear Cuota</h2>
                </div>
                <div className="card-body">
                    <form onSubmit={store} noValidate className={formValidated ? 'was-validated' : ''}>
                        {errorMessage && <div className="alert alert-danger text-center">{errorMessage}</div>}

                        {/* Name Field */}
                        <div className='mb-3'>
                            <label className='form-label fw-bold'>Nombre de la Cuota</label>
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                type='text'
                                className='form-control'
                                placeholder="ej. Mantenimiento"
                                required
                            />
                            <div className="invalid-feedback">El nombre es obligatorio.</div>
                        </div>

                        {/* 3 Amount Inputs Row */}
                        <div className="row">
                            <div className='col-md-4 mb-3'>
                                <label className='form-label fw-bold'>Casa Habitada ($)</label>
                                <input
                                    value={amountOccupied}
                                    onChange={(e) => setAmountOccupied(e.target.value)}
                                    type='number'
                                    step="0.01"
                                    className='form-control'
                                    placeholder="0.00"
                                    required
                                />
                                <div className="invalid-feedback">Ingrese el monto para casa habitada.</div>
                            </div>

                            <div className='col-md-4 mb-3'>
                                <label className='form-label fw-bold'>Casa Deshabitada ($)</label>
                                <input
                                    value={amountEmpty}
                                    onChange={(e) => setAmountEmpty(e.target.value)}
                                    type='number'
                                    step="0.01"
                                    className='form-control'
                                    placeholder="0.00"
                                    required
                                />
                                <div className="invalid-feedback">Ingrese el monto para casa deshabitada.</div>
                            </div>

                            <div className='col-md-4 mb-3'>
                                <label className='form-label fw-bold'>Terreno ($)</label>
                                <input
                                    value={amountLand}
                                    onChange={(e) => setAmountLand(e.target.value)}
                                    type='number'
                                    step="0.01"
                                    className='form-control'
                                    placeholder="0.00"
                                    required
                                />
                                <div className="invalid-feedback">Ingrese el monto para terreno.</div>
                            </div>
                        </div>

                        {/* Description Field */}
                        <div className='mb-3'>
                            <label className='form-label fw-bold'>Descripción</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className='form-control'
                                rows="3"
                                placeholder="Detalles sobre lo que cubre esta cuota..."
                            />
                        </div>

                        <div className="d-flex gap-2">
                            <button type='submit' className='btn btn-success px-4'>Guardar Cuota</button>
                            <button type='button' className='btn btn-secondary' onClick={() => navigate('/fees')}>Cancelar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}