import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import { MessageContext } from "./MessageContext";

const axiosOptions = { withCredentials: true };

const EditUser = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    // --- STATE MANAGEMENT ---
    const [user, setUser] = useState({
        name: "",
        email: "",
        phone: "",
        comments: ""
    });

    // Roles and selection
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState("");

    // Password fields
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");

    // Validation and permission UI states
    const [errors, setErrors] = useState({});
    const [rolesError, setRolesError] = useState(false);
    const [loading, setLoading] = useState(true);

    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);

    /**
     * Initial data load
     */
    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await axios.get(`/api/usuarios/${id}`, axiosOptions);
                const userData = res.data;
                setUser({
                    name: userData.name || "",
                    email: userData.email || "",
                    phone: userData.phone || "",
                    comments: userData.comments || ""
                });
                setSelectedRole(userData.roles?.[0]?.id || "");
            } catch {
                setErrorMessage("Error al cargar los datos del usuario.");
            } finally {
                setLoading(false);
            }
        };

        const fetchRoles = async () => {
            try {
                const res = await axios.get("/api/roles", axiosOptions);
                setRoles(res.data);
                setRolesError(false);
            } catch (err) {
                if (err.response?.status === 403) {
                    setRolesError(true);
                } else {
                    setErrorMessage("Error al cargar los roles.");
                }
            }
        };

        fetchUser();
        fetchRoles();
    }, [id, setErrorMessage]);

    /**
     * Form submission handler
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setErrors({});
        setErrorMessage(null);

        if (!selectedRole) {
            setErrors({ roles: ["Debes seleccionar un rol"] });
            return;
        }

        if (password && password !== passwordConfirmation) {
            setErrors({
                password_confirmation: ["La confirmación de la contraseña no coincide."]
            });
            return;
        }

        try {
            await axios.put(
                `/api/usuarios/${id}`,
                {
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    comments: user.comments,
                    roles: [selectedRole],
                    password: password || undefined,
                    password_confirmation: password ? passwordConfirmation : undefined,
                },
                axiosOptions
            );

            setSuccessMessage("Usuario/Residente actualizado correctamente.");
            setErrorMessage(""); 
            navigate("/users");

        } catch (err) {
            console.error(err);
            if (err.response?.status === 403) {
                setErrorMessage(err.response.data?.error || "No tienes permisos.");
            } else if (err.response?.status === 422) {
                setErrors(err.response.data.errors);
            } else {
                setErrorMessage("Error al actualizar el usuario.");
            }
        }
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando datos del usuario...</p>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                {/* Header color BG-SUCCESS estandarizado */}
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4">
                        <i className="fas fa-user-edit me-2"></i>Editar Residente
                    </h2>
                </div>
                <div className="card-body p-4">
                    {/* Global Messages */}
                    {errorMessage && <div className="alert alert-danger text-center shadow-sm">{errorMessage}</div>}
                    {rolesError && <div className="alert alert-warning text-center shadow-sm">No tienes permisos para modificar roles.</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="row g-3 mb-4">
                            {/* Full Name */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Nombre Completo <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control ${errors.name ? "is-invalid" : ""}`}
                                    value={user.name}
                                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                                    required
                                />
                                {errors.name && <div className="invalid-feedback">{errors.name[0]}</div>}
                            </div>

                            {/* Email Address */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Correo Electrónico <span className="text-danger">*</span></label>
                                <input
                                    type="email"
                                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                                    value={user.email}
                                    onChange={(e) => setUser({ ...user, email: e.target.value })}
                                    required
                                />
                                {errors.email && <div className="invalid-feedback">{errors.email[0]}</div>}
                            </div>
                        </div>

                        <div className="row g-3 mb-4">
                            {/* Phone Number */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Teléfono de Contacto</label>
                                <div className="input-group">
                                    <span className="input-group-text"><i className="fas fa-phone"></i></span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={user.phone}
                                        onChange={(e) => setUser({ ...user, phone: e.target.value.replace(/[^0-9]/g, "") })}
                                        placeholder="10 dígitos"
                                    />
                                </div>
                            </div>

                            {/* Roles Selection */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Rol del Sistema <span className="text-danger">*</span></label>
                                <select
                                    className={`form-select ${errors.roles ? "is-invalid" : ""}`}
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    disabled={rolesError}
                                    required
                                >
                                    <option value="">Selecciona un rol</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.id}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.roles && <div className="invalid-feedback">{errors.roles[0]}</div>}
                            </div>
                        </div>

                        <div className="row g-3 mb-4 p-3 bg-light rounded border">
                            <div className="col-12">
                                <small className="text-muted d-block mb-2">
                                    <i className="fas fa-info-circle me-1"></i> Deje los campos de contraseña vacíos si no desea cambiarla.
                                </small>
                            </div>
                            {/* Password Update */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    className={`form-control ${errors.password ? "is-invalid" : ""}`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                />
                                {errors.password && <div className="invalid-feedback">{errors.password[0]}</div>}
                            </div>

                            {/* Confirm Password */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Confirmar Nueva Contraseña</label>
                                <input
                                    type="password"
                                    className={`form-control ${errors.password_confirmation ? "is-invalid" : ""}`}
                                    value={passwordConfirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    autoComplete="new-password"
                                />
                                {errors.password_confirmation && (
                                    <div className="invalid-feedback">{errors.password_confirmation[0]}</div>
                                )}
                            </div>
                        </div>

                        {/* Internal Comments */}
                        <div className="mb-4">
                            <label className="form-label fw-bold">Comentarios / Notas Internas</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={user.comments}
                                onChange={(e) => setUser({ ...user, comments: e.target.value })}
                                placeholder="Notas adicionales sobre el residente..."
                            ></textarea>
                        </div>

                        <div className="d-flex gap-2 pt-3 border-top">
                            <button
                                type="submit"
                                className="btn btn-success px-5 shadow-sm"
                                disabled={rolesError || !selectedRole}
                            >
                                <i className="fas fa-save me-2"></i>Actualizar Datos
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary px-4"
                                onClick={() => navigate("/users")}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditUser;