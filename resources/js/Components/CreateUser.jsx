import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { MessageContext } from "./MessageContext";

const CreateUser = () => {
    // --- STATE FOR FORM DATA ---
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [phone, setPhone] = useState("");
    const [comments, setComments] = useState("");

    // --- STATE FOR ROLE SELECTION ---
    const [roles, setRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState("");

    // --- STATE FOR INLINE VALIDATION ERRORS ---
    const [nameError, setNameError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [roleError, setRoleError] = useState("");
    const [loading, setLoading] = useState(false);

    // --- CONTEXT AND NAVIGATION ---
    const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    const axiosOptions = { withCredentials: true, headers: { Accept: "application/json" } };

    /**
     * Clear context messages on mount
     */
    useEffect(() => {
        setSuccessMessage("");
        setErrorMessage("");
    }, [setSuccessMessage, setErrorMessage]);

    /**
     * Reset local states
     */
    const resetForm = () => {
        setName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setPhone("");
        setComments("");
        setSelectedRole("");
        setNameError("");
        setEmailError("");
        setPasswordError("");
        setRoleError("");
    };

    /**
     * Fetch available roles from API
     */
    useEffect(() => {
        const fetchRoles = async () => {
            try {
                const res = await axios.get("/api/roles", axiosOptions);
                setRoles(res.data);
            } catch (err) {
                console.error("Error fetching roles:", err);
                setErrorMessage("Error al cargar los roles.");
            }
        };
        fetchRoles();
    }, []);

    /**
     * Handle form submission to create a new user/resident
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        // Reset error messages
        setErrorMessage("");
        setNameError("");
        setEmailError("");
        setPasswordError("");
        setRoleError("");

        // --- FRONTEND VALIDATIONS ---
        if (!name.trim()) { setNameError("El Nombre es obligatorio"); setLoading(false); return; }
        if (!email.trim()) { setEmailError("El Correo Electrónico es obligatorio"); setLoading(false); return; }
        if (!password) { setPasswordError("La Contraseña es obligatoria"); setLoading(false); return; }
        if (password !== confirmPassword) { setPasswordError("Las Contraseñas no coinciden"); setLoading(false); return; }
        if (!selectedRole) { setRoleError("Por favor, seleccione un rol"); setLoading(false); return; }

        try {
            await axios.post(
                "/api/usuarios",
                {
                    name,
                    email,
                    password,
                    password_confirmation: confirmPassword,
                    phone,
                    comments,
                    roles: [selectedRole],
                },
                axiosOptions
            );

            setSuccessMessage("Usuario/Residente creado exitosamente.");
            resetForm();
            navigate("/users");

        } catch (err) {
            console.error(err);
            let errorMsg = "Error al crear el usuario.";
            if (err.response?.data?.errors) {
                // Mapping Laravel validation errors if present
                const firstError = Object.values(err.response.data.errors)[0][0];
                errorMsg = firstError || errorMsg;
            } else if (err.response?.data?.message) {
                errorMsg = err.response.data.message;
            }
            setErrorMessage(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-4">
            <div className="card shadow-sm border-0">
                {/* Standardized Success Green Header */}
                <div className="card-header bg-success text-white p-3">
                    <h2 className="mb-0 h4">
                        <i className="fas fa-user-plus me-2"></i>Crear Nuevo Usuario o Residente
                    </h2>
                </div>
                <div className="card-body p-4">
                    {/* Error Alerts */}
                    {errorMessage && <div className="alert alert-danger text-center shadow-sm">{errorMessage}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="row g-3 mb-4">
                            {/* Full Name */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Nombre Completo <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    className={`form-control ${nameError ? "is-invalid" : ""}`}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ej. Juan Pérez"
                                    required
                                />
                                {nameError && <div className="invalid-feedback">{nameError}</div>}
                            </div>

                            {/* Email Address */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Correo Electrónico <span className="text-danger">*</span></label>
                                <input
                                    type="email"
                                    className={`form-control ${emailError ? "is-invalid" : ""}`}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="correo@ejemplo.com"
                                    required
                                />
                                {emailError && <div className="invalid-feedback">{emailError}</div>}
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
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ""))}
                                        placeholder="10 dígitos"
                                    />
                                </div>
                            </div>

                            {/* Role Selection */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Role del Sistema <span className="text-danger">*</span></label>
                                <select
                                    className={`form-select ${roleError ? "is-invalid" : ""}`}
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                    required
                                >
                                    <option value="">Seleccione un rol...</option>
                                    {roles.map((r) => (
                                        <option key={r.id} value={r.name}>
                                            {r.name}
                                        </option>
                                    ))}
                                </select>
                                {roleError && <div className="invalid-feedback">{roleError}</div>}
                            </div>
                        </div>

                        <div className="row g-3 mb-4 p-3 bg-light rounded border">
                            {/* Password */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Contraseña <span className="text-danger">*</span></label>
                                <input
                                    type="password"
                                    className={`form-control ${passwordError ? "is-invalid" : ""}`}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                            </div>

                            {/* Confirm Password */}
                            <div className="col-md-6">
                                <label className="form-label fw-bold">Confirmar Contraseña <span className="text-danger">*</span></label>
                                <input
                                    type="password"
                                    className={`form-control ${passwordError ? "is-invalid" : ""}`}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                />
                                {passwordError && <div className="invalid-feedback d-block">{passwordError}</div>}
                            </div>
                        </div>

                        {/* Internal Comments */}
                        <div className="mb-4">
                            <label className="form-label fw-bold">Comentarios / Notas Internas</label>
                            <textarea
                                className="form-control"
                                rows="3"
                                value={comments}
                                onChange={(e) => setComments(e.target.value)}
                                placeholder="Notas adicionales sobre este registro..."
                            ></textarea>
                        </div>

                        <div className="d-flex gap-2 pt-3 border-top">
                            <button type="submit" className="btn btn-success px-4 shadow-sm" disabled={loading}>
                                <i className="fas fa-save me-2"></i>{loading ? "Guardando..." : "Guardar Usuario"}
                            </button>
                            <button type="button" className="btn btn-secondary px-4" onClick={() => navigate("/users")}>
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateUser;