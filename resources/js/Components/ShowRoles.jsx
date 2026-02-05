import React, { useEffect, useState, useContext, useMemo } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MessageContext } from "./MessageContext";
import usePermission from "../hooks/usePermission"; 

const endpoint = "/api/roles";

/**
 * 🎨 CUSTOM STYLES FOR DATA TABLE
 */
const customStyles = {
    headCells: {
        style: {
            fontWeight: 'bold',
            fontSize: '14px',
        },
    },
    cells: {
        style: {
            fontSize: '13px',
        },
    },
};

export default function ShowRoles({ user }) {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Initialize permission hook
  const { can } = usePermission(user);

  // Permission constants
  const canCreate = user ? can('Crear-roles') : false;
  const canEdit = user ? can('Editar-roles') : false;
  const canDelete = user ? can('Eliminar-roles') : false;

  const { setSuccessMessage, setErrorMessage, successMessage, errorMessage } =
    useContext(MessageContext);

  const navigate = useNavigate();
  const axiosOptions = { withCredentials: true, headers: { Accept: "application/json" } };

  /**
   * Fetch roles from the API
   */
  const fetchRoles = async () => {
    setLoading(true);
    try {
      const res = await axios.get(endpoint, axiosOptions);
      const data = res.data.data || res.data;
      setRoles(data);
      setFilteredRoles(data);
    } catch (err) {
      console.error("Error fetching roles:", err);
      setErrorMessage("Error al cargar los roles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  /**
   * Filter roles based on search
   */
  useEffect(() => {
    const result = roles.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredRoles(result);
  }, [search, roles]);

  /**
   * Delete a specific role
   */
  const deleteRole = async (id) => {
    try {
      await axios.delete(`${endpoint}/${id}`, axiosOptions);
      setSuccessMessage("Role eliminado exitosamente.");
      fetchRoles();
    } catch (err) {
      console.error(err);
      setErrorMessage("Error al eliminar el role.");
    }
  };

  /**
   * Columns definition with standardized colors and Total Permissions
   */
  const columns = useMemo(() => [
    { 
        name: "Role", 
        selector: (r) => r.name, 
        sortable: true,
        width: "250px" 
    },
    {
        name: "Permisos Totales",
        selector: (r) => r.permissions?.length || 0,
        sortable: true,
        center: true,
        width: "150px",
        cell: (r) => (
            <span className="badge bg-secondary">
                {r.permissions?.length || 0} asignados
            </span>
        )
    },
    {
      name: "Acciones",
      cell: (r) => (
        <div className="d-flex gap-2 justify-content-end w-100 pe-2">
          {/* 🛡️ canEdit - Standard Info Blue */}
          {canEdit && (
            <button
              className="btn btn-info btn-sm text-white"
              onClick={() => navigate(`/roles/edit/${r.id}`)}
            >
              Editar
            </button>
          )}
          
          {/* 🛡️ canDelete - Standard Danger Red */}
          {canDelete && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                setRoleToDelete(r.id);
                setShowModal(true);
              }}
            >
              Eliminar
            </button>
          )}
        </div>
      ),
      width: "200px"
    },
  ], [canEdit, canDelete, navigate]);

  // Auto-clear messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage, setSuccessMessage]);

  return (
    <div className="mb-4 border border-primary rounded p-3 bg-white">
      <div className="d-flex justify-content-between align-items-center mb-3">
        {canCreate ? (
          // 🟢 Standard Success Green
          <button
            className="btn btn-success btn-sm text-white"
            onClick={() => navigate("/roles/create")}
          >
            <i className="fas fa-plus-circle me-1"></i> Nuevo Role
          </button>
        ) : (
          <div /> 
        )}
        
        <input
          type="text"
          placeholder="Buscar por nombre..."
          className="form-control w-25 form-control-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {successMessage && <div className="alert alert-success text-center py-2">{successMessage}</div>}
      {errorMessage && <div className="alert alert-danger text-center py-2">{errorMessage}</div>}

      <DataTable
        title="Gestión de Roles del Sistema"
        columns={columns}
        data={filteredRoles}
        progressPending={loading}
        pagination
        highlightOnHover
        striped
        responsive
        customStyles={customStyles}
      />

      {/* MODAL DE CONFIRMACIÓN */}
      <div
        className={`modal fade ${showModal ? "show d-block" : "d-none"}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
            <div className="modal-header bg-danger text-white">
              <h5 className="modal-title"><i className="fas fa-exclamation-triangle me-2"></i>Confirmar Eliminación</h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={() => setShowModal(false)}
              ></button>
            </div>
            <div className="modal-body text-center p-4">
              <p className="mb-0">¿Está seguro de que desea eliminar este role? Esta acción no se puede deshacer.</p>
            </div>
            <div className="modal-footer bg-light">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => {
                  deleteRole(roleToDelete);
                  setShowModal(false);
                }}
              >
                Eliminar Permanentemente
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}