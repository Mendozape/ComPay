import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DataTable from 'react-data-table-component';
import axios from 'axios';
import { MessageContext } from './MessageContext';
import usePermission from "../hooks/usePermission"; 

const axiosOptions = {
    withCredentials: true,
    headers: {
        Accept: 'application/json',
    },
};

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
    
    const [payments, setPayments] = useState([]);
    const [addressDetails, setAddressDetails] = useState(null); 
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filteredPayments, setFilteredPayments] = useState([]);

    const [showCancelModal, setShowCancelModal] = useState(false);
    const [paymentToCancel, setPaymentToCancel] = useState(null);
    const [cancellationReason, setCancellationReason] = useState('');
    
    const [streetName, setStreetName] = useState('Cargando...'); 

    const { can } = usePermission(user);
    const canCancelPayment = user ? can('Eliminar-pagos') : false;

    /**
     * 🛡️ CLEANUP ON MOUNT
     * Ensures that if we arrive here with a message from a previous page 
     * (like an Edit form), it gets cleared immediately or handled.
     */
    useEffect(() => {
        // Clear any leftover messages from other pages when this component loads
        return () => {
            setSuccessMessage(null);
            setErrorMessage(null);
        };
    }, []);

    /**
     * 🛡️ AUTO-HIDE MESSAGES EFFECT
     */
    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => setSuccessMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [successMessage, setSuccessMessage]);

    useEffect(() => {
        if (errorMessage) {
            const timer = setTimeout(() => setErrorMessage(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [errorMessage, setErrorMessage]);

    const getMonthName = (monthNum) => {
        const monthNames = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        return monthNum >= 1 && monthNum <= 12 ? monthNames[monthNum - 1] : 'N/A';
    };
    
    const getFormattedAddress = () => {
        if (!addressDetails) return 'Cargando Dirección...';
        const { street_number, type } = addressDetails;
        return `${streetName} #${street_number} (${type})`;
    };

    const fetchPaymentHistory = async () => {
        setLoading(true);
        try {
            const addressResponse = await axios.get(`/api/addresses/${addressId}`, axiosOptions);
            const addressData = addressResponse.data.data || addressResponse.data;
            setAddressDetails(addressData);

            if (addressData && addressData.street_id) {
                const streetResponse = await axios.get(`/api/streets/${addressData.street_id}`, axiosOptions);
                setStreetName(streetResponse.data.name || 'Calle Desconocida');
            }
            
            const paymentsResponse = await axios.get(`/api/address_payments/history/${addressId}`, axiosOptions);
            const fetchedPayments = paymentsResponse.data?.data || paymentsResponse.data || [];
            
            setPayments(fetchedPayments);
            setFilteredPayments(fetchedPayments);
            
        } catch (error) {
            console.error('Error fetching data:', error);
            setErrorMessage('Error al cargar el historial de pagos.'); 
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (addressId) fetchPaymentHistory();
    }, [addressId]); 
    
    useEffect(() => {
        const paymentsArray = Array.isArray(payments) ? payments : []; 
        const result = paymentsArray.filter(payment => 
            (payment.fee?.name || '').toLowerCase().includes(search.toLowerCase()) ||
            (payment.status || '').toLowerCase().includes(search.toLowerCase())
        );
        setFilteredPayments(result);
    }, [search, payments]);

    const handleCancellation = async () => {
        if (!cancellationReason.trim()) {
            setErrorMessage('Debe especificar un motivo de cancelación.');
            return;
        }

        try {
            await axios.post(`/api/address_payments/cancel/${paymentToCancel.id}`, 
                { reason: cancellationReason }, 
                axiosOptions
            );
            setSuccessMessage('Pago anulado exitosamente.');
            setShowCancelModal(false); 
            fetchPaymentHistory(); 
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Fallo al anular el pago.');
        }
    };

    const columns = useMemo(() => [
        { name: 'Cuota', selector: row => row.fee ? row.fee.name : 'N/A', sortable: true, wrap: true, width: '150px' }, 
        { 
            name: 'Monto', 
            selector: row => row.amount_paid, 
            sortable: true, 
            width: '120px',
            cell: row => (
                <div className="w-100 text-end fw-bold">
                    ${parseFloat(row.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
            ),
        },
        { 
            name: 'Periodo', 
            selector: row => `${row.year}${row.month}`,
            cell: row => `${getMonthName(row.month)} ${row.year}`,
            sortable: true,
            width: '150px'
        },
        { name: 'Fecha Pago', selector: row => row.payment_date, sortable: true, width: '130px' },
        { 
            name: 'Estado', 
            selector: row => row.status, 
            width: '110px',
            cell: row => (
                <span className={`badge ${
                    row.deleted_at ? 'bg-secondary' : 
                    row.status === 'Pagado' ? 'bg-success' : 
                    row.status === 'Condonado' ? 'bg-info' : 'bg-danger'
                }`}>
                    {row.deleted_at ? 'Anulado' : row.status}
                </span>
            ),
        },
        { name: 'Motivo Cancelación', selector: row => row.deletion_reason || '', wrap: true, width: '200px' },
        {
            name: 'Acción',
            width: '120px',
            cell: row => (
                <div className="d-flex justify-content-end w-100 pe-2">
                    {!row.deleted_at && canCancelPayment && (row.status === 'Pagado' || row.status === 'Condonado') ? (
                        <button 
                            className="btn btn-outline-danger btn-sm" 
                            onClick={() => {
                                setPaymentToCancel(row);
                                setShowCancelModal(true);
                                setCancellationReason('');
                            }}
                        >
                            <i className="fas fa-times me-1"></i> Anular
                        </button>
                    ) : row.deleted_at ? (
                        <small className="text-muted italic">Sin acciones</small>
                    ) : null}
                </div>
            ),
        },
    ], [canCancelPayment, navigate]);

    return (
        <div className="row mb-4 border border-primary rounded p-3 mx-auto mt-4" style={{ maxWidth: '95%', backgroundColor: '#fff' }}>
            <div className="col-md-12">
                {successMessage && <div className="alert alert-success text-center py-2">{successMessage}</div>}
                {errorMessage && <div className="alert alert-danger text-center py-2">{errorMessage}</div>}
                
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="text-primary mb-0"><i className="fas fa-history me-2"></i>Historial: {getFormattedAddress()}</h4>
                    <div className="w-25">
                        <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Buscar por Cuota o Estado..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="card shadow-sm mb-4">
                    <div className="card-body p-0">
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
                    </div>
                </div>
                
                <button className="btn btn-secondary btn-sm" onClick={() => navigate('/addresses')}>
                    <i className="fas fa-arrow-left me-1"></i> Volver a Direcciones
                </button>
            </div>
            
            <div className={`modal fade ${showCancelModal ? 'show d-block' : 'd-none'}`} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className="modal-header bg-danger text-white">
                            <h5 className="modal-title">Confirmar Anulación</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowCancelModal(false)}></button>
                        </div>
                        <div className="modal-body text-center p-4">
                            <p>¿Confirma la anulación del pago de <strong>{paymentToCancel?.fee?.name}</strong>?</p>
                            <div className="form-group text-start">
                                <label className="fw-bold small">Motivo de la Anulación *</label>
                                <textarea
                                    className="form-control mt-2"
                                    rows="3"
                                    value={cancellationReason}
                                    onChange={(e) => setCancellationReason(e.target.value)}
                                    placeholder="Explique por qué se anula..."
                                    required
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowCancelModal(false)}>Cerrar</button>
                            <button className="btn btn-danger" onClick={handleCancellation} disabled={!cancellationReason.trim()}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentHistoryPage;