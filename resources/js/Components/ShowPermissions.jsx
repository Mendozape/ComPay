import React, { useEffect, useState, useMemo } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import usePermission from "../hooks/usePermission"; 

const endpoint = "/api/permisos";

const axiosOptions = {
  withCredentials: true,
  headers: {
    Accept: "application/json",
  },
};

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

export default function PermisosList({ user }) {
  const [permisos, setPermisos] = useState([]);
  const [filteredPermisos, setFilteredPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [permisoToDelete, setPermisoToDelete] = useState(null);

  // Initialize permission hook
  const { can } = usePermission(user);

  // Permission constants
  const canCreate = user ? can('Crear-permisos') : false;
  const canEdit = user ? can('Editar-permisos') : false;
  const canDelete = user ? can('Eliminar-permisos') : false;

  const navigate = useNavigate();

  /**
   * Fetch all permisos from the API
   */
  const fetchPermisos = async () => {
    setLoading(true);
    try {
      const response = await axios.get(endpoint, axiosOptions);
      const data = response.data.data || response.data;
      setPermisos(data);
      setFilteredPermisos(data);
    } catch (error) {
      console.error("Error fetching permisos:", error);
      toastr.error("Error al cargar los permisos.", "Fallo");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermisos();
  }, []);

  /**
   * Real-time filtering based on search input
   */
  useEffect(() => {
    const result = permisos.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase())
    );
    setFilteredPermisos(result);
  }, [search, permisos]);

  /**
   * Logical deletion of the permission
   */
  const deletePermiso = async () => {
    if (!permisoToDelete) return;
    try {
      await axios.delete(`${endpoint}/${permisoToDelete}`, axiosOptions);
      toastr.success("Permiso eliminado exitosamente.", "Éxito");
      fetchPermisos();
      setShowModal(false);
      setPermisoToDelete(null);
    } catch (error) {
      console.error(error);
      toastr.error("Error al eliminar el permiso.", "Fallo");
      setShowModal(false);
      setPermisoToDelete(null);
    }
  };

  const editPermiso = (id) => navigate(`/permissions/edit/${id}`);
  const createPermiso = () => navigate("/permissions/create");

  /**
   * Columns definition with standardized colors
   */
  const columns = useMemo(() => [
    { 
      name: "Nombre del Permiso", 
      selector: (row) => row.name, 
      sortable: true,
      width: "300px" 
    },
    {
      name: "Acciones",
      cell: (row) => (
        <div className="d-flex justify-content-end gap-2 w-100 pe-2">
          {/* Edit - Standard Info Blue */}
          {canEdit && (
            <button
              className="btn btn-info btn-sm text-white"
              onClick={() => editPermiso(row.id)}
            >
              Editar
            </button>
          )}

          {/* Delete - Standard Danger Red */}
          {canDelete && (
            <button
              className="btn btn-danger btn-sm"
              onClick={() => {
                setPermisoToDelete(row.id);
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        {canCreate ? (
          <button
            className="btn btn-success btn-sm text-white"
            onClick={createPermiso}
          >
            <i className="fas fa-plus-circle me-1"></i> Crear Permiso
          </button>
        ) : (
          <div /> 
        )}
        
        <input
          type="text"
          className="form-control form-control-sm w-25"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        title="Gestión de Permisos"
        columns={columns}
        data={filteredPermisos}
        progressPending={loading}
        pagination
        paginationPerPage={10}
        highlightOnHover
        striped
        responsive
        customStyles={customStyles}
      />

      {/* CONFIRMATION MODAL */}
      <div
        className={`modal fade ${showModal ? "show d-block" : "d-none"}`}
        style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content border-0 shadow">
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
              <p className="mb-0">¿Está seguro de que desea eliminar este permiso? Esta acción no se puede deshacer.</p>
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
                onClick={deletePermiso}
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