import React, { useEffect, useState, useMemo } from 'react';
import DataTable from 'react-data-table-component';
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

/**
 * ExpensesTable Component
 * Manages the list of expenses with permission handling and soft deletion logic.
 */
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
    const [isDeleting, setIsDeleting] = useState(false);

    // --- PERMISSIONS ---
    const { can } = usePermission(user);
    const canCreate = user ? can('Crear-gastos') : false;
    const canEdit = user ? can('Editar-gastos') : false;
    const canDelete = user ? can('Eliminar-gastos') : false;

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
            toastr.error('Fallo al cargar el listado de gastos.', 'Fallo');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    /**
     * Client-side filter logic
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
    const handleDeletion = async () => {
        if (!deletionReason.trim() || deletionReason.trim().length < 10) { 
            toastr.warning('Debe especificar un motivo de la eliminación (mínimo 10 caracteres).', 'Atención');
            return;
        }

        setIsDeleting(true);
        try {
            await axios.delete(`${endpoint}/${expenseToDelete}`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
                data: { reason: deletionReason } 
            });

            toastr.success('Gasto eliminado exitosamente.', 'Éxito');
            setShowModal(false); 
            fetchExpenses(); 
        } catch (error) {
            const msg = error.response?.data?.message || 'Fallo al eliminar el gasto.';
            toastr.error(msg, 'Operación Fallida'); 
        } finally {
            setIsDeleting(false);
        }
    };

    const editExpense = (id) => navigate(`/expenses/edit/${id}`);
    const createExpense = () => navigate('/expenses/create');
    
    const toggleModal = () => {
        setShowModal(!showModal);
        if (showModal) {
            setDeletionReason('');
        }
    };
    
    const confirmDeletion = (id) => {
        setExpenseToDelete(id);
        setDeletionReason('');
        setShowModal(true);
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
                    {canEdit && (
                        <button 
                            className="btn btn-info btn-sm text-white" 
                            onClick={() => editExpense(row.id)} 
                            disabled={!!row.deleted_at}
                        >
                            Editar
                        </button>
                    )}
                    
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

    return (
        <div className="container-fluid mt-4">
            <div className="mb-4 border border-primary rounded p-3 bg-white shadow-sm">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    {canCreate ? (
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

            {/* CONFIRMATION MODAL */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
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
                        </div>
                        <div className="modal-footer bg-light justify-content-center">
                            <button type="button" className="btn btn-secondary px-4" onClick={toggleModal}>Cancelar</button>
                            <button 
                                type="button" 
                                className="btn btn-danger px-4" 
                                onClick={handleDeletion}
                                disabled={isDeleting}
                            >
                                {isDeleting ? 'Eliminando...' : 'Confirmar Eliminación'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExpensesTable;