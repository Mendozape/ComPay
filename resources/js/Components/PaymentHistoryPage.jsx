import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import axios from 'axios';
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

/**
 * PaymentHistoryPage Component
 * Displays the list of payments and waivers for a specific property.
 * Allows administrative cancellation of records with a required reason.
 */
const PaymentHistoryPage = ({ user }) => {
    const { id: addressId } = useParams(); 
    const navigate = useNavigate();
    
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
    const [isProcessing, setIsProcessing] = useState(false);

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
            // Fetch property details to populate the header
            const addressResponse = await axios.get(`/api/addresses/${addressId}`, axiosOptions);
            const addressData = addressResponse.data.data || addressResponse.data;
            setAddressDetails(addressData);

            if (addressData && addressData.street_id) {
                const streetResponse = await axios.get(`/api/streets/${addressData.street_id}`, axiosOptions);
                setStreetName(streetResponse.data.name || 'Calle Desconocida');
            }
            
            // Fetch full payment history for this address
            const paymentsResponse = await axios.get(`/api/address_payments/history/${addressId}`, axiosOptions);
            const data = paymentsResponse.data?.data || paymentsResponse.data || [];
            setPayments(data);
        } catch (error) {
            console.error("Error fetching history:", error);
            toastr.error('Error al cargar el historial de pagos.', 'Fallo'); 
        } finally {
            setLoading(false);
        }
    };

    /**
     * Client-side search filtering
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
        if (!cancellationReason.trim()) {
            toastr.warning('Debe proporcionar un motivo para la anulación.', 'Atención');
            return;
        }

        setIsProcessing(true);
        try {
            await axios.post(`/api/address_payments/cancel/${paymentToCancel.id}`, { reason: cancellationReason }, axiosOptions);
            toastr.success('Pago anulado exitosamente.', 'Éxito');
            setShowCancelModal(false); 
            fetchPaymentHistory(); 
        } catch (error) {
            const msg = error.response?.data?.message || 'Fallo al anular el pago.';
            toastr.error(msg, 'Error');
        } finally {
            setIsProcessing(false);
        }
    };

    /**
     * Formats the property header based on type and status
     */
    const getFormattedHeader = () => {
        if (!addressDetails) return 'Cargando...';
        const { street_number, type, status } = addressDetails;
        const typeLabel = type === 'CASA' ? `CASA (${status})` : type;
        return `${streetName} #${street_number} - ${typeLabel}`;
    };

    /**
     * Table columns definition
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
                let badgeClass = "bg-warning text-dark";
                let statusText = row.status;

                if (row.deleted_at) {
                    badgeClass = "bg-danger";
                    statusText = "Anulado";
                } else if (row.status === 'Pagado') {
                    badgeClass = "bg-success"; 
                } else if (row.status === 'Condonado') {
                    badgeClass = "bg-info text-white";
                }

                return <span className={`badge ${badgeClass} shadow-sm px-3`}>{statusText}</span>;
            }
        },
        { name: 'Motivo Anulación', selector: row => row.deletion_reason || '', wrap: true, width: '200px' },
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

                <DataTable
                    columns={columns}
                    data={filteredPayments}
                    progressPending={loading}
                    pagination
                    highlightOnHover
                    striped
                    responsive
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
            {showCancelModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title"><i className="fas fa-exclamation-triangle me-2"></i>Confirmar Anulación</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCancelModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="text-center fs-5">¿Confirma la anulación del pago de <strong>{paymentToCancel?.fee?.name}</strong>?</p>
                                <div className="form-group mt-3">
                                    <label className="fw-bold mb-2">Motivo de la Anulación <span className="text-danger">*</span></label>
                                    <textarea 
                                        className="form-control" 
                                        rows="3" 
                                        value={cancellationReason} 
                                        onChange={(e) => setCancellationReason(e.target.value)} 
                                        placeholder="Explique por qué se anula este pago..." 
                                    />
                                </div>
                            </div>
                            <div className="modal-footer bg-light justify-content-center">
                                <button className="btn btn-secondary px-4" onClick={() => setShowCancelModal(false)}>Cerrar</button>
                                <button 
                                    className="btn btn-danger px-4 shadow-sm" 
                                    onClick={handleCancellation} 
                                    disabled={isProcessing || !cancellationReason.trim()}
                                >
                                    {isProcessing ? 'Procesando...' : 'Confirmar Anulación'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentHistoryPage;