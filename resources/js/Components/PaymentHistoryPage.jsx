import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import axios from 'axios';
import { MessageContext } from './MessageContext';
import usePermission from "../hooks/usePermission"; 

const axiosOptions = {
    withCredentials: true,
    headers: { Accept: 'application/json' },
};

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

const PaymentHistoryPage = ({ user }) => {
    const { id: addressId } = useParams(); 
    const navigate = useNavigate();
    const { setSuccessMessage, setErrorMessage, successMessage, errorMessage } = useContext(MessageContext);
    
    // --- STATE MANAGEMENT ---
    const [payments, setPayments] = useState([]);
    const [addressDetails, setAddressDetails] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredPayments, setFilteredPayments] = useState([]);

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [paymentToCancel, setPaymentToCancel] = useState(null);
    const [cancellationReason, setCancellationReason] = useState('');
    const [streetName, setStreetName] = useState('Cargando...'); 

    // --- PERMISSIONS ---
    const { can } = usePermission(user);
    const canCancelPayment = user ? can('Eliminar-pagos') : false;

    /**
     * Fetch payment history and address details on mount
     */
    useEffect(() => {
        if (addressId) fetchPaymentHistory();
    }, [addressId]); 

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            // Fetch the specific address details
            const addressResponse = await axios.get(`/api/addresses/${addressId}`, axiosOptions);
            const addressData = addressResponse.data.data || addressResponse.data;
            setAddressDetails(addressData);

            // Fetch street name if street_id is present
            if (addressData && addressData.street_id) {
                const streetResponse = await axios.get(`/api/streets/${addressData.street_id}`, axiosOptions);
                setStreetName(streetResponse.data.name || 'Calle Desconocida');
            }
            
            // Fetch payment records for this specific address
            const paymentsResponse = await axios.get(`/api/address_payments/history/${addressId}`, axiosOptions);
            const data = paymentsResponse.data?.data || paymentsResponse.data || [];
            setPayments(data);
        } catch (error) {
            console.error("Error fetching history:", error);
            setErrorMessage('Error al cargar el historial de pagos.'); 
        } finally {
            setLoading(false);
        }
    };

    /**
     * Handle search filtering logic
     */
    useEffect(() => {
        const result = payments.filter(p => 
            (p.fee?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (p.status || '').toLowerCase().includes(search.toLowerCase())
        );
        setFilteredPayments(result);
    }, [search, payments]);

    /**
     * Send cancellation request to the API
     */
    const handleCancellation = async () => {
        if (!cancellationReason.trim()) return;
        try {
            await axios.post(`/api/address_payments/cancel/${paymentToCancel.id}`, { reason: cancellationReason }, axiosOptions);
            setSuccessMessage('Pago anulado exitosamente.');
            setShowCancelModal(false); 
            fetchPaymentHistory(); 
        } catch (error) {
            setErrorMessage('Fallo al anular el pago.');
        }
    };

    /**
     * 🔥 Helper to format the address header with Type and Occupation Status
     */
    const getFormattedHeader = () => {
        if (!addressDetails) return 'Cargando...';
        const { street_number, type, status } = addressDetails;
        const typeLabel = type === 'CASA' ? `CASA (${status})` : type;
        return `${streetName} #${street_number} - ${typeLabel}`;
    };

    /**
     * Table columns configuration
     */
    const columns = useMemo(() => [
        { name: 'Cuota', selector: row => row.fee?.name || 'N/A', sortable: true, width: '180px' }, 
        { 
            name: 'Monto', 
            selector: row => row.amount_paid, 
            sortable: true, 
            width: '120px',
            cell: row => <div className="fw-bold text-end w-100">${parseFloat(row.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
        },
        { 
            name: 'Periodo', 
            cell: row => `${row.month}/${row.year}`,
            sortable: true,
            width: '120px'
        },
        { name: 'Fecha Pago', selector: row => row.payment_date, sortable: true, width: '130px' },
        { 
            name: 'Estado', 
            width: '120px',
            cell: row => {
                // 🎨 COLOR LOGIC: PAGADO = SUCCESS (GREEN)
                let badgeClass = "bg-warning text-dark"; // Default: Pending
                let statusText = row.status;

                if (row.deleted_at) {
                    badgeClass = "bg-danger"; // Red for Cancelled/Deleted
                    statusText = "Anulado";
                } else if (row.status === 'Pagado') {
                    badgeClass = "bg-success"; // ✅ GREEN FOR PAID
                } else if (row.status === 'Condonado') {
                    badgeClass = "bg-info text-white"; // Blue for Condoned
                }

                return <span className={`badge ${badgeClass} shadow-sm px-3`}>{statusText}</span>;
            }
        },
        { name: 'Motivo', selector: row => row.deletion_reason || '', wrap: true, width: '200px' },
        {
            name: 'Acción',
            width: '120px',
            cell: row => (
                <div className="d-flex justify-content-end w-100 pe-2">
                    {!row.deleted_at && canCancelPayment && (row.status === 'Pagado' || row.status === 'Condonado') && (
                        <button 
                            className="btn btn-danger btn-sm shadow-sm" 
                            onClick={() => { setPaymentToCancel(row); setShowCancelModal(true); setCancellationReason(''); }}
                        >
                            <i className="fas fa-ban me-1"></i> Anular
                        </button>
                    )}
                </div>
            ),
        },
    ], [canCancelPayment]);

    return (
        <div className="container-fluid mt-4">
            <div className="mb-4 border border-primary rounded p-3 bg-white shadow-sm mx-auto" style={{ maxWidth: '95%' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="text-primary mb-0">
                        <i className="fas fa-history me-2"></i>Historial: {getFormattedHeader()}
                    </h4>
                    <input 
                        type="text" 
                        className="form-control form-control-sm w-25" 
                        placeholder="Buscar cuota o estado..." 
                        value={search} 
                        onChange={(e) => setSearch(e.target.value)} 
                    />
                </div>

                {/* Status messages */}
                {successMessage && <div className="alert alert-success text-center py-2 shadow-sm">{successMessage}</div>}
                {errorMessage && <div className="alert alert-danger text-center py-2 shadow-sm">{errorMessage}</div>}

                <DataTable
                    columns={columns}
                    data={filteredPayments}
                    progressPending={loading}
                    pagination
                    highlightOnHover
                    striped
                    customStyles={customStyles}
                    noDataComponent={<div className="p-4">No hay pagos registrados para este predio.</div>}
                />
                
                <div className="mt-3 border-top pt-3">
                    <button className="btn btn-secondary btn-sm" onClick={() => navigate('/addresses')}>
                        <i className="fas fa-arrow-left me-1"></i> Volver a Direcciones
                    </button>
                </div>
            </div>
            
            {/* CANCELLATION MODAL */}
            <div className={`modal fade ${showCancelModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-content border-0 shadow">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title"><i className="fas fa-exclamation-triangle me-2"></i>Confirmar Anulación</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowCancelModal(false)}></button>
                        </div>
                        <div className="modal-body p-4">
                            <p className="text-center">¿Confirma la anulación del pago de <strong>{paymentToCancel?.fee?.name}</strong>?</p>
                            <div className="form-group">
                                <label className="fw-bold mb-2">Motivo de la Anulación *</label>
                                <textarea 
                                    className="form-control" 
                                    rows="3" 
                                    value={cancellationReason} 
                                    onChange={(e) => setCancellationReason(e.target.value)} 
                                    placeholder="Explique por qué se anula este pago..." 
                                    required
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer bg-light">
                            <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>Cerrar</button>
                            <button 
                                className="btn btn-danger shadow-sm" 
                                onClick={handleCancellation} 
                                disabled={!cancellationReason.trim()}
                            >
                                Confirmar Anulación
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentHistoryPage;