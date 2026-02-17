import React, { useEffect, useState, useMemo } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import axios from "axios";
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

  // Modal and deletion states
  const [showModal, setShowModal] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Initialize permission hook
  const { can } = usePermission(user);

  // Permission constants based on user roles/permissions
  const canCreate = user ? can('Crear-roles') : false;
  const canEdit = user ? can('Editar-roles') : false;
  const canDelete = user ? can('Eliminar-roles') : false;

  const navigate = useNavigate();
  const axiosOptions = { withCredentials: true, headers: { Accept: "application/json" } };

  /**
   * Fetch roles list from the backend API
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
      toastr.error("Error al cargar los roles.", "Fallo");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Initial load effect
   */
  useEffect(() => {
    fetchRoles();
  }, []);

  /**
   * Client-side filtering logic for search bar
   */
  useEffect(() => {
    const result = roles.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredRoles(result);
  }, [search, roles]);

  /**
   * Handles the actual deletion after user confirmation in Modal
   */
  const handleDeleteConfirm = async () => {
    if (!roleToDelete) return;

    try {
      await axios.delete(`${endpoint}/${roleToDelete}`, axiosOptions);
      toastr.success("Role eliminado exitosamente.", "Éxito");
      
      // Reset modal states and refresh table
      setShowModal(false);
      setRoleToDelete(null);
      fetchRoles();
    } catch (err) {
      console.error("Delete error:", err);
      const errorMsg = err.response?.data?.message || "Error al eliminar el role.";
      toastr.error(errorMsg, "Operación Fallida");
      setShowModal(false);
    }
  };

  /**
   * DataTable Columns Configuration
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
          {/* Edit Button */}
          {canEdit && (
            <button
              className="btn btn-info btn-sm text-white"
              onClick={() => navigate(`/roles/edit/${r.id}`)}
            >
              Editar
            </button>
          )}
          
          {/* Delete Button - Triggers Confirmation Modal */}
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

  return (
    <div className="mb-4 border border-primary rounded p-3 bg-white">
      {/* Header section: Create button and Search input */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        {canCreate ? (
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

      {/* Main Data Table */}
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

      {/* CONFIRMATION MODAL - Conditional Rendering */}
      {showModal && (
        <div
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            tabIndex="-1"
        >
            <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg">
                <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                    <i className="fas fa-exclamation-triangle me-2"></i>Confirmar Eliminación
                </h5>
                <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setShowModal(false)}
                ></button>
                </div>
                <div className="modal-body text-center p-4">
                <p className="fs-5 mb-1">¿Está seguro de que desea eliminar este role?</p>
                <p className="text-muted small">Esta acción no se puede deshacer y afectará los permisos de los usuarios vinculados.</p>
                </div>
                <div className="modal-footer bg-light justify-content-center">
                <button
                    type="button"
                    className="btn btn-secondary px-4"
                    onClick={() => setShowModal(false)}
                >
                    Cancelar
                </button>
                <button
                    type="button"
                    className="btn btn-danger px-4"
                    onClick={handleDeleteConfirm}
                >
                    Eliminar Permanentemente
                </button>
                </div>
            </div>
            </div>
        </div>
      )}
    </div>
  );
}