import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

/**
 * EditRole Component
 * Allows editing an existing role's name and its assigned permissions.
 */
export default function EditRole() {
  const { id } = useParams();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectAll, setSelectAll] = useState(false);

  const navigate = useNavigate();
  const axiosOptions = { withCredentials: true, headers: { Accept: "application/json" } };

  /**
   * Fetch role data and all available permissions on mount
   */
  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        setLoading(true);
        // Fetch specific role data by ID
        const resRole = await axios.get(`/api/roles/${id}`, axiosOptions);
        setName(resRole.data.name);
        setSelectedPermissions(resRole.data.permissions.map(p => p.id));

        // Fetch all available permissions catalog
        const resPerms = await axios.get("/api/permisos", axiosOptions);
        setPermissions(resPerms.data);
      } catch (err) {
        console.error("Error fetching role:", err);
        toastr.error("Fallo al cargar los datos del rol.", "Error");
      } finally {
        setLoading(false);
      }
    };
    fetchRoleData();
  }, [id]);

  /**
   * Sync "Select All" checkbox state based on current selection
   */
  useEffect(() => {
    if (permissions.length > 0) {
      setSelectAll(selectedPermissions.length === permissions.length);
    }
  }, [selectedPermissions, permissions]);

  /**
   * Toggle individual permission selection
   */
  const togglePermission = (id) => {
    setSelectedPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
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
   * Handle form submission to update the role
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // --- FRONTEND VALIDATIONS ---
    if (!name.trim()) {
        toastr.warning("El nombre del rol es obligatorio.");
        return;
    }

    if (selectedPermissions.length === 0) {
        toastr.warning("Debe seleccionar al menos un permiso.");
        return;
    }

    try {
      setIsSaving(true);
      const res = await axios.put(
        `/api/roles/${id}`,
        { name: name.trim(), permission: selectedPermissions },
        axiosOptions
      );
      
      toastr.success(res.data.message || "Rol actualizado exitosamente.", "Éxito");
      navigate("/roles");
    } catch (err) {
      console.error("Error updating role:", err);
      let errorMsg = err.response?.data?.message || "Fallo al actualizar el rol.";
      toastr.error(errorMsg, "Operación Fallida");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return (
      <div className="text-center mt-5">
          <div className="spinner-border text-success" role="status"></div>
          <p className="mt-2">Cargando datos del role...</p>
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
                    <i className="fas fa-user-tag me-2"></i>Editar Role: {name}
                </h2>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                {/* Role name input */}
                <div className="mb-4">
                  <label className="form-label fw-bold">Nombre del Role <span className="text-danger">*</span></label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="form-control"
                    placeholder="Ej. Administrador, Residente..."
                    required
                  />
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
                        style={{ cursor: 'pointer' }}
                      />
                      <label className="form-check-label fw-bold" htmlFor="selectAll" style={{ cursor: 'pointer' }}>
                        Seleccionar Todos los Permisos ({selectedPermissions.length}/{permissions.length})
                      </label>
                    </div>
                  )}
                  
                  {/* Individual Permissions Grid */}
                  <div className="row bg-white border rounded p-3 mx-0 overflow-auto shadow-inner" style={{maxHeight: '300px', backgroundColor: '#fdfdfd'}}>
                    {permissions.map(p => (
                      <div key={p.id} className="col-md-6 mb-2">
                        <div className="form-check">
                          <input
                            type="checkbox"
                            className="form-check-input me-2"
                            id={`perm-${p.id}`}
                            value={p.id}
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
                </div>

                {/* Action buttons */}
                <div className="d-flex gap-2 pt-3 border-top">
                  <button type="submit" className="btn btn-success px-4 shadow-sm" disabled={isSaving}>
                    <i className="fas fa-save me-2"></i>{isSaving ? "Guardando..." : "Guardar Cambios"}
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