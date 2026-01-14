import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';

const endpoint = '/api/expenses';
const categoriesEndpoint = '/api/expense_categories';

/**
 * Helper function to get today's date in YYYY-MM-DD format
 */
const getTodayDate = () => {
    return new Date().toISOString().split('T')[0];
};

export default function CreateExpense() {
    // --- STATE VARIABLES ---
    const [expenseCategoryId, setExpenseCategoryId] = useState('');
    const [amount, setAmount] = useState('');
    const [expenseDate, setExpenseDate] = useState(getTodayDate());
    const [formValidated, setFormValidated] = useState(false);
    const [categories, setCategories] = useState([]);
    const [loadingCategories, setLoadingCategories] = useState(true);

    // --- CONTEXT AND NAVIGATION ---
    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Fetch active expense categories on component mount
     */
    useEffect(() => {
        const fetchCategories = async () => {
            setErrorMessage(''); 
            try {
                const res = await axios.get(categoriesEndpoint, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });
                
                // Filter active categories from the response
                const data = res.data.data || res.data;
                const activeCategories = data.filter(cat => !cat.deleted_at);
                setCategories(activeCategories);
                setErrorMessage(''); 
                
            } catch (error) {
                console.error("Error fetching categories:", error.response || error);
                setErrorMessage("Fallo al cargar el catálogo de categorías.");
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, [setErrorMessage]);

    /**
     * Handle form submission to store a new expense
     */
    const store = async (e) => {
        e.preventDefault();
        const form = e.currentTarget;

        // Form validation check
        if (form.checkValidity() === false || !expenseCategoryId) { 
            e.stopPropagation();
            setErrorMessage('Por favor, complete todos los campos obligatorios correctamente.');
        } else {
            const payload = {
                expense_category_id: expenseCategoryId,
                amount: amount,
                expense_date: expenseDate
            };

            try {
                await axios.post(endpoint, payload, {
                    withCredentials: true,
                    headers: { Accept: 'application/json' },
                });

                setSuccessMessage('Gasto registrado exitosamente.');
                setErrorMessage('');
                navigate('/expenses');
            } catch (error) {
                console.error('Error creating expense:', error.response || error);
                const errorMsg = error.response?.data?.errors 
                    ? 'Error de validación. Revise los campos.' 
                    : 'Fallo al registrar el gasto.';
                setErrorMessage(errorMsg);
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
                                <i className="fas fa-money-bill-wave me-2"></i>Registrar Nuevo Gasto
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
                                <div className="row g-3">
                                    {/* 1. Category Selection */}
                                    <div className='col-md-12 mb-3'>
                                        <label className='form-label fw-bold'>Categoría del Gasto <span className="text-danger">*</span></label>
                                        <select
                                            value={expenseCategoryId}
                                            onChange={(e) => setExpenseCategoryId(e.target.value)}
                                            className='form-select'
                                            required
                                            disabled={loadingCategories}
                                        >
                                            <option value="">-- Seleccione una Categoría --</option>
                                            {categories.map(cat => (
                                                <option key={cat.id} value={cat.id}>
                                                    {cat.name}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="invalid-feedback">Por favor, seleccione una categoría.</div>
                                    </div>

                                    {/* 2. Amount Input */}
                                    <div className='col-md-6 mb-3'>
                                        <label className='form-label fw-bold'>Monto Total <span className="text-danger">*</span></label>
                                        <div className="input-group">
                                            <span className="input-group-text">$</span>
                                            <input
                                                value={amount}
                                                onChange={(e) => setAmount(e.target.value)}
                                                type='number'
                                                step='0.01'
                                                className='form-control'
                                                placeholder="0.00"
                                                required
                                            />
                                        </div>
                                        <div className="invalid-feedback">Ingrese un monto válido.</div>
                                    </div>

                                    {/* 3. Date Input */}
                                    <div className='col-md-6 mb-3'>
                                        <label className='form-label fw-bold'>Fecha del Gasto <span className="text-danger">*</span></label>
                                        <input
                                            value={expenseDate}
                                            onChange={(e) => setExpenseDate(e.target.value)}
                                            type='date'
                                            className='form-control'
                                            required
                                        />
                                        <div className="invalid-feedback">Seleccione la fecha del gasto.</div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="d-flex gap-2 mt-4 pt-3 border-top">
                                    <button type='submit' className='btn btn-success px-4 shadow-sm'>
                                        <i className="fas fa-save me-2"></i>Guardar Gasto
                                    </button>
                                    <button 
                                        type='button' 
                                        className="btn btn-secondary px-4" 
                                        onClick={() => navigate('/expenses')}
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