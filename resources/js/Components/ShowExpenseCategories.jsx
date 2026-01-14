import React, { useEffect, useState, useContext, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import usePermission from "../hooks/usePermission"; 

const endpoint = '/api/expense_categories';

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

const ShowExpenseCategories = ({ user }) => {
    // --- STATE VARIABLES ---
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredCategories, setFilteredCategories] = useState([]);
    
    // States for soft deletion modal
    const [showModal, setShowModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState(null); 
    const [modalError, setModalError] = useState(''); 
    
    // --- PERMISSIONS ---
    const { can } = usePermission(user);
    const canCreate = user ? can('Crear-catalogo-gastos') : false;
    const canEdit = user ? can('Editar-catalogo-gastos') : false;
    const canDelete = user ? can('Eliminar-catalogo-gastos') : false;

    const { setSuccessMessage, setErrorMessage, errorMessage, successMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Fetch all expense categories from the API
     */
    const fetchCategories = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoint, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });
            const data = response.data.data || response.data;
            const categoriesArray = Array.isArray(data) ? data : [];
            setCategories(categoriesArray);
            setFilteredCategories(categoriesArray);
        } catch (error) {
            console.error('Error fetching categories:', error);
            setErrorMessage('Fallo al cargar las categorías.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCategories();
    }, []);

    /**
     * Search filter logic
     */
    useEffect(() => {
        const result = categories.filter(category => 
            category.name.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredCategories(result);
    }, [search, categories]);

    /**
     * Delete/Deactivate category
     */
    const deleteCategory = async (id) => {
        setModalError('');
        try {
            const response = await axios.delete(`${endpoint}/${id}`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });
            
            if (response.status === 204 || response.status === 200) {
                setSuccessMessage('Categoría dada de baja exitosamente.');
                setShowModal(false);
                fetchCategories();
            } 
        } catch (error) {
            console.error('Deletion error:', error);
            const msg = error.response?.data?.message || 'Fallo al eliminar la categoría.';
            setModalError(msg);
        }
    };

    const editCategory = (id) => navigate(`/expense_categories/edit/${id}`);
    const createCategory = () => navigate('/expense_categories/create');
    
    const toggleModal = () => {
        setShowModal(!showModal);
        if (showModal) setModalError('');
    };
    
    const confirmDeletion = (id) => {
        setCategoryToDelete(id);
        setModalError(''); 
        setShowModal(true);
    };
    
    const handleDeletion = () => {
        if (categoryToDelete) {
            deleteCategory(categoryToDelete);
        }
    };

    /**
     * 🛡️ COLUMNS DEFINITION
     */
    const columns = useMemo(() => [
        { name: 'ID', selector: row => row.id, sortable: true, width: '80px' },
        { name: 'Nombre de la Categoría', selector: row => row.name, sortable: true, width: '300px' },
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
                            onClick={() => editCategory(row.id)} 
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
                                    Dar de baja
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
            No hay categorías registradas.
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
                        // 🟢 Color Success Green
                        <button className='btn btn-success btn-sm text-white' onClick={createCategory}>
                            <i className="fas fa-plus-circle me-1"></i> Crear Categoría
                        </button>
                    ) : <div />}

                    <input
                        type="text"
                        className="form-control form-control-sm w-25"
                        placeholder="Buscar por nombre..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {successMessage && <div className="alert alert-success text-center py-2">{successMessage}</div>}
                {errorMessage && !showModal && <div className="alert alert-danger text-center py-2">{errorMessage}</div>}

                <DataTable
                    title="Catálogo de Categorías de Gastos"
                    columns={columns}
                    data={filteredCategories}
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
                        <div className="modal-body text-center p-4">
                            <p className="mb-0">¿Está seguro de que desea dar de baja esta categoría?</p>
                            {modalError && <div className="alert alert-danger text-center mt-3 py-2">{modalError}</div>}
                        </div>
                        <div className="modal-footer bg-light">
                            <button type="button" className="btn btn-secondary" onClick={toggleModal}>
                                Cancelar
                            </button>
                            <button 
                                type="button" 
                                className="btn btn-danger" 
                                onClick={handleDeletion}
                            >
                                Confirmar Baja
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShowExpenseCategories;