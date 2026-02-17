import React, { useEffect, useState, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import usePermission from "../hooks/usePermission"; 

const endpoint = '/api/streets';

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
 * StreetTable Component
 * Displays street catalog with permissions-based actions and toastr alerts.
 */
const StreetTable = ({ user }) => {
    // --- STATE VARIABLES ---
    const [streets, setStreets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredStreets, setFilteredStreets] = useState([]);
    
    // States for soft deletion modal
    const [showModal, setShowModal] = useState(false);
    const [streetToDeactivate, setStreetToDeactivate] = useState(null); 
    const [isProcessing, setIsProcessing] = useState(false);

    // --- PERMISSIONS ---
    const { can } = usePermission(user);
    const canCreate = user ? can('Crear-calles') : false;
    const canEdit = user ? can('Editar-calles') : false;
    const canDeactivate = user ? can('Eliminar-calles') : false;

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
            const streetsArray = Array.isArray(data) ? data : [];
            setStreets(streetsArray);
            setFilteredStreets(streetsArray);
        } catch (error) {
            console.error('Error fetching streets:', error);
            toastr.error('Fallo al cargar el catálogo de calles.', 'Error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStreets();
    }, []);

    /**
     * Filter logic for search bar
     */
    useEffect(() => {
        const result = streets.filter(street => 
            street.name.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredStreets(result);
    }, [search, streets]);

    /**
     * Logic to soft-delete/deactivate a street record
     */
    const handleDeactivation = async () => {
        if (!streetToDeactivate) return;
        setIsProcessing(true);
        try {
            const response = await axios.delete(`${endpoint}/${streetToDeactivate}`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });
            
            if (response.status === 200) {
                toastr.success('Calle dada de baja exitosamente.', 'Éxito');
                setShowModal(false); 
                fetchStreets();
            } 
        } catch (error) {
            console.error('Deactivation error:', error);
            const msg = error.response?.data?.message || 'Fallo al dar de baja la calle.';
            toastr.error(msg, 'Operación Fallida');
        } finally {
            setIsProcessing(false);
        }
    };

    const editStreet = (id) => navigate(`/streets/edit/${id}`);
    const createStreet = () => navigate('/streets/create');
    
    const confirmDeactivation = (id) => {
        setStreetToDeactivate(id);
        setShowModal(true);
    };

    /**
     * 🛡️ COLUMNS DEFINITION
     */
    const columns = useMemo(() => [
        { 
            name: 'Nombre de la Calle', 
            selector: row => row.name, 
            sortable: true, 
            width: '300px' 
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
                            onClick={() => editStreet(row.id)} 
                            disabled={!!row.deleted_at}
                        >
                            Editar
                        </button>
                    )}
                    
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
            No hay calles registradas para mostrar.
        </div>
    );

    return (
        <div className="mb-4 border border-primary rounded p-3 bg-white shadow-sm">
            <div className="d-flex justify-content-between align-items-center mb-3">
                {canCreate ? (
                    <button className='btn btn-success btn-sm text-white' onClick={createStreet}>
                        <i className="fas fa-plus-circle me-1"></i> Crear Calle
                    </button>
                ) : (
                    <div /> 
                )}
                
                <input
                    type="text"
                    className="form-control form-control-sm w-25"
                    placeholder="Buscar por nombre..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            <DataTable
                title="Catálogo de Calles" 
                columns={columns}
                data={filteredStreets}
                progressPending={loading}
                noDataComponent={<NoDataComponent />}
                pagination
                highlightOnHover
                striped
                responsive
                customStyles={customStyles}
            />

            {/* CONFIRMATION MODAL */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog">
                <div className="modal-dialog modal-dialog-centered" role="document">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title"><i className="fas fa-exclamation-triangle me-2"></i>Confirmar Baja</h5> 
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body text-center p-4">
                            <p className="mb-0">¿Está seguro de que desea dar de baja esta calle? No podrá ser asignada a nuevos predios.</p>
                        </div>
                        <div className="modal-footer bg-light justify-content-center">
                            <button type="button" className="btn btn-secondary px-4" onClick={() => setShowModal(false)}>Cancelar</button> 
                            <button 
                                type="button" 
                                className="btn btn-danger px-4" 
                                onClick={handleDeactivation}
                                disabled={isProcessing}
                            >
                                {isProcessing ? 'Procesando...' : 'Confirmar Baja'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {showModal && <div className="modal-backdrop fade show"></div>}
        </div>
    );
};

export default StreetTable;