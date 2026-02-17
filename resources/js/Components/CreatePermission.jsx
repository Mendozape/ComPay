import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * PermisoCreate Component
 * Handles the creation of new system permissions.
 */
export default function PermisoCreate() {
    // --- STATE VARIABLES ---
    const [name, setName] = useState("");
    const [permissions, setPermissions] = useState([]);
    const [nameError, setNameError] = useState(""); 
    const [isSaving, setIsSaving] = useState(false);
    
    // --- NAVIGATION ---
    const navigate = useNavigate();

    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: "application/json" },
    };

    /**
     * Fetch existing permissions to prevent duplicates on the frontend
     */
    useEffect(() => {
        const fetchPermissions = async () => {
            try {
                const res = await axios.get("/api/permisos", axiosOptions);
                const data = res.data.data || res.data;
                setPermissions(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error fetching permissions:", err);
                toastr.error("Error al cargar los permisos existentes.", "Fallo");
            }
        };
        fetchPermissions();
    }, []);

    /**
     * Handle form submission to create a new permission
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setNameError(""); 
        setIsSaving(true);

        // Basic validation
        if (!name.trim()) {
            setNameError("El nombre del permiso es obligatorio.");
            toastr.warning("Nombre de permiso obligatorio");
            setIsSaving(false);
            return;
        }

        // Duplicate check
        if (permissions.some((p) => p.name.toLowerCase() === name.trim().toLowerCase())) {
            setNameError("Este nombre de permiso ya existe.");
            toastr.warning("El permiso ya está registrado");
            setIsSaving(false);
            return;
        }

        try {
            const res = await axios.post("/api/permisos", { name: name.trim() }, axiosOptions);
            toastr.success(res.data.message || "Permiso creado exitosamente.", "Éxito");
            navigate("/permissions");
        } catch (error) {
            console.error("Error creating permission:", error);
            const errorMsg = error.response?.data?.message || "Error al crear el permiso.";
            toastr.error(errorMsg, "Operación Fallida");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="container mt-4">
            <div className="row justify-content-center">
                <div className="col-md-8">
                    <div className="card shadow-sm border-0">
                        {/* Standardized Success Green Header */}
                        <div className="card-header bg-success text-white p-3">
                            <h2 className="mb-0 h4">
                                <i className="fas fa-plus-circle me-2"></i>Crear Nuevo Permiso
                            </h2>
                        </div>

                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                {/* Permission Name Input */}
                                <div className="mb-4">
                                    <label className="form-label fw-bold">Nombre del Permiso <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={`form-control ${nameError ? "is-invalid" : ""}`}
                                        placeholder="Ej. Crear-reportes"
                                        required
                                    />
                                    {nameError && <div className="invalid-feedback">{nameError}</div>}
                                </div>

                                {/* List of current permissions as reference */}
                                {permissions.length > 0 && (
                                    <div className="mb-4">
                                        <label className="form-label fw-bold text-muted small">
                                            <i className="fas fa-list me-1"></i>Permisos ya registrados:
                                        </label>
                                        <div 
                                            className="border rounded bg-light p-2 overflow-auto" 
                                            style={{ maxHeight: '150px' }}
                                        >
                                            {permissions.map((p) => (
                                                <span key={p.id} className="badge bg-secondary m-1">
                                                    {p.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="d-flex gap-2 pt-3 border-top">
                                    <button type="submit" className="btn btn-success px-4 shadow-sm" disabled={isSaving}>
                                        <i className="fas fa-save me-2"></i>{isSaving ? "Guardando..." : "Guardar Permiso"}
                                    </button>
                                    <button 
                                        type="button" 
                                        className="btn btn-secondary px-4" 
                                        onClick={() => navigate("/permissions")}
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