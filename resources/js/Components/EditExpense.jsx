import axios from 'axios';
import React, { useState, useEffect, useContext } from 'react';
import { MessageContext } from './MessageContext';
import { useNavigate, useParams } from 'react-router-dom';

const endpoint = '/api/expenses/';
const categoriesEndpoint = '/api/expense_categories';

const axiosOptions = {
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    }
};

const formatDate = (dbDateString) => {
    if (!dbDateString) return '';
    return dbDateString.split(' ')[0];
};

export default function EditExpense() {
    // --- STATE VARIABLES ---
    const [amount, setAmount] = useState('');
    const [expenseDate, setExpenseDate] = useState('');
    const [expenseCategoryId, setExpenseCategoryId] = useState(''); 
    const [categories, setCategories] = useState([]); 
    const [loadingCategories, setLoadingCategories] = useState(true);

    const [formValidated, setFormValidated] = useState(false);
    const [errors, setErrors] = useState({});
    const [showModal, setShowModal] = useState(false);

    const { id } = useParams();
    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    // Effect: Fetch Categories Catalog
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(categoriesEndpoint, axiosOptions);
                const activeCategories = res.data.data.filter(cat => !cat.deleted_at);
                setCategories(activeCategories);
            } catch (error) {
                console.error("Error fetching categories:", error);
                setErrorMessage("Fallo al cargar el catálogo de categorías.");
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []); 

    // Effect: Fetch specific expense data
    useEffect(() => {
        const getExpenseById = async () => {
            try {
                const response = await axios.get(`${endpoint}${id}`, axiosOptions);
                const data = response.data.data;
                setAmount(data.amount);
                setExpenseDate(formatDate(data.expense_date)); 
                setExpenseCategoryId(data.expense_category_id?.toString() || ''); 
            } catch (error) {
                console.error('Error fetching expense:', error);
                setErrorMessage('Fallo al cargar el gasto.'); 
            }
        };
        getExpenseById();
    }, [id, setErrorMessage]);


    const handleUpdate = async () => {
        const payload = {
            expense_category_id: expenseCategoryId,
            amount: amount,
            expense_date: expenseDate,
        };

        try {
            // Using standard PUT for update
            const response = await axios.put(`${endpoint}${id}`, payload, axiosOptions);
            if (response.status === 200) {
                setSuccessMessage('Gasto actualizado exitosamente.');
                navigate('/expenses');
            }
        } catch (error) {
            console.error('Error updating expense:', error);
            if (error.response?.data?.errors) {
                setErrors(error.response.data.errors);
            } else {
                setErrorMessage(error.response?.data?.message || 'Fallo al actualizar el gasto.');
            }
        } finally {
            setShowModal(false);
        }
    };

    const update = (e) => {
        e.preventDefault(); 
        if (!amount || !expenseCategoryId || !expenseDate) {
            setErrorMessage('Por favor, complete todos los campos obligatorios.');
            setFormValidated(true);
            return;
        }
        setShowModal(true);
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm">
                <div className="card-header bg-success text-white">
                    <h2 className="mb-0 h4"><i className="fas fa-edit me-2"></i>Editar Gasto</h2>
                </div>
                <div className="card-body p-4">
                    {errorMessage && <div className="alert alert-danger text-center">{errorMessage}</div>}
                    
                    <form onSubmit={update} noValidate className={formValidated ? 'was-validated' : ''}>
                        
                        <div className="row g-3">
                            {/* 1. Category Select */}
                            <div className='col-md-12 mb-3'>
                                <label className='form-label fw-bold'>Categoría <span className="text-danger">*</span></label>
                                <select
                                    value={expenseCategoryId}
                                    onChange={(e) => setExpenseCategoryId(e.target.value)}
                                    className={`form-select ${formValidated && !expenseCategoryId ? 'is-invalid' : ''}`}
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
                            </div>

                            {/* 2. Amount Field */}
                            <div className='col-md-6 mb-3'>
                                <label className='form-label fw-bold'>Monto <span className="text-danger">*</span></label>
                                <div className="input-group">
                                    <span className="input-group-text">$</span>
                                    <input 
                                        value={amount} 
                                        onChange={(e) => setAmount(e.target.value)}
                                        type='number'
                                        step='0.01'
                                        min='0.01'
                                        className={`form-control ${errors.amount ? 'is-invalid' : ''}`}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                                {errors.amount && <div className="text-danger small">{errors.amount[0]}</div>}
                            </div>

                            {/* 3. Expense Date Field */}
                            <div className='col-md-6 mb-3'>
                                <label className='form-label fw-bold'>Fecha del Gasto <span className="text-danger">*</span></label>
                                <input
                                    value={expenseDate} 
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    type='date'
                                    className={`form-control ${errors.expense_date ? 'is-invalid' : ''}`}
                                    required
                                />
                                {errors.expense_date && <div className="text-danger small">{errors.expense_date[0]}</div>}
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-4 pt-3 border-top">
                            <button type='submit' className='btn btn-success px-4'>
                                <i className="fas fa-save me-2"></i>Actualizar Gasto
                            </button>
                            <button type='button' className='btn btn-secondary px-4' onClick={() => navigate('/expenses')}>
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
                            <p className="mb-0">¿Está seguro de que desea actualizar la información de este registro de gasto?</p>
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-success" onClick={handleUpdate}>Confirmar y Actualizar</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}