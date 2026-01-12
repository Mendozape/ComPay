import React, { useEffect, useState, useContext, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
// 🚨 Import the hook
import usePermission from "../hooks/usePermission"; 

const endpoint = '/api/fees';

/**
 * 🎨 CUSTOM STYLES FOR DATA TABLE
 * Centralized styles to avoid passing unknown props to the DOM.
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

const FeesTable = ({ user }) => {
    // State variables
    const [fees, setFees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredFees, setFilteredFees] = useState([]);
    
    const [showModal, setShowModal] = useState(false);
    const [feeToDeactivate, setFeeToDeactivate] = useState(null); 
    const [deactivationReason, setDeactivationReason] = useState(''); 

    // 🚨 Initialize the permission hook
    const { can } = usePermission(user);

    // 🛡️ Extraction to constants for stable permission evaluation
    const canCreate = user ? can('Crear-cuotas') : false;
    const canEdit = user ? can('Editar-cuotas') : false;
    const canDeactivate = user ? can('Eliminar-cuotas') : false;

    const { setSuccessMessage, setErrorMessage, successMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Fetch all fees from the API
     */
    const fetchFees = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoint, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });
            const data = response.data.data || response.data;
            setFees(data);
            setFilteredFees(data);
        } catch (error) {
            console.error('Error fetching fees:', error);
            setErrorMessage('Fallo al cargar las cuotas.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFees();
    }, []);

    /**
     * Real-time filtering based on search
     */
    useEffect(() => {
        const result = fees.filter(fee => fee.name.toLowerCase().includes(search.toLowerCase()));
        setFilteredFees(result);
    }, [search, fees]);

    /**
     * Logical deactivation of a fee with a reason
     */
    const deactivateFee = async (id, reason) => {
        try {
            const response = await axios.delete(`${endpoint}/${id}`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
                data: { reason: reason } 
            });
            
            if (response.status === 200) {
                setSuccessMessage('Cuota dada de baja exitosamente.');
                setShowModal(false); 
                setDeactivationReason(''); 
                fetchFees(); 
            } 
        } catch (error) {
            const msg = error.response?.data?.message || 'Fallo al dar de baja la cuota.';
            setErrorMessage(msg);
        }
    };

    const editFee = (id) => navigate(`/fees/edit/${id}`);
    const createFee = () => navigate('/fees/create');
    const toggleModal = () => {
        setShowModal(!showModal);
        if (showModal) {
            setErrorMessage(null);
            setDeactivationReason('');
        }
    };
    
    const confirmDeactivation = (id) => {
        setFeeToDeactivate(id);
        setDeactivationReason(''); 
        setShowModal(true);
    };
    
    const handleDeactivation = () => {
        if (!deactivationReason.trim()) {
            setErrorMessage('Debe especificar un motivo de la baja.');
            return;
        }
        deactivateFee(feeToDeactivate, deactivationReason);
    }

    /**
     * 🛡️ COLUMNS DEFINITION
     * FIX: Replaced 'minWidth' with fixed 'width' to prevent DOM warnings.
     * Actions column uses Bootstrap flex classes for alignment.
     */
    const columns = useMemo(() => [
        { name: 'Nombre', selector: row => row.name, sortable: true, width: '180px' },
        { 
            name: 'Monto Casa', 
            selector: row => row.amount_house, 
            sortable: true,
            width: '130px',
            cell: row => `$${parseFloat(row.amount_house).toLocaleString()}` 
        },
        { 
            name: 'Monto Terreno', 
            selector: row => row.amount_land, 
            sortable: true,
            width: '130px',
            cell: row => `$${parseFloat(row.amount_land).toLocaleString()}` 
        },
        { name: 'Descripción', selector: row => row.description, sortable: true, width: '200px' },
        { 
            name: 'Estado', 
            selector: row => row.deleted_at ? 'Inactivo' : 'Activo', 
            sortable: true,
            width: '110px',
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
                    {canEdit && (
                        <button 
                            className="btn btn-info btn-sm text-white" 
                            onClick={() => editFee(row.id)} 
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
                                <button className="btn btn-danger btn-sm" onClick={() => confirmDeactivation(row.id)}>Dar de baja</button>
                            )}
                        </>
                    )}
                </div>
            ),
            width: '200px',
        },
    ], [canEdit, canDeactivate, navigate]);

    const NoDataComponent = () => (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '1.1em', color: '#6c757d' }}>
            No hay registros para mostrar.
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
        <div className="mb-4 border border-primary rounded p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-3">
                {canCreate ? (
                    <button className='btn btn-success btn-sm text-white' onClick={createFee}>Crear Cuota</button>
                ) : <div />}
                
                <input
                    type="text"
                    className="form-control form-control-sm w-25"
                    placeholder="Buscar por nombre"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {successMessage && <div className="alert alert-success text-center py-2">{successMessage}</div>}

            <DataTable
                title="Lista de Cuotas" 
                columns={columns}
                data={filteredFees}
                progressPending={loading}
                noDataComponent={<NoDataComponent />}
                pagination
                highlightOnHover
                striped
                customStyles={customStyles}
            />

            {/* Modal for logical delete */}
            <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1" role="dialog">
                <div className="modal-dialog" role="document">
                    <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title">Confirmar Baja de Cuota</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={toggleModal}></button>
                        </div>
                        <div className="modal-body p-4">
                            <p className="text-center">¿Está seguro de que desea dar de baja esta cuota?</p>
                            <div className="form-group mt-3">
                                <label htmlFor="reason">Motivo de la Baja <span className="text-danger">*</span></label>
                                <textarea
                                    id="reason"
                                    className="form-control mt-2"
                                    rows="3"
                                    value={deactivationReason}
                                    onChange={(e) => setDeactivationReason(e.target.value)}
                                    placeholder="Ingrese la razón de la baja"
                                />
                            </div>
                            {errorMessage && <div className="alert alert-danger text-center mt-3 py-2">{errorMessage}</div>}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" onClick={toggleModal}>Cancelar</button>
                            <button 
                                type="button" 
                                className="btn btn-danger" 
                                onClick={handleDeactivation}
                                disabled={!deactivationReason.trim()}
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

export default FeesTable;