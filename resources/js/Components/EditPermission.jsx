import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * PermisoEdit Component
 * Allows modification of an existing system permission.
 */
export default function PermisoEdit() {
    const { id } = useParams();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const navigate = useNavigate();

    const axiosOptions = {
        withCredentials: true,
        headers: { Accept: "application/json" },
    };

    /**
     * Fetch permission details on component mount
     */
    useEffect(() => {
        const fetchPermiso = async () => {
            try {
                setLoading(true);
                const res = await axios.get(`/api/permisos/${id}`, axiosOptions);
                
                if (res.data && res.data.name) {
                    setName(res.data.name);
                }
            } catch (error) {
                console.error("Error fetching permiso:", error);
                toastr.error("No se pudo cargar la información del permiso.", "Error");
            } finally {
                setLoading(false);
            }
        };
        fetchPermiso();
    }, [id]);

    /**
     * Handle form submission for update
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!name.trim()) {
            toastr.warning("El nombre del permiso no puede estar vacío.");
            return;
        }

        try {
            setIsSaving(true);
            await axios.put(`/api/permisos/${id}`, { name: name.trim() }, axiosOptions);
            toastr.success("Permiso actualizado exitosamente.", "Éxito");
            navigate("/permissions");
        } catch (error) {
            console.error("Error updating permiso:", error);
            const errorMsg = error.response?.data?.message || "Error al actualizar el permiso.";
            toastr.error(errorMsg, "Operación Fallida");
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) return (
        <div className="text-center mt-5">
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2">Cargando datos del permiso...</p>
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
                                <i className="fas fa-key me-2"></i>Editar Permiso
                            </h2>
                        </div>
                        <div className="card-body p-4">
                            <form onSubmit={handleSubmit}>
                                <div className="mb-4">
                                    <label className="form-label fw-bold">
                                        Nombre del Permiso <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="form-control"
                                        placeholder="Ej. Crear-usuarios, Ver-pagos, etc."
                                        required
                                    />
                                    <div className="form-text">
                                        Use un formato descriptivo para identificar el permiso.
                                    </div>
                                </div>

                                <div className="d-flex gap-2 pt-3 border-top">
                                    <button
                                        type="submit"
                                        className="btn btn-success px-4 shadow-sm"
                                        disabled={isSaving}
                                    >
                                        <i className="fas fa-save me-2"></i>{isSaving ? "Guardando..." : "Actualizar Permiso"}
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