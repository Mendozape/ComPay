import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { MessageContext } from "./MessageContext";

export default function EditRole() {
  const { id } = useParams();
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState([]);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectAll, setSelectAll] = useState(false);

  const { setSuccessMessage, setErrorMessage, errorMessage } = useContext(MessageContext);
  const navigate = useNavigate();
  const axiosOptions = { withCredentials: true, headers: { Accept: "application/json" } };

  // Fetch role and permissions on mount
  useEffect(() => {
    const fetchRole = async () => {
      try {
        setLoading(true);
        // Fetch specific role data
        const resRole = await axios.get(`/api/roles/${id}`, axiosOptions);
        setName(resRole.data.name);
        setSelectedPermissions(resRole.data.permissions.map(p => p.id));

        // Fetch all available permissions
        const resPerms = await axios.get("/api/permisos", axiosOptions);
        setPermissions(resPerms.data);
      } catch (err) {
        console.error("Error fetching role:", err);
        setErrorMessage("Fallo al cargar el rol.");
      } finally {
        setLoading(false);
      }
    };
    fetchRole();
  }, [id]);

  // Sync "Select All" state
  useEffect(() => {
    if (permissions.length > 0) {
      setSelectAll(selectedPermissions.length === permissions.length);
    }
  }, [selectedPermissions, permissions]);

  const togglePermission = (id) => {
    setSelectedPermissions(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };
  
  const toggleSelectAll = () => {
      if (selectAll) {
          setSelectedPermissions([]);
      } else {
          setSelectedPermissions(permissions.map((p) => p.id));
      }
      setSelectAll(!selectAll);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
        setErrorMessage("El nombre del rol es obligatorio.");
        return;
    }
    try {
      const res = await axios.put(
        `/api/roles/${id}`,
        { name, permission: selectedPermissions },
        axiosOptions
      );
      setSuccessMessage(res.data.message || "Rol actualizado exitosamente.");
      navigate("/roles");
    } catch (err) {
      console.error("Error updating role:", err);
      setErrorMessage(err.response?.data?.message || "Fallo al actualizar el rol.");
    }
  };

  if (loading) return (
      <div className="text-center mt-5">
          <div className="spinner-border text-success" role="status"></div>
          <p className="mt-2">Cargando datos del rol...</p>
      </div>
  );

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card shadow-sm">
            {/* Header color BG-SUCCESS para uniformidad */}
            <div className="card-header bg-success text-white p-3">
                <h2 className="mb-0 h4">
                    <i className="fas fa-user-tag me-2"></i>Editar Role: {name}
                </h2>
            </div>
            <div className="card-body p-4">
              {errorMessage && <div className="alert alert-danger text-center shadow-sm">{errorMessage}</div>}

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

                {/* Permissions checkboxes */}
                <div className="mb-4">
                  <label className="form-label fw-bold mb-2">Asignar Permisos:</label>

                  {/* Select All Checkbox */}
                  {permissions.length > 0 && (
                    <div className="form-check mb-3 p-3 border rounded bg-light shadow-sm">
                      <input
                        type="checkbox"
                        className="form-check-input ms-0 me-2"
                        id="selectAll"
                        checked={selectAll}
                        onChange={toggleSelectAll}
                      />
                      <label className="form-check-label fw-bold" htmlFor="selectAll">
                        Seleccionar Todos los Permisos ({selectedPermissions.length}/{permissions.length})
                      </label>
                    </div>
                  )}
                  
                  {/* Individual Permissions Grid */}
                  <div className="row bg-white border rounded p-3 mx-0 overflow-auto" style={{maxHeight: '300px'}}>
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
                          />
                          <label className="form-check-label small" htmlFor={`perm-${p.id}`}>
                            {p.name}
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="d-flex gap-2 pt-3 border-top">
                  <button type="submit" className="btn btn-success px-4">
                    <i className="fas fa-save me-2"></i>Guardar Cambios
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