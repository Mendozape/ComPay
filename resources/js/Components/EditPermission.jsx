import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { MessageContext } from "./MessageContext";

export default function PermisoEdit() {
    const { id } = useParams();
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(true); // 🛡️ Track loading state
    const { setSuccessMessage, setErrorMessage } = useContext(MessageContext);
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
                
                // Safely set the name from the filtered API response
                if (res.data && res.data.name) {
                    setName(res.data.name);
                }
            } catch (error) {
                console.error("Error fetching permiso:", error);
                setErrorMessage("No se pudo cargar la información del permiso.");
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
        
        // 🛡️ Basic frontend validation
        if (!name.trim()) {
            setErrorMessage("El nombre del permiso no puede estar vacío.");
            return;
        }

        try {
            // Explicitly send only the 'name' field to the backend for security
            await axios.put(`/api/permisos/${id}`, { name: name.trim() }, axiosOptions);
            setSuccessMessage("Permiso actualizado exitosamente.");
            navigate("/permissions");
        } catch (error) {
            console.error("Error updating permiso:", error);
            // Show specific backend error message if it exists
            const errorMsg = error.response?.data?.message || "Error al actualizar el permiso.";
            setErrorMessage(errorMsg);
        }
    };

    if (loading) return <div className="text-center mt-5">Cargando datos del permiso...</div>;

    return (
        <div className="row mb-4">
            <div className="col-md-8 offset-md-2">
                <div className="border rounded p-4 bg-white shadow-sm">
                    <h2 className="text-2xl font-bold mb-4 text-center">Editar Permiso</h2>

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <label className="form-label font-semibold">Nombre del Permiso</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="form-control"
                                placeholder="Ingrese el nombre del permiso"
                                required
                            />
                        </div>

                        <div className="d-flex justify-content-between">
                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                onClick={() => navigate("/permissions")}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary text-white"
                            >
                                Actualizar Permiso
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}