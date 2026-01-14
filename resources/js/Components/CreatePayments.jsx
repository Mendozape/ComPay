import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { MessageContext } from './MessageContext';

const PaymentForm = () => {
    // --- STATE VARIABLES ---
    const { id: addressId } = useParams();
    const [addressDetails, setAddressDetails] = useState(null); 
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [paymentDate, setPaymentDate] = useState('');
    const [feeId, setFeeId] = useState('');
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [waivedMonths, setWaivedMonths] = useState([]);
    const [paidMonths, setPaidMonths] = useState([]); 
    const [year, setYear] = useState('');
    const [fees, setFees] = useState([]);
    const [formValidated, setFormValidated] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [validationWarning, setValidationWarning] = useState(false);
    const [streetName, setStreetName] = useState('Loading...'); 

    const { setSuccessMessage, setErrorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: 'application/json' },
    };

    /**
     * Helper to get current date in YYYY-MM-DD format based on local time
     */
    const getLocalDate = () => {
        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localDate = new Date(now.getTime() - offset * 60000);
        return localDate.toISOString().split('T')[0];
    };

    /**
     * Fetch address and street details on component mount
     */
    useEffect(() => {
        const fetchAddressDetails = async () => {
            try {
                const addressResponse = await axios.get(`/api/addresses/${addressId}`, axiosOptions);
                const details = addressResponse.data.data;
                setAddressDetails(details);
                
                if (details && details.street_id) {
                    const streetResponse = await axios.get(`/api/streets/${details.street_id}`, axiosOptions);
                    setStreetName(streetResponse.data.name || 'Unknown Street');
                }
            } catch (error) {
                console.error('Error fetching details:', error);
                setErrorMessage('Failed to load address information.');
            }
        };
        fetchAddressDetails();
    }, [addressId]);

    /**
     * Fetch active fees catalog from API
     */
    useEffect(() => {
        const fetchFees = async () => {
            try {
                const response = await axios.get('/api/fees', axiosOptions);
                const activeFees = (response.data.data || []).filter(fee => !fee.deleted_at);
                setFees(activeFees);
            } catch (error) {
                console.error('Error fetching fees:', error);
            }
        };
        fetchFees();
        setPaymentDate(getLocalDate());
    }, []);

    /**
     * Fetch months already paid or waived for the selected year and fee type
     */
    useEffect(() => {
        const fetchPaidMonths = async () => {
            if (!year || !feeId) return;
            try {
                const response = await axios.get(
                    `/api/address_payments/paid-months/${addressId}/${year}?fee_id=${feeId}`,
                    axiosOptions
                );
                setPaidMonths(response.data.months || []);
            } catch (error) {
                console.error('Error fetching paid months:', error);
                setPaidMonths([]);
            }
        };
        fetchPaidMonths();
        setSelectedMonths([]);
        setWaivedMonths([]);
    }, [year, addressId, feeId]);

    const isMonthRegistered = (monthNum) => paidMonths.some(item => item.month === monthNum);
    const getMonthStatus = (monthNum) => paidMonths.find(item => item.month === monthNum);

    /**
     * Set specific amount based on Property Type (House/Land) and Status (Occupied/Empty)
     */
    const handleFeeChange = (e) => {
        const selectedFee = fees.find(fee => fee.id === parseInt(e.target.value));
        setFeeId(e.target.value);
        setPaidMonths([]);
        setSelectedMonths([]);
        setWaivedMonths([]);
        setYear('');
        
        if (selectedFee && addressDetails) {
            let finalAmount = 0;
            const propertyType = addressDetails.type.toLowerCase();
            const propertyStatus = addressDetails.status; 

            if (propertyType === 'terreno') {
                finalAmount = selectedFee.amount_land;
            } else {
                finalAmount = propertyStatus === 'Habitada' 
                    ? selectedFee.amount_occupied 
                    : selectedFee.amount_empty;
            }
            setAmount(finalAmount);
            setDescription(selectedFee.description);
        } else {
            setAmount('');
            setDescription('');
        }
    };

    /**
     * Update internal lists for Pay or Waive actions per month
     */
    const handleActionChange = (monthValue, action) => {
        const monthNum = Number(monthValue);
        setSelectedMonths(prevSelected => {
            let newSelected = prevSelected.filter(m => m !== monthNum);
            let newWaived = waivedMonths.filter(m => m !== monthNum);

            if (action === 'pay') {
                newSelected.push(monthNum);
                setWaivedMonths(newWaived);
            } else if (action === 'waive') {
                newSelected.push(monthNum);
                newWaived.push(monthNum);
                setWaivedMonths(newWaived);
            }
            return newSelected;
        });
    };
    
    /**
     * Toggle all unpaid months for a batch payment
     */
    const handleSelectAllMonths = (e) => {
        const isChecked = e.target.checked;
        const unpaidMonthsNums = months.map(m => m.value).filter(m => !isMonthRegistered(m));
        if (isChecked) {
            setSelectedMonths(unpaidMonthsNums);
            setWaivedMonths([]);
        } else {
            setSelectedMonths([]);
            setWaivedMonths([]);
        }
    };

    /**
     * Submit payment/waiver records to the backend
     */
    const handleConfirmSubmit = async () => {
        setErrorMessage('');
        const unpaidSelectedMonths = selectedMonths.filter(m => !isMonthRegistered(Number(m)));
        const monthsToWaive = unpaidSelectedMonths.filter(m => waivedMonths.includes(m));

        if (unpaidSelectedMonths.length === 0) {
            setErrorMessage('Please select at least one month.');
            setShowModal(false);
            return;
        }

        try {
            await axios.post('/api/address_payments', {
                address_id: addressId, 
                fee_id: feeId,
                payment_date: paymentDate,
                year,
                months: unpaidSelectedMonths,
                waived_months: monthsToWaive,
            }, axiosOptions);
            setSuccessMessage('Records registered successfully.');
            navigate('/addresses', { replace: true });
        } catch (error) {
            setErrorMessage(error.response?.data?.message || 'Error processing the payment.');
            setShowModal(false); 
        }
    };

    const months = [
        { value: 1, label: 'Ene' }, { value: 2, label: 'Feb' }, { value: 3, label: 'Mar' }, 
        { value: 4, label: 'Abr' }, { value: 5, label: 'May' }, { value: 6, label: 'Jun' },
        { value: 7, label: 'Jul' }, { value: 8, label: 'Ago' }, { value: 9, label: 'Sep' }, 
        { value: 10, label: 'Oct' }, { value: 11, label: 'Nov' }, { value: 12, label: 'Dic' },
    ];

    const currentYear = new Date().getFullYear();
    const years = [
        { value: '', label: 'Select Year' },
        { value: currentYear - 1, label: currentYear - 1 },
        { value: currentYear, label: currentYear },
        { value: currentYear + 1, label: currentYear + 1 }
    ];
    
    /**
     * 🔥 DYNAMIC HEADER: Displays Property Type and Status
     */
    const getFormattedHeader = () => {
        if (!addressDetails) return 'Loading...';
        const { street_number, type, status } = addressDetails;
        const typeLabel = type === 'CASA' ? `CASA (${status})` : type;
        return `${streetName} #${street_number} - ${typeLabel}`;
    };
    
    const allUnpaidSelected = months.filter(m => !isMonthRegistered(m.value)).length === selectedMonths.length && selectedMonths.length > 0;

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4"><i className="fas fa-cash-register me-2"></i>Registrar Pago: {getFormattedHeader()}</h2>
                </div>
                <div className="card-body p-4">
                    <form onSubmit={(e) => { e.preventDefault(); setFormValidated(true); if (!feeId || !year || !paymentDate) setValidationWarning(true); else setShowModal(true); }} noValidate className={formValidated ? 'was-validated' : ''}>
                        
                        <div className="row">
                            <div className="col-md-8 mb-3">
                                <label className="form-label fw-bold">Cuota a Cobrar <span className="text-danger">*</span></label>
                                <select value={feeId} onChange={handleFeeChange} className="form-select border-primary" required>
                                    <option value="">Seleccione una cuota...</option>
                                    {fees.map(fee => <option key={fee.id} value={fee.id}>{fee.name}</option>)}
                                </select>
                            </div>

                            <div className="col-md-4 mb-3">
                                <label className="form-label fw-bold">Año <span className="text-danger">*</span></label>
                                <select value={year} onChange={(e) => setYear(e.target.value)} className="form-select border-primary" required disabled={!feeId}>
                                    {years.map(y => <option key={y.value} value={y.value}>{y.label}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        {feeId && (
                            <div className="alert alert-info py-2 shadow-sm mb-4 text-center">
                                <strong>Monto Unitario:</strong> <span className="fs-5 text-dark">${amount}</span>
                                <span className="mx-3">|</span>
                                <strong>Descripción:</strong> <small>{description || 'Sin descripción'}</small>
                            </div>
                        )}

                        {feeId && year && (
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <label className="fw-bold"><i className="fas fa-calendar-check me-1 text-success"></i>Seleccione Meses:</label>
                                    <div className="form-check form-switch">
                                        <input type="checkbox" className="form-check-input" id="selectAllMonths" checked={allUnpaidSelected} onChange={handleSelectAllMonths} />
                                        <label className="form-check-label fw-bold small" htmlFor="selectAllMonths">Seleccionar Todos (Pagar)</label>
                                    </div>
                                </div>
                                <div className="table-responsive rounded shadow-sm border">
                                    <table className="table table-sm table-hover text-center align-middle mb-0">
                                        <thead className="table-light">
                                            <tr>
                                                <th className="bg-light border-end" style={{width: '100px'}}>Acción</th>
                                                {months.map(m => <th key={m.value} className="small">{m.label}</th>)}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr>
                                                <td className="fw-bold bg-light border-end small">P=Pago<br/>C=Condo.</td>
                                                {months.map(m => {
                                                    const status = getMonthStatus(m.value);
                                                    const isPay = selectedMonths.includes(m.value) && !waivedMonths.includes(m.value);
                                                    const isWaive = waivedMonths.includes(m.value);
                                                    return (
                                                        <td key={m.value} className={status ? 'bg-light' : ''}>
                                                            {status ? (
                                                                <span className={`badge ${status.status === 'Condonado' ? 'bg-info' : 'bg-success'} w-100`}>{status.status[0]}</span>
                                                            ) : (
                                                                <div className="d-flex flex-column gap-1 py-1">
                                                                    <label className="m-0" style={{cursor: 'pointer'}} title="Pay">
                                                                        <input type="radio" name={`m-${m.value}`} checked={isPay} onChange={() => handleActionChange(m.value, 'pay')} /> 
                                                                        <span className="ms-1 small">P</span>
                                                                    </label>
                                                                    <label className="m-0 text-info" style={{cursor: 'pointer'}} title="Waive">
                                                                        <input type="radio" name={`m-${m.value}`} checked={isWaive} onChange={() => handleActionChange(m.value, 'waive')} /> 
                                                                        <span className="ms-1 small">C</span>
                                                                    </label>
                                                                </div>
                                                            )}
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        <div className="row align-items-end">
                            <div className="col-md-4 mb-3">
                                <label className="form-label fw-bold">Fecha del Pago <span className="text-danger">*</span></label>
                                <input value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} type='date' className='form-control' required />
                            </div>
                            <div className="col-md-8 mb-3 text-end">
                                <button type="submit" className="btn btn-success px-4 py-2 shadow-sm me-2">
                                    <i className="fas fa-save me-2"></i>Registrar Movimientos
                                </button>
                                <button type="button" className="btn btn-secondary px-4 py-2" onClick={() => navigate('/addresses')}>
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>

            {/* CONFIRMATION MODAL */}
            {showModal && (
                <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.6)'}} tabIndex="-1">
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 shadow-lg">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title"><i className="fas fa-check-circle me-2"></i>Confirmar Registro</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4 text-center">
                                <p className="fs-5">¿Desea registrar los pagos y/o condonaciones seleccionados?</p>
                            </div>
                            <div className="modal-footer bg-light">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                                <button className="btn btn-success" onClick={handleConfirmSubmit}>Confirmar y Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentForm;