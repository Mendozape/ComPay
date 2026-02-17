import React, { useEffect, useState } from 'react';
import axios from 'axios';

/**
 * ResidentStatement Component
 * Allows residents to view their payment history and account status 
 * for their assigned properties across different years.
 */
const ResidentStatement = ({ user }) => {
    // --- STATE MANAGEMENT ---
    const [allAddresses, setAllAddresses] = useState([]); 
    const [addressDetails, setAddressDetails] = useState(null); 
    const [year, setYear] = useState(new Date().getFullYear());
    const [paidMonths, setPaidMonths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(true); 

    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: 'application/json' },
    };

    const months = [
        { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
        { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
        { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
        { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' },
    ];

    const currentYear = new Date().getFullYear();
    const availableYears = [currentYear - 1, currentYear, currentYear + 1];

    /**
     * Initial Effect: Load user info and property links on mount
     */
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await axios.get('/api/user', axiosOptions);
                const freshUser = response.data;

                // Permission check: check both direct and role-based permissions
                const perms = [...(freshUser.permissions || []), ...(freshUser.roles?.flatMap(r => r.permissions || []) || [])]
                                .map(p => p.name.toLowerCase());
                
                if (!perms.includes('ver-estado-cuenta')) {
                    setIsAuthorized(false);
                    return;
                }

                // Identify properties linked to the account (plural or singular relation)
                const userProperties = freshUser.addresses || [];
                
                if (userProperties.length > 0) {
                    setAllAddresses(userProperties);
                    setAddressDetails(userProperties[0]); 
                } else if (freshUser.address) {
                    setAllAddresses([freshUser.address]);
                    setAddressDetails(freshUser.address);
                } else {
                    toastr.info("No se encontraron propiedades vinculadas a esta cuenta.", "Información");
                }
            } catch (error) {
                console.error("Error during initial data fetch:", error);
                toastr.error("Error al conectar con el servidor.", "Error");
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    /**
     * Fetch payment details when property or year selection changes
     */
    useEffect(() => {
        const fetchStatement = async () => {
            if (!addressDetails || !isAuthorized) return;

            try {
                const response = await axios.get(
                    `/api/address_payments/paid-months/${addressDetails.id}/${year}`,
                    axiosOptions
                );
                setPaidMonths(response.data.months || []);
                setIsAuthorized(true); 
            } catch (error) {
                if (error.response && error.response.status === 403) {
                    setIsAuthorized(false);
                    setPaidMonths([]);
                }
                console.error("Error fetching payment status:", error);
            }
        };

        fetchStatement();
    }, [year, addressDetails]);

    /**
     * Retrieves specific month payment metadata
     */
    const getMonthStatus = (monthNum) => paidMonths.find(item => item.month === monthNum);

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Verificando información...</p>
        </div>
    );

    if (!isAuthorized) return (
        <div className="container mt-5">
            <div className="alert alert-danger shadow-sm border-danger text-center">
                <h4 className="alert-heading"><i className="fas fa-lock me-2"></i>Acceso Denegado</h4>
                <p className="mb-0">No tiene autorización para ver este módulo.</p>
            </div>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-primary">
                {/* Standardized success green header */}
                <div className="card-header bg-success text-white d-flex justify-content-between align-items-center p-3">
                    <h3 className="mb-0 h5"><i className="fas fa-file-invoice-dollar me-2"></i>Estado de Cuenta</h3>
                    <span className="badge bg-light text-success fw-bold">{addressDetails?.community || 'Residencial'}</span>
                </div>
                <div className="card-body p-4">
                    {addressDetails ? (
                        <>
                            <div className="row mb-4 bg-light p-3 rounded mx-0 border align-items-center shadow-sm">
                                <div className="col-md-6">
                                    <small className="text-muted text-uppercase fw-bold">Propiedad Seleccionada:</small>
                                    
                                    {allAddresses.length > 1 ? (
                                        <select 
                                            className="form-select form-select-lg fw-bold border-success mt-1 shadow-sm"
                                            value={addressDetails.id}
                                            onChange={(e) => setAddressDetails(allAddresses.find(a => a.id === parseInt(e.target.value)))}
                                        >
                                            {allAddresses.map(addr => (
                                                <option key={addr.id} value={addr.id}>
                                                    {addr.street?.name} #{addr.street_number} ({addr.type}{addr.type === 'CASA' ? ` - ${addr.status}` : ''})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <h4 className="fw-bold mb-0 text-dark">
                                            {addressDetails.street?.name || 'Calle'} #{addressDetails.street_number}
                                            <br/>
                                            <span className="badge bg-secondary fs-6 mt-1 me-1">{addressDetails.type}</span>
                                            {addressDetails.type === 'CASA' && (
                                                <span className={`badge fs-6 mt-1 ${addressDetails.status === 'Habitada' ? 'bg-primary' : 'bg-warning text-dark'}`}>
                                                    {addressDetails.status}
                                                </span>
                                            )}
                                        </h4>
                                    )}
                                </div>

                                <div className="col-md-6 text-md-end mt-3 mt-md-0">
                                    <label className="form-label text-muted d-block small fw-bold">CAMBIAR AÑO:</label>
                                    <div className="btn-group shadow-sm">
                                        {availableYears.map(y => (
                                            <button 
                                                key={y} 
                                                className={`btn ${year === y ? 'btn-success' : 'btn-outline-success'}`}
                                                onClick={() => setYear(y)}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Monthly Statement Table */}
                            <div className="table-responsive">
                                <table className="table table-hover text-center align-middle border shadow-sm">
                                    <thead className="table-dark">
                                        <tr>
                                            <th className="text-start ps-4">Mes</th>
                                            <th>Estado</th>
                                            <th>Concepto</th>
                                            <th>Fecha de Pago</th>
                                            <th className="text-end pe-4">Monto</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {months.map(m => {
                                            const status = getMonthStatus(m.value);
                                            return (
                                                <tr key={m.value} className={!status ? 'table-light' : ''}>
                                                    <td className="fw-bold text-start ps-4">{m.label}</td>
                                                    <td>
                                                        {status ? (
                                                            <span className={`badge ${status.status === 'Condonado' ? 'bg-info' : 'bg-success'} w-75 p-2 shadow-sm`}>
                                                                {status.status}
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-danger w-75 p-2 shadow-sm">Pendiente</span>
                                                        )}
                                                    </td>
                                                    <td className="text-muted small">{status?.fee_name || '--'}</td>
                                                    <td className="small text-muted">{status?.payment_date || '--'}</td>
                                                    <td className="text-end pe-4 fw-bold">
                                                        {status ? (
                                                            <span className="text-success">
                                                                {`$${parseFloat(status.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted opacity-50">$0.00</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="alert alert-warning border-warning shadow-sm text-center">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            <strong>No tiene ninguna Propiedad asignada.</strong>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResidentStatement;