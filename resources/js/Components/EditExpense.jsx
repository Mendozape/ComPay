import axios from 'axios';
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const endpoint = '/api/expenses/';
const categoriesEndpoint = '/api/expense_categories';

const axiosOptions = {
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    }
};

/**
 * Format database timestamp to YYYY-MM-DD for date input
 */
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
    const [loading, setLoading] = useState(true);
    const [loadingCategories, setLoadingCategories] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [formValidated, setFormValidated] = useState(false);
    const [showModal, setShowModal] = useState(false);

    const { id } = useParams();
    const navigate = useNavigate();

    /**
     * Fetch Categories Catalog on component mount
     */
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await axios.get(categoriesEndpoint, axiosOptions);
                const activeCategories = res.data.data.filter(cat => !cat.deleted_at);
                setCategories(activeCategories);
            } catch (error) {
                toastr.error("Fallo al cargar el catálogo de categorías.", "Error");
            } finally {
                setLoadingCategories(false);
            }
        };
        fetchCategories();
    }, []); 

    /**
     * Fetch specific expense data by ID
     */
    useEffect(() => {
        const getExpenseById = async () => {
            try {
                const response = await axios.get(`${endpoint}${id}`, axiosOptions);
                const data = response.data.data;
                setAmount(data.amount);
                setExpenseDate(formatDate(data.expense_date)); 
                setExpenseCategoryId(data.expense_category_id?.toString() || ''); 
            } catch (error) {
                toastr.error('Fallo al cargar los datos del gasto.', 'Error'); 
            } finally {
                setLoading(false);
            }
        };
        getExpenseById();
    }, [id]);

    /**
     * Final update submission handler
     */
    const handleUpdate = async () => {
        setIsSaving(true);
        const payload = {
            expense_category_id: expenseCategoryId,
            amount: amount,
            expense_date: expenseDate,
        };

        try {
            await axios.put(`${endpoint}${id}`, payload, axiosOptions);
            toastr.success('Gasto actualizado exitosamente.', 'Éxito');
            navigate('/expenses');
        } catch (error) {
            const msg = error.response?.data?.message || 'Fallo al actualizar el gasto.';
            toastr.error(msg, 'Operación Fallida');
        } finally {
            setIsSaving(false);
            setShowModal(false);
        }
    };

    /**
     * Trigger confirmation modal
     */
    const update = (e) => {
        e.preventDefault(); 
        if (!amount || !expenseCategoryId || !expenseDate) {
            toastr.warning('Por favor, complete todos los campos obligatorios.', 'Atención');
            setFormValidated(true);
            return;
        }
        setShowModal(true);
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando datos del gasto...</p>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4"><i className="fas fa-edit me-2"></i>Editar Gasto</h2>
                </div>
                <div className="card-body p-4">
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
                                        className="form-control"
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            {/* 3. Expense Date Field */}
                            <div className='col-md-6 mb-3'>
                                <label className='form-label fw-bold'>Fecha del Gasto <span className="text-danger">*</span></label>
                                <input
                                    value={expenseDate} 
                                    onChange={(e) => setExpenseDate(e.target.value)}
                                    type='date'
                                    className="form-control"
                                    required
                                />
                            </div>
                        </div>

                        <div className="d-flex gap-2 mt-4 pt-3 border-top">
                            <button type='submit' className='btn btn-success px-4 shadow-sm' disabled={isSaving}>
                                <i className="fas fa-save me-2"></i>{isSaving ? 'Actualizando...' : 'Actualizar Gasto'}
                            </button>
                            <button type='button' className='btn btn-secondary px-4' onClick={() => navigate('/expenses')}>
                                Cancelar
                            </button>
                        </div>
                    </form>
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
                            <p className="mb-0">¿Está seguro de que desea actualizar la información de este registro de gasto?</p>
                        </div>
                        <div className="modal-footer bg-light justify-content-center">
                            <button type="button" className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button type="button" className="btn btn-success px-4" onClick={handleUpdate} disabled={isSaving}>
                                {isSaving ? 'Procesando...' : 'Confirmar y Actualizar'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}