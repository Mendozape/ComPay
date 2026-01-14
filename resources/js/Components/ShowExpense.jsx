import React, { useEffect, useState, useContext, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import usePermission from "../hooks/usePermission"; 

const endpoint = '/api/expenses';

/**
 * 🎨 CUSTOM STYLES FOR DATA TABLE
 */
const customStyles = {
    headCells: {
        style: {
            fontWeight: 'bold',
            fontSize: '14px',
        },
    },
    cells: {
        style: {
            fontSize: '13px',
        },
    },
};

const ExpensesTable = ({ user }) => {
    // --- STATE VARIABLES ---
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredExpenses, setFilteredExpenses] = useState([]);
    
    // States for soft deletion modal
    const [showModal, setShowModal] = useState(false);
    const [expenseToDelete, setExpenseToDelete] = useState(null); 
    const [deletionReason, setDeletionReason] = useState(''); 
    const [modalError, setModalError] = useState(''); 

    // --- PERMISSIONS ---
    const { can } = usePermission(user);
    const canCreate = user ? can('Crear-gastos') : false;
    const canEdit = user ? can('Editar-gastos') : false;
    const canDelete = user ? can('Eliminar-gastos') : false;

    const { setSuccessMessage, setErrorMessage, successMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Fetch all expenses from the API
     */
    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoint, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });
            const data = response.data.data || response.data;
            const expensesArray = Array.isArray(data) ? data : [];
            setExpenses(expensesArray);
            setFilteredExpenses(expensesArray);
        } catch (error) {
            console.error('Error fetching expenses:', error);
            setErrorMessage('Fallo al cargar los gastos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    /**
     * Filter expenses based on search input
     */
    useEffect(() => {
        const lowerCaseSearch = search.toLowerCase();
        const result = expenses.filter(expense => 
            (expense.category?.name?.toLowerCase().includes(lowerCaseSearch)) ||
            (expense.amount?.toString().toLowerCase().includes(lowerCaseSearch))
        );
        setFilteredExpenses(result);
    }, [search, expenses]);

    /**
     * Logic to delete an expense with a reason
     */
    const deleteExpense = async (id, reason) => {
        setModalError('');
        try {
            const response = await axios.delete(`${endpoint}/${id}`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
                data: { reason: reason } 
            });

            if (response.status === 204 || response.status === 200) {
                setSuccessMessage('Gasto eliminado exitosamente.');
                setShowModal(false); 
                fetchExpenses(); 
            } 
        } catch (error) {
            console.error('Deletion error:', error);
            const msg = error.response?.data?.message || 'Fallo al eliminar el gasto.';
            setModalError(msg); 
        }
    };

    const editExpense = (id) => navigate(`/expenses/edit/${id}`);
    const createExpense = () => navigate('/expenses/create');
    
    const toggleModal = () => {
        setShowModal(!showModal);
        if (showModal) {
            setModalError('');
            setDeletionReason('');
        }
    };
    
    const confirmDeletion = (id) => {
        setExpenseToDelete(id);
        setDeletionReason('');
        setModalError(''); 
        setShowModal(true);
    };

    const handleDeletion = () => {
        if (!deletionReason.trim() || deletionReason.trim().length < 10) { 
            setModalError('Debe especificar un motivo de la eliminación (mínimo 10 caracteres).');
            return;
        }
        deleteExpense(expenseToDelete, deletionReason);
    };

    /**
     * 🛡️ COLUMNS DEFINITION
     */
    const columns = useMemo(() => [
        { name: 'Categoría', selector: row => row.category?.name || 'N/A', sortable: true, width: '200px' },
        { 
            name: 'Monto', 
            selector: row => row.amount, 
            sortable: true, 
            width: '120px',
            cell: row => `$${parseFloat(row.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}` 
        },
        { 
            name: 'Fecha', 
            selector: row => new Date(row.expense_date).toLocaleDateString('es-MX'), 
            sortable: true,
            width: '120px'
        },
        { 
            name: 'Estado',
            selector: row => row.deleted_at ? 'Inactivo' : 'Activo', 
            sortable: true,
            width: '120px',
            cell: row => (
                <span className={`badge ${row.deleted_at ? 'bg-danger' : 'bg-success'}`}> 
                    {row.deleted_at ? 'Inactivo' : 'Activo'}
                </span>
            ),
        },
        {
            name: 'Acciones',
            cell: row => (
                <div className="d-flex gap-2 justify-content-end w-100 pe-2">
                    {/* 🛡️ Edit - Standard Info Blue */}
                    {canEdit && (
                        <button 
                            className="btn btn-info btn-sm text-white" 
                            onClick={() => editExpense(row.id)} 
                            disabled={!!row.deleted_at}
                        >
                            Editar
                        </button>
                    )}
                    
                    {/* 🛡️ Delete - Standard Danger Red */}
                    {canDelete && (
                        <>
                            {row.deleted_at ? (
                                <button className="btn btn-secondary btn-sm" disabled>
                                    Eliminado
                                </button>
                            ) : (
                                <button 
                                    className="btn btn-danger btn-sm" 
                                    onClick={() => confirmDeletion(row.id)}
                                >
                                    Eliminar
                                </button>
                            )}
                        </>
                    )}
                </div>
            ),
            width: '200px',
        },
    ], [canEdit, canDelete, navigate]);

    const NoDataComponent = () => (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '1.1em', color: '#6c757d' }}>
            No hay gastos registrados.
        </div>
    );

    // Auto-clear success messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, setSuccessMessage]);

    return (
        <div className="container-fluid mt-4">
            <div className="mb-4 border border-primary rounded p-3 bg-white shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    {canCreate ? (
                        // 🟢 Standard Success Green
                        <button className='btn btn-success btn-sm text-white' onClick={createExpense}>
                            <i className="fas fa-plus-circle me-1"></i> Registrar Gasto
                        </button>
                    ) : <div />}
                    
                    <input
                        type="text"
                        className="form-control form-control-sm w-25"
                        placeholder="Buscar por categoría o monto..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {successMessage && <div className="alert alert-success text-center py-2">{successMessage}</div>}
                {errorMessage && !showModal && <div className="alert alert-danger text-center py-2">{errorMessage}</div>}

                <DataTable
                    title="Control de Gastos"
                    columns={columns}
                    data={filteredExpenses}
                    progressPending={loading}
                    noDataComponent={<NoDataComponent />}
                    pagination
                    highlightOnHover
                    striped
                    responsive
                    customStyles={customStyles}
                />
            </div>

            {/* MODAL DE CONFIRMACIÓN */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title"><i className="fas fa-exclamation-triangle me-2"></i>Confirmar Eliminación</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={toggleModal}></button>
                        </div>
                        <div className="modal-body p-4">
                            <p className="text-center mb-3">¿Está seguro de que desea eliminar este registro de gasto?</p>
                            <div className="form-group">
                                <label htmlFor="reason" className="fw-bold mb-2">Motivo de la Eliminación <span className="text-danger">*</span></label>
                                <textarea
                                    id="reason"
                                    className="form-control"
                                    rows="3"
                                    value={deletionReason}
                                    onChange={(e) => setDeletionReason(e.target.value)}
                                    placeholder="Ingrese la razón (mínimo 10 caracteres)..."
                                />
                            </div>
                            {modalError && <div className="alert alert-danger text-center mt-3 py-2">{modalError}</div>}
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="button" className="btn btn-secondary" onClick={toggleModal}>Cancelar</button>
                            <button 
                                type="button" 
                                className="btn btn-danger" 
                                onClick={handleDeletion}
                            >
                                Confirmar Eliminación
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpensesTable;