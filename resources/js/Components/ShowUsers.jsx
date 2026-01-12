import React, { useEffect, useState, useContext } from "react";
import DataTable from "react-data-table-component";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { MessageContext } from "./MessageContext";
import usePermission from "../hooks/usePermission"; 

const endpoint = "/api/usuarios";
const axiosOptions = { withCredentials: true };

/**
 * 🎨 CUSTOM STYLES FOR DATA TABLE
 * This approach prevents "unknown prop" warnings by handling
 * CSS values outside of the column configuration.
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

const ShowUsers = ({ user }) => {
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    
    const [showModal, setShowModal] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [modalMode, setModalMode] = useState(""); 

    const { can } = usePermission(user);
    const canCreate = can('Crear-usuarios');
    const canEdit = can('Editar-usuarios');
    const canDelete = can('Eliminar-usuarios');

    const { setSuccessMessage, setErrorMessage, successMessage, errorMessage } = useContext(MessageContext);
    const navigate = useNavigate();

    /**
     * Fetch users from the API
     */
    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await axios.get(endpoint, axiosOptions);
            const data = res.data.data || res.data;
            setUsers(data);
            setFilteredUsers(data);
        } catch (err) {
            console.error("Error fetching users:", err);
            setErrorMessage("Fallo al cargar los usuarios");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    /**
     * Filter users based on search input
     */
    useEffect(() => {
        const result = users.filter((u) =>
            u.name.toLowerCase().includes(search.toLowerCase()) ||
            u.email.toLowerCase().includes(search.toLowerCase())
        );
        setFilteredUsers(result);
    }, [search, users]);

    const openConfirmModal = (id, mode) => {
        setSelectedUserId(id);
        setModalMode(mode);
        setShowModal(true);
    };

    const handleModalAction = () => {
        if (modalMode === 'delete') executeDelete();
        else if (modalMode === 'restore') executeRestore();
    };

    const executeDelete = async () => {
        try {
            await axios.delete(`${endpoint}/${selectedUserId}`, axiosOptions);
            setShowModal(false);
            fetchUsers(); 
            setSuccessMessage("Usuario dado de baja exitosamente");
        } catch (err) {
            setErrorMessage(err.response?.data?.error || "Error al eliminar");
            setShowModal(false);
        }
    };

    const executeRestore = async () => {
        try {
            await axios.post(`${endpoint}/restore/${selectedUserId}`, {}, axiosOptions);
            setShowModal(false);
            setSuccessMessage("Usuario reactivado exitosamente");
            fetchUsers();
        } catch (err) {
            setErrorMessage("Fallo al reactivar.");
            setShowModal(false);
        }
    };

    /**
     * 🛡️ COLUMNS DEFINITION
     * To avoid warnings, we use 'width' instead of 'minWidth' where possible,
     * and avoid 'grow' or 'button' props which cause issues in newer React versions.
     */
    const columns = [
        { name: "Nombre", selector: (u) => u.name, sortable: true, width: "200px" },
        { name: "Email", selector: (u) => u.email || "-", sortable: true, width: "220px" },
        { name: "Teléfono", selector: (u) => u.phone || "N/A", sortable: true, width: "120px" },
        {
            name: "Roles",
            cell: (u) => (
                <div className="d-flex flex-wrap gap-1">
                    {u.roles?.map((r, idx) => (
                        <span key={idx} className="badge bg-primary">{r.name}</span>
                    ))}
                </div>
            ),
            width: "150px",
        },
        {
            name: "Status",
            selector: (u) => (u.deleted_at ? "Baja" : "Activo"),
            sortable: true,
            cell: (u) => (
                <span className={`badge ${u.deleted_at ? 'bg-danger' : 'bg-success'}`} style={{ minWidth: '60px' }}>
                    {u.deleted_at ? "Baja" : "Activo"}
                </span>
            ),
            width: "100px",
        },
        {
            name: "Permisos",
            cell: (u) => (
                <div className="d-flex flex-wrap gap-1">
                    {u.permissions && u.permissions.length > 0
                        ? u.permissions.map((p, idx) => (
                              <span key={idx} className="badge bg-info text-dark" style={{ fontSize: '0.75em' }}>
                                  {p.name}
                              </span>
                          ))
                        : <small className="text-muted">Ninguno</small>}
                </div>
            ),
            width: "300px", // Fixed width instead of 'grow' to avoid warnings
        },
        {
            name: "Acciones",
            cell: (u) => (
                <div className="d-flex gap-2 justify-content-end w-100 pe-2">
                    {!u.deleted_at ? (
                        <>
                            {canEdit && <button className="btn btn-info btn-sm text-white" onClick={() => navigate(`/users/edit/${u.id}`)}>Editar</button>}
                            {canDelete && <button className="btn btn-danger btn-sm" onClick={() => openConfirmModal(u.id, 'delete')}>Eliminar</button>}
                        </>
                    ) : (
                        canEdit && <button className="btn btn-success btn-sm" onClick={() => openConfirmModal(u.id, 'restore')}>Reactivar</button>
                    )}
                </div>
            ),
            width: "180px",
        },
    ];

    return (
        <div className="mb-4 border border-primary rounded p-3 bg-white">
            <div className="d-flex justify-content-between align-items-center mb-3">
                {canCreate ? (
                    <button className="btn btn-warning btn-sm" onClick={() => navigate("/users/create")}>
                        <i className="fas fa-user-plus"></i> Crear usuario
                    </button>
                ) : <div />}
                <input type="text" placeholder="Buscar por nombre o correo..." className="form-control w-25 form-control-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>

            {successMessage && <div className="alert alert-success text-center py-2">{successMessage}</div>}
            {errorMessage && <div className="alert alert-danger text-center py-2">{errorMessage}</div>}

            <DataTable
                title="Gestión de Usuarios y Residentes"
                columns={columns}
                data={filteredUsers}
                progressPending={loading}
                pagination
                highlightOnHover
                striped
                responsive
                customStyles={customStyles} // Applied custom styles here
                conditionalRowStyles={[{
                    when: row => row.deleted_at,
                    style: { backgroundColor: '#fff5f5', color: '#721c24' },
                }]}
            />

            {/* MODAL */}
            <div className={`modal fade ${showModal ? "show d-block" : "d-none"}`} style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                <div className="modal-dialog">
                    <div className="modal-content">
                        <div className={`modal-header ${modalMode === 'delete' ? 'bg-danger' : 'bg-success'} text-white`}>
                            <h5 className="modal-title">{modalMode === 'delete' ? 'Confirmar Baja' : 'Confirmar Reactivación'}</h5>
                            <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                        </div>
                        <div className="modal-body text-center p-4">
                            <p>{modalMode === 'delete' ? '¿Está seguro de que desea desactivar a este usuario/residente?' : '¿Está seguro de que desea reactivar a este usuario/residente?'}</p>
                        </div>
                        <div className="modal-footer">
                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                            <button className={`btn ${modalMode === 'delete' ? 'btn-danger' : 'btn-success'}`} onClick={handleModalAction}>
                                {modalMode === 'delete' ? 'Confirmar Baja' : 'Confirmar Reactivación'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShowUsers;