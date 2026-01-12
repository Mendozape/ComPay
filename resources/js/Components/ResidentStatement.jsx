import React, { useEffect, useState, useContext } from 'react';
import axios from 'axios';
import { MessageContext } from './MessageContext';

const ResidentStatement = ({ user }) => {
    // --- STATE MANAGEMENT ---
    const [addressDetails, setAddressDetails] = useState(null);
    const [year, setYear] = useState(new Date().getFullYear());
    const [paidMonths, setPaidMonths] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(true); 
    const { setErrorMessage } = useContext(MessageContext);

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
     * Initial Effect: Loads the user's address.
     * Permission is also checked here for the first load.
     */
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const response = await axios.get('/api/user', axiosOptions);
                const freshUser = response.data;

                // Check permissions
                const perms = [...(freshUser.permissions || []), ...(freshUser.roles?.flatMap(r => r.permissions || []) || [])]
                                .map(p => p.name.toLowerCase());
                
                if (!perms.includes('ver-estado-cuenta')) {
                    setIsAuthorized(false);
                    return;
                }

                if (freshUser.address) {
                    setAddressDetails(freshUser.address);
                } else {
                    setErrorMessage("No active property linked to this account.");
                }
            } catch (error) {
                console.error("Error during initial data fetch:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    /**
     * Effect: Fetch payments. 
     * This runs every time the 'year' or 'addressDetails' changes.
     * If the server returns 403, we know the permission was revoked.
     */
    useEffect(() => {
        const fetchStatement = async () => {
            if (!addressDetails || !isAuthorized) return;

            try {
                const response = await axios.get(
                    `/api/address_payments/paid-months/${addressDetails.id}/${year}`,
                    axiosOptions
                );
                
                // If the request succeeds, it means the user STILL has permissions
                setPaidMonths(response.data.months || []);
                setIsAuthorized(true); 
            } catch (error) {
                // 🛑 CRITICAL: If the backend returns 403 (Forbidden), permission was revoked
                if (error.response && error.response.status === 403) {
                    setIsAuthorized(false);
                    setPaidMonths([]); // Clear data to avoid showing "Pending"
                }
                console.error("Error fetching payment status:", error);
            }
        };

        fetchStatement();
    }, [year, addressDetails]);

    const getMonthStatus = (monthNum) => paidMonths.find(item => item.month === monthNum);

    // 1. Loading View
    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2">Verifying data...</p>
        </div>
    );

    // 2. Unauthorized View (Permission Revoked)
    // This will replace the entire interface if isAuthorized becomes false
    if (!isAuthorized) return (
        <div className="container mt-5">
            <div className="alert alert-danger shadow-sm border-danger">
                <h4 className="alert-heading"><i className="fas fa-lock me-2"></i>Acceso Denegado</h4>
                <p>Sus permisos han sido actualizados. Ya no tiene autorización para ver este módulo.</p>
                <hr />
                <p className="mb-0 small">Por favor, contacte al administrador si cree que esto es un error.</p>
            </div>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-primary">
                <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
                    <h3 className="mb-0 h5"><i className="fas fa-file-invoice-dollar me-2"></i>Estado de Cuenta</h3>
                    <span className="badge bg-light text-primary">{addressDetails?.community || 'Residencial'}</span>
                </div>
                <div className="card-body">
                    {addressDetails ? (
                        <>
                            <div className="row mb-4 bg-light p-3 rounded mx-0 border">
                                <div className="col-md-6">
                                    <small className="text-muted text-uppercase fw-bold">Propiedad:</small>
                                    <h4 className="fw-bold mb-0">
                                        {addressDetails.street?.name || 'Calle'} #{addressDetails.street_number}
                                    </h4>
                                    <span className="badge bg-secondary">{addressDetails.type}</span>
                                </div>
                                <div className="col-md-6 text-md-end mt-3 mt-md-0">
                                    <label className="form-label text-muted d-block small fw-bold">CONSULTAR OTRO AÑO:</label>
                                    <div className="btn-group">
                                        {availableYears.map(y => (
                                            <button 
                                                key={y} 
                                                className={`btn btn-sm ${year === y ? 'btn-primary' : 'btn-outline-primary'}`}
                                                onClick={() => setYear(y)}
                                            >
                                                {y}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="table-responsive">
                                <table className="table table-hover text-center align-middle border">
                                    <thead className="table-dark">
                                        <tr>
                                            <th className="text-start ps-4">Mes</th>
                                            <th>Estado</th>
                                            <th>Concepto (Cuota)</th>
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
                                                            <span className={`badge ${status.status === 'Condonado' ? 'bg-info' : 'bg-success'} w-75 p-2`}>
                                                                {status.status}
                                                            </span>
                                                        ) : (
                                                            <span className="badge bg-danger w-75 p-2">Pendiente</span>
                                                        )}
                                                    </td>
                                                    <td className="text-muted small">{status?.fee_name || '--'}</td>
                                                    <td className="small text-muted">{status?.payment_date || '--'}</td>
                                                    <td className="text-end pe-4 fw-bold">
                                                        {status ? (
                                                            `$${parseFloat(status.amount_paid || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
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
                        <div className="alert alert-warning border-warning shadow-sm">
                            <i className="fas fa-exclamation-circle me-2"></i>
                            <strong>No tiene ninguna Propiedad asignada:</strong>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResidentStatement;