import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * CreateRole Component
 * Handles the creation of new system roles and permission assignment
 */
export default function CreateRole() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState("");
    const [roles, setRoles] = useState([]);
    const [permissions, setPermissions] = useState([]);
    const [selectedPermissions, setSelectedPermissions] = useState([]);
    const [nameError, setNameError] = useState(""); 
    const [permissionError, setPermissionError] = useState(""); 
    const [selectAll, setSelectAll] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // --- NAVIGATION AND OPTIONS ---
    const navigate = useNavigate();
    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: "application/json" },
    };

    /**
     * Fetch existing roles and permissions on component mount
     */
    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [resRoles, resPerms] = await Promise.all([
                    axios.get("/api/roles", axiosOptions),
                    axios.get("/api/permisos", axiosOptions)
                ]);
                setRoles(resRoles.data);
                setPermissions(resPerms.data);
            } catch (err) {
                console.error("Error fetching data:", err);
                toastr.error("Error al cargar el catálogo de roles y permisos.", "Fallo");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    /**
     * Sync "Select All" status with individual selection changes
     */
    useEffect(() => {
        if (permissions.length > 0) {
            setSelectAll(selectedPermissions.length === permissions.length);
        }
    }, [selectedPermissions, permissions]);

    /**
     * Toggle a single permission selection
     */
    const togglePermission = (id) => {
        setSelectedPermissions((prev) =>
            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
        );
    };

    /**
     * Toggle all permissions at once
     */
    const toggleSelectAll = () => {
        if (selectAll) {
            setSelectedPermissions([]);
        } else {
            setSelectedPermissions(permissions.map((p) => p.id));
        }
        setSelectAll(!selectAll);
    };

    /**
     * Handle form submission to create a new role
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setNameError("");
        setPermissionError("");
        setIsSaving(true);

        // --- FRONTEND VALIDATIONS ---
        if (!name.trim()) {
            setNameError("El nombre del rol es obligatorio.");
            toastr.warning("Nombre de rol obligatorio");
            setIsSaving(false);
            return;
        }

        if (roles.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) {
            setNameError("Este nombre de rol ya existe.");
            toastr.warning("El nombre del rol ya está en uso");
            setIsSaving(false);
            return;
        }

        if (selectedPermissions.length === 0) {
            setPermissionError("Debe seleccionar al menos un permiso.");
            toastr.warning("Seleccione al menos un permiso");
            setIsSaving(false);
            return;
        }

        try {
            await axios.post(
                "/api/roles",
                { name: name.trim(), permission: selectedPermissions },
                axiosOptions
            );
            
            toastr.success("Role creado exitosamente.", "Éxito");
            navigate("/roles");
        } catch (err) {
            console.error("Error creating role:", err);
            let errorMsg = err.response?.data?.message || "Error al crear el rol.";
            toastr.error(errorMsg, "Operación Fallida");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando catálogo...</p>
        </div>
    );

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        {/* Standardized Success Green Header */}
                        <div className="card-header bg-success text-white p-3">
                            <h2 className="mb-0 h4">
                                <i className="fas fa-user-tag me-2"></i>Crear Nuevo Role
                            </h2>
                        </div>

                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                {/* Role Name Input */}
                                <div className="mb-4">
                                    <label className="form-label fw-bold">Nombre del Rol <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={`form-control ${nameError ? "is-invalid" : ""}`}
                                        placeholder="Ej. Supervisor de Gastos"
                                        required
                                    />
                                    {nameError && <div className="invalid-feedback">{nameError}</div>}
                                </div>

                                {/* Permissions Management */}
                                <div className="mb-4">
                                    <label className="form-label fw-bold mb-2">Asignar Permisos <span className="text-danger">*</span></label>
                                    
                                    {/* Select All Checkbox Container */}
                                    {permissions.length > 0 && (
                                        <div className="form-check mb-3 p-3 border rounded bg-light shadow-sm">
                                            <input
                                                type="checkbox"
                                                className="form-check-input ms-0 me-2"
                                                id="selectAll"
                                                checked={selectAll}
                                                onChange={toggleSelectAll}
                                            />
                                            <label className="form-check-label fw-bold" htmlFor="selectAll" style={{ cursor: 'pointer' }}>
                                                Seleccionar Todos ({selectedPermissions.length}/{permissions.length})
                                            </label>
                                        </div>
                                    )}

                                    {/* Permissions Grid */}
                                    <div className="row bg-white border rounded p-3 mx-0 overflow-auto shadow-inner" style={{ maxHeight: '250px', backgroundColor: '#fdfdfd' }}>
                                        {permissions.map((p) => (
                                            <div key={p.id} className="col-md-6 mb-2">
                                                <div className="form-check">
                                                    <input
                                                        type="checkbox"
                                                        className="form-check-input me-2"
                                                        id={`perm-${p.id}`}
                                                        checked={selectedPermissions.includes(p.id)}
                                                        onChange={() => togglePermission(p.id)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    <label className="form-check-label small" htmlFor={`perm-${p.id}`} style={{ cursor: 'pointer' }}>
                                                        {p.name}
                                                    </label>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {permissionError && <div className="text-danger small mt-2 fw-bold">{permissionError}</div>}
                                </div>

                                {/* Action Buttons */}
                                <div className="d-flex gap-2 pt-3 border-top">
                                    <button type="submit" className="btn btn-success px-4 shadow-sm" disabled={isSaving}>
                                        <i className="fas fa-save me-2"></i>{isSaving ? "Guardando..." : "Guardar Rol"}
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary px-4" 
                                        onClick={() => navigate("/roles")}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}