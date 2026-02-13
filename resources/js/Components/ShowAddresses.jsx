import React, { useEffect, useState, useContext, useMemo } from 'react';
import DataTable from 'react-data-table-component';
import { MessageContext } from './MessageContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import usePermission from "../hooks/usePermission"; 

const endpoint = '/api/addresses';

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

const ShowAddresses = ({ user }) => {
    // --- STATE VARIABLES ---
    const [addresses, setAddresses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredAddresses, setFilteredAddresses] = useState([]);

    // States for soft deletion modal
    const [showModal, setShowModal] = useState(false);
    const [addressToDeactivate, setAddressToDeactivate] = useState(null);
    const [deactivationReason, setDeactivationReason] = useState('');

    const { setSuccessMessage, setErrorMessage, successMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    // --- PERMISSIONS CONFIGURATION ---
    const { can } = usePermission(user);
    const canCreate = user ? can('Crear-predios') : false;
    const canEdit = user ? can('Editar-predios') : false;
    const canDeactivate = user ? can('Eliminar-predios') : false;
    const canCreatePayment = user ? can('Crear-pagos') : false;
    const canViewPayments = user ? can('Ver-pagos') : false;

    // --- NAVIGATION FUNCTIONS ---
    const editAddress = (id) => navigate(`/addresses/edit/${id}`);
    const createAddress = () => navigate('/addresses/create');
    const createPayment = (id) => navigate(`/addresses/payment/${id}`);
    const viewPaymentHistory = (id) => navigate(`/addresses/payments/history/${id}`);

    /**
     * Auto-clear success and error messages after 5 seconds
     */
    useEffect(() => {
        if (successMessage || errorMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage(null);
                setErrorMessage(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, errorMessage, setSuccessMessage, setErrorMessage]);

    /**
     * Fetch addresses from the API
     */
    const fetchAddresses = async () => {
        setLoading(true);
        try {
            const response = await axios.get(endpoint, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
            });
            const data = response.data.data || response.data;
            setAddresses(Array.isArray(data) ? data : []);
            setFilteredAddresses(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching addresses:', error);
            const msg = error.response?.data?.message || 'Fallo al cargar el catálogo de direcciones.';
            setErrorMessage(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAddresses();
    }, []);

    /**
     * Search and Filter logic (client-side)
     */
    useEffect(() => {
        const result = addresses.filter(addr => {
            const streetName = addr.street?.name || ''; 
            const addressText = `${addr.community} ${streetName} ${addr.street_number} ${addr.type} ${addr.status}`;
            const userName = addr.user ? `${addr.user.name}` : '';
            const searchText = search.toLowerCase();

            return addressText.toLowerCase().includes(searchText) ||
                userName.toLowerCase().includes(searchText);
        });
        setFilteredAddresses(result);
    }, [search, addresses]);

    /**
     * Logical deactivation (Soft Delete)
     */
    const deactivateAddress = async (id, reason) => {
        try {
            const response = await axios.delete(`${endpoint}/${id}`, {
                withCredentials: true,
                headers: { Accept: 'application/json' },
                data: { reason: reason } 
            });

            if (response.status === 200) {
                setSuccessMessage('Predio dado de baja exitosamente.');
                fetchAddresses(); 
            }
        } catch (error) {
            console.error('Deactivation error:', error);
            setErrorMessage(error.response?.data?.message || 'Error al desactivar predio.');
        } finally {
            setShowModal(false);
            setDeactivationReason('');
        }
    };

    const toggleModal = () => setShowModal(!showModal);

    const confirmDeactivation = (id) => {
        setAddressToDeactivate(id);
        setDeactivationReason('');
        toggleModal();
    };

    const handleDeactivation = () => {
        if (!deactivationReason.trim()) {
            setErrorMessage('Debe proporcionar un motivo para dar de baja.');
            return;
        }
        deactivateAddress(addressToDeactivate, deactivationReason);
    }

    /**
     * 🛡️ DATA TABLE COLUMNS DEFINITION
     */
    const columns = useMemo(() => [
        {
            name: 'Dirección',
            selector: row => row.street?.name || '', 
            sortable: true,
            width: '240px',
            cell: row => (
                <div style={{ lineHeight: '1.2' }}>
                    <span className="d-block"><strong>{row.street?.name || 'N/A'} #{row.street_number}</strong></span>
                    <div className="mt-1">
                        <span className="badge bg-secondary me-1">{row.type}</span>
                        {row.type === 'CASA' && (
                            <span className={`badge ${row.status === 'Habitada' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                                {row.status}
                            </span>
                        )}
                    </div>
                </div>
            ),
        },
        {
            name: 'Residente (Usuario)',
            selector: row => row.user ? row.user.name : 'Sin asignar',
            sortable: true,
            width: '220px',
            cell: row => (
                <div>
                    <span className={row.user ? 'fw-bold' : 'text-muted'}>
                        {row.user ? row.user.name : 'Vacante'}
                    </span>
                    {row.user && <small className="d-block text-muted">{row.user.email}</small>}
                </div>
            ),
        },
        { name: 'Comentarios', selector: row => row.comments, sortable: true, wrap: true, width: '200px' },
        {
            name: 'Estado', 
            selector: row => row.deleted_at ? 'Inactivo' : 'Activo',
            sortable: true,
            width: '130px',
            cell: row => (
                <span className={`badge ${row.deleted_at ? 'bg-danger' : 'bg-info'}`}>
                    {row.deleted_at ? 'Eliminado' : 'Activo'}
                </span>
            ),
        },
        {
            name: 'Acciones', 
            cell: row => (
                <div className="d-flex gap-1 justify-content-end w-100 pe-2">
                    {!row.deleted_at && (
                        <>
                            {canCreatePayment && (
                                <button className="btn btn-primary btn-sm" onClick={() => createPayment(row.id)}>
                                    Pagar
                                </button>
                            )}
                            {canViewPayments && (
                                <button className="btn btn-warning btn-sm" onClick={() => viewPaymentHistory(row.id)}>
                                    Historial
                                </button>
                            )}
                        </>
                    )}

                    {canEdit && (
                        <button className="btn btn-info btn-sm text-white" onClick={() => editAddress(row.id)} disabled={!!row.deleted_at}>
                            Editar
                        </button>
                    )}

                    {canDeactivate && (
                        <>
                            {row.deleted_at ? (
                                <button className="btn btn-secondary btn-sm" disabled>Baja</button>
                            ) : (
                                <button className="btn btn-danger btn-sm" onClick={() => confirmDeactivation(row.id)}>Baja</button>
                            )}
                        </>
                    )}
                </div>
            ),
            width: '320px', 
        },
    ], [canEdit, canDeactivate, canCreatePayment, canViewPayments, navigate]);

    const NoDataComponent = () => (
        <div style={{ padding: '24px', textAlign: 'center', fontSize: '1.1em', color: '#6c757d' }}>
            No hay predios registrados.
        </div>
    );

    return (
        <div className="mb-4 border border-primary rounded p-3 bg-white">
            {/* Header section: Create Button & Search Bar */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="col-md-6">
                    {canCreate && (
                        <button className='btn btn-success btn-sm text-white' onClick={createAddress}>
                            <i className="fas fa-plus"></i> Crear Dirección
                        </button>
                    )}
                </div>
                <div className="col-md-6 d-flex justify-content-end align-items-center">
                    <input
                        type="text"
                        className="form-control form-control-sm w-75"
                        placeholder="Buscar por calle, número, residente o estado..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Feedback Messages (Success/Error Alerts) */}
            <div className="col-md-12 mt-2">
                {successMessage && <div className="alert alert-success text-center py-2 shadow-sm">{successMessage}</div>}
                {errorMessage && !showModal && <div className="alert alert-danger text-center py-2 shadow-sm">{errorMessage}</div>}
            </div>

            {/* Data Table */}
            <div className="col-md-12 mt-2">
                <DataTable
                    title="Catálogo de Predios"
                    columns={columns}
                    data={filteredAddresses}
                    progressPending={loading}
                    noDataComponent={<NoDataComponent />}
                    pagination
                    highlightOnHover
                    striped
                    responsive
                    customStyles={customStyles}
                />
            </div>

            {/* Deactivation Confirmation Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.6)'}} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">Confirmar Baja de Catálogo</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={toggleModal}></button>
                            </div>
                            <div className="modal-body text-center p-4">
                                <p className="fs-5">¿Está seguro de que desea dar de baja esta dirección?</p>
                                <p className="text-muted small">Esta acción es irreversible y quedará registrada en el historial.</p>
                                <div className="form-group mt-3 text-start">
                                    <label htmlFor="reason" className="fw-bold">Motivo de la Baja <span className="text-danger">*</span></label>
                                    <textarea
                                        id="reason"
                                        className="form-control mt-2"
                                        rows="3"
                                        value={deactivationReason}
                                        onChange={(e) => setDeactivationReason(e.target.value)}
                                        placeholder="Ingrese la razón detallada..."
                                    />
                                </div>
                                {errorMessage && <div className="alert alert-danger text-center mt-3 py-2">{errorMessage}</div>}
                            </div>
                            <div className="modal-footer bg-light justify-content-center">
                                <button type="button" className="btn btn-secondary px-4" onClick={toggleModal}>Cancelar</button>
                                <button
                                    type="button"
                                    className="btn btn-danger px-4"
                                    onClick={handleDeactivation}
                                    disabled={!deactivationReason.trim()}
                                >
                                    Confirmar Baja
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShowAddresses;