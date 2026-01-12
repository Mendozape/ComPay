import React, { useEffect, useState, useContext, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// 🚨 Import the hook
import usePermission from "../hooks/usePermission"; 

const endpoint = '/api/streets';

/**
 * 🎨 CUSTOM STYLES FOR DATA TABLE
 * Used to avoid console warnings regarding unknown props.
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

// 🚨 Receive 'user' as a prop from App.jsx
const StreetTable = ({ user }) => {
    // State variables
    const [streets, setStreets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredStreets, setFilteredStreets] = useState([]);
    
    // States for soft deletion modal
    const [showModal, setShowModal] = useState(false);
    const [streetToDeactivate, setStreetToDeactivate] = useState(null); 

    // 🚨 Initialize the permission hook
    const { can } = usePermission(user);

    // 🛡️ Extraction to constants for stable permission evaluation
    const canCreate = user ? can('Crear-calles') : false;
    const canEdit = user ? can('Editar-calles') : false;
    const canDeactivate = user ? can('Eliminar-calles') : false;

    // Context hook for global messages
    const { setSuccessMessage, setErrorMessage, successMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Fetch all streets from the API
     */
    const fetchStreets = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoint, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });
            const data = response.data.data || response.data;
            setStreets(data);
            setFilteredStreets(data);
        } catch (error) {
            console.error('Error fetching streets:', error);
            setErrorMessage('Fallo al cargar las calles.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStreets();
    }, []);

    /**
     * Filter streets based on search input
     */
    useEffect(() => {
        const result = streets.filter(street => 
            street.name.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredStreets(result);
    }, [search, streets]);

    /**
     * Logic to soft-delete/deactivate a street
     */
    const deactivateStreet = async (id) => {
        try {
            const response = await axios.delete(`${endpoint}/${id}`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });
            
            if (response.status === 200) {
                setSuccessMessage('Calle dada de baja exitosamente.');
                setShowModal(false); 
                fetchStreets();
            } 
        } catch (error) {
            const msg = error.response?.data?.message || 'Fallo al dar de baja la calle.';
            setErrorMessage(msg);
        }
    };

    const editStreet = (id) => navigate(`/streets/edit/${id}`);
    const createStreet = () => navigate('/streets/create');
    const toggleModal = () => {
        setShowModal(!showModal);
        if (showModal) setErrorMessage(null); // Clear modal errors on close
    };
    
    const confirmDeactivation = (id) => {
        setStreetToDeactivate(id);
        setShowModal(true);
    };
    
    const handleDeactivation = () => {
        deactivateStreet(streetToDeactivate);
    }

    /**
     * 🛡️ COLUMNS DEFINITION
     * FIX: Removed 'minWidth' to prevent DOM warnings.
     * Fixed 'width' and flex alignment used instead.
     */
    const columns = useMemo(() => [
        { name: 'Nombre', selector: row => row.name, sortable: true, width: '250px' },
        { 
            name: 'Estado', 
            selector: row => row.deleted_at ? 'Inactivo' : 'Activo', 
            sortable: true,
            width: '120px',
            cell: row => (
                <span className={`badge ${row.deleted_at ? 'bg-danger' : 'bg-info'}`}> 
                    {row.deleted_at ? 'Inactivo' : 'Activo'}
                </span>
            ),
        },
        {
            name: 'Acciones',
            cell: row => (
                <div className="d-flex gap-2 justify-content-end w-100 pe-2">
                    {/* 🛡️ Permission check for Edit button */}
                    {canEdit && (
                        <button 
                            className="btn btn-info btn-sm text-white" 
                            onClick={() => editStreet(row.id)} 
                            disabled={!!row.deleted_at}
                        >
                            Editar
                        </button>
                    )}
                    
                    {/* 🛡️ Permission check for Deactivate button */}
                    {canDeactivate && (
                        <>
                            {row.deleted_at ? (
                                <button className="btn btn-secondary btn-sm" disabled>Dada de Baja</button>
                            ) : (
                                <button className="btn btn-danger btn-sm" onClick={() => confirmDeactivation(row.id)}>Dar de Baja</button>
                            )}
                        </>
                    )}
                </div>
            ),
            width: '220px',
        },
    ], [canEdit, canDeactivate, navigate]);
    
    const NoDataComponent = () => (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '1.1em', color: '#6c757d' }}>
            No hay registros para mostrar.
        </div>
    );

    // Effects to clear messages
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, setSuccessMessage]);

    useEffect(() => {
        if (errorMessage && !showModal) {
            const timer = setTimeout(() => setErrorMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage, setErrorMessage, showModal]);

    return (
        <div className="mb-4 border border-primary rounded p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-3">
                {/* 🛡️ Permission check for Create button */}
                {canCreate ? (
                    <button className='btn btn-success btn-sm text-white' onClick={createStreet}>Crear Calle</button>
                ) : (
                    <div /> // Spacer
                )}
                
                <input
                    type="text"
                    className="form-control form-control-sm w-25"
                    placeholder="Buscar por nombre"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {successMessage && <div className="alert alert-success text-center py-2">{successMessage}</div>}
            {errorMessage && !showModal && <div className="alert alert-danger text-center py-2">{errorMessage}</div>}

            <DataTable
                title="Lista de Calles" 
                columns={columns}
                data={filteredStreets}
                progressPending={loading}
                noDataComponent={<NoDataComponent />}
                pagination
                highlightOnHover
                striped
                customStyles={customStyles}
            />

            {/* Modal for Deactivation Confirmation */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title">Confirmar Baja de Calle</h5> 
                            <button type="button" className="btn-close btn-close-white" onClick={toggleModal}></button>
                        </div>
                        <div className="modal-body text-center p-4">
                            <p>¿Está seguro de que desea dar de baja esta calle? No podrá ser asignada a nuevas direcciones.</p>
                            {errorMessage && <div className="alert alert-danger text-center mt-2">{errorMessage}</div>}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={toggleModal}>Cancelar</button> 
                            <button type="button" className="btn btn-danger" onClick={handleDeactivation}>Dar de Baja</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StreetTable;